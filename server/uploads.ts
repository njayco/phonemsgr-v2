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

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

// Read an uploaded image and return it as a data URI (used to deliver
// view-once photos inline through the authenticated open endpoint, so no
// reusable file URL is ever exposed to recipients).
export function readUploadAsDataUri(mediaUrl: string): string | null {
  const filename = path.basename(mediaUrl);
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) return null;
  const mime = MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString("base64")}`;
}

// How long a view-once photo remains available after being opened. Once the
// window ends, the underlying file is deleted from disk for good — the
// sender's own access ends at that point too.
export const VIEW_ONCE_WINDOW_MS = 2 * 60 * 1000;

function deleteUploadFileByMediaUrl(mediaUrl: string): void {
  const filename = path.basename(mediaUrl);
  const filePath = path.join(uploadDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[view-once] deleted expired file ${filename}`);
    }
  } catch (err) {
    console.error(`[view-once] failed to delete ${filename}:`, err);
  }
}

// Schedule deletion of a view-once file after its viewing window ends.
// The periodic sweep is the safety net if the server restarts before this
// timer fires.
export function scheduleViewOnceDeletion(mediaUrl: string): void {
  const timer = setTimeout(() => deleteUploadFileByMediaUrl(mediaUrl), VIEW_ONCE_WINDOW_MS);
  timer.unref?.();
}

// Periodic sweep: delete files for view-once messages whose viewing window
// has already ended (covers timers lost to server restarts).
async function sweepExpiredViewOnceFiles(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - VIEW_ONCE_WINDOW_MS);
    const mediaUrls = await storage.getExpiredViewOnceMediaUrls(cutoff);
    for (const mediaUrl of mediaUrls) {
      if (mediaUrl.startsWith("/uploads/")) {
        deleteUploadFileByMediaUrl(mediaUrl);
      }
    }
  } catch (err) {
    console.error("[view-once] sweep failed:", err);
  }
}

export function startViewOnceCleanup(): void {
  sweepExpiredViewOnceFiles();
  const interval = setInterval(sweepExpiredViewOnceFiles, 60 * 1000);
  interval.unref?.();
}

// Centralized authorization for serving uploaded files. View-once media
// files are only ever served to their sender; recipients receive the photo
// exactly once, inline via the open endpoint.
async function checkFileAccess(userId: string, filename: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const viewOnceMsg = await storage.getViewOnceMessageByMediaUrl(`/uploads/${filename}`);
  if (!viewOnceMsg || viewOnceMsg.senderId === userId) {
    return { ok: true };
  }
  return { ok: false, status: 403, message: "This photo can only be opened from the conversation" };
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
    const filename = path.basename(String(req.params.filename));
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
