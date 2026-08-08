import multer from "multer";
import path from "path";
import fs from "fs";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|webp|mp4|mp3|pdf|ppt|pptx|doc|docx|wav|m4a|mov|avi|key|ogg/;
    const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
    const allowedMime = /image\/|video\/|audio\/|application\/pdf|application\/vnd\.ms-powerpoint|application\/vnd\.openxmlformats|application\/msword|application\/vnd\.apple\.keynote/;
    const mimeOk = allowedMime.test(file.mimetype);
    if (extOk && mimeOk) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

const VIEW_ONCE_WINDOW_MS = 2 * 60 * 1000;

// Centralized authorization for serving uploaded files. View-once media is
// only accessible to the sender, or to a thread participant during a short
// window after they opened it via the open endpoint.
async function checkFileAccess(userId: string, filename: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const viewOnceMsg = await storage.getViewOnceMessageByMediaUrl(`/uploads/${filename}`);
  if (!viewOnceMsg || viewOnceMsg.senderId === userId) {
    return { ok: true };
  }
  const inThread = await storage.isUserInThread(userId, viewOnceMsg.threadId);
  if (!inThread) {
    return { ok: false, status: 403, message: "Not authorized" };
  }
  if (!viewOnceMsg.viewedAt) {
    return { ok: false, status: 403, message: "This photo must be opened from the conversation" };
  }
  const openedMs = Date.now() - new Date(viewOnceMsg.viewedAt).getTime();
  if (openedMs > VIEW_ONCE_WINDOW_MS) {
    return { ok: false, status: 410, message: "This photo is no longer available" };
  }
  return { ok: true };
}

export function setupUploadRoutes(app: Express) {
  app.use(
    "/uploads",
    async (req, res) => {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const filename = path.basename(req.path);
      const filePath = path.join(uploadDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      try {
        const access = await checkFileAccess(userId, filename);
        if (!access.ok) {
          return res.status(access.status).json({ message: access.message });
        }
      } catch {
        return res.status(500).json({ message: "Failed to verify file access" });
      }

      return res.sendFile(filePath);
    },
  );

  app.post("/api/upload/avatar", requireAuth, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });

  app.post("/api/upload/media", requireAuth, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });

  app.post("/api/upload/attachment", requireAuth, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });

  app.get("/api/download/:filename", requireAuth, async (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    try {
      const userId = (req.session as any).userId as string;
      const viewOnceMsg = await storage.getViewOnceMessageByMediaUrl(`/uploads/${filename}`);
      // View-once media is never downloadable, except by its sender.
      if (viewOnceMsg && viewOnceMsg.senderId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
    } catch {
      return res.status(500).json({ message: "Failed to verify file access" });
    }
    return res.download(filePath, filename);
  });
}
