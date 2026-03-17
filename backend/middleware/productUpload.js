// middleware/productUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define upload path for products
const uploadDir = path.join(__dirname, "..", "uploads", "products");

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Created uploads/products directory");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "images") {
      const allowedImages = /\.(jpeg|jpg|png|webp)$/;
      if (allowedImages.test(ext)) return cb(null, true);
      return cb(new Error("Only .jpg, .jpeg, .png, .webp allowed for images"));
    }

    if (file.fieldname === "file") {
      const allowedBulkFiles = /\.(csv|xlsx|xls)$/;
      if (allowedBulkFiles.test(ext)) return cb(null, true);
      return cb(new Error("Only .csv, .xlsx, .xls allowed for bulk import"));
    }

    return cb(new Error("Unsupported upload field"));
  },
});

module.exports = upload;
