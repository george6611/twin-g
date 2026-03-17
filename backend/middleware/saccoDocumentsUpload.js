const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sanitizeFilePath } = require("../utils/inputValidator");

const uploadDir = path.join(__dirname, "..", "uploads", "saccos", "documents");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize original filename to prevent path traversal
    const sanitizedName = sanitizeFilePath(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(sanitizedName).toLowerCase();
    cb(null, `sacco-doc-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
  
  // Allowed extensions
  const allowedExtensions = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check for path traversal in original filename
  if (file.originalname.includes("..") || file.originalname.includes("\0")) {
    return cb(new Error("Invalid filename"));
  }
  
  // Check both MIME type and extension
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG and PNG images are allowed.`), false);
  }
  
  if (!allowedExtensions.test(ext)) {
    return cb(new Error("Invalid file extension. Only .jpg, .jpeg, .png are allowed."), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
    files: 6, // Max 6 files per request (1 registration + 5 additional)
  },
});

// For uploading registration document (single image)
const uploadRegistrationDoc = upload.single("registrationDocument");

// For uploading multiple additional documents
const uploadAdditionalDocs = upload.array("additionalDocuments", 5); // max 5 images

module.exports = {
  uploadRegistrationDoc,
  uploadAdditionalDocs,
};
