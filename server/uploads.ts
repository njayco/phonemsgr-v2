import multer from "multer";
import path from "path";
import fs from "fs";
import type { Express, Request, Response, NextFunction } from "express";

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

export function setupUploadRoutes(app: Express) {
  app.use(
    "/uploads",
    (req, res, next) => {
      if (!(req.session as any)?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const filePath = path.join(uploadDir, path.basename(req.path));
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      res.status(404).json({ message: "File not found" });
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

  app.get("/api/download/:filename", requireAuth, (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, filename);
    }
    res.status(404).json({ message: "File not found" });
  });
}
