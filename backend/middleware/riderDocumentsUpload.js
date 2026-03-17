const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sanitizeFilePath } = require("../utils/inputValidator");

const uploadDir = path.join(__dirname, "..", "uploads", "riders", "documents");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Sanitize original filename to prevent path traversal
    const sanitizedName = sanitizeFilePath(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(sanitizedName).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file extensions
    const allowedExtensions = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Allowed MIME types (check actual MIME, not just extension)
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    
    // Check both extension and MIME type
    if (!allowedExtensions.test(ext)) {
      return cb(new Error("Only .jpg, .jpeg, .png, .pdf files are allowed"));
    }
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}. Only images and PDFs allowed.`));
    }
    
    // Check for path traversal in original filename
    if (file.originalname.includes("..") || file.originalname.includes("\0")) {
      return cb(new Error("Invalid filename"));
    }
    
    return cb(null, true);
  },
});

module.exports = upload;
