const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { adminMiddleware } = require('../middleware/admin');

const router = Router();
router.use(adminMiddleware);

// Allowed MIME types and extensions
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');
const PRODUCT_UPLOADS_DIR = path.join(UPLOADS_DIR, 'products');

// Storage configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = PRODUCT_UPLOADS_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const safeName = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, safeName);
  }
});

// File filter
function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: JPG, PNG, WebP, GIF'), false);
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_SIZE },
});

// POST /api/admin/upload/image — upload a single product image
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = '/uploads/products/' + req.file.filename;
    res.json({
      id: req.file.filename,
      url: url,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Error handler for multer
router.use(function(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// DELETE /api/admin/upload/image/:filename — delete an uploaded image
router.delete('/image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Validate filename — prevent path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    // Only allow alphanumeric, dash, underscore, and common extensions
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }
    const filePath = path.join(PRODUCT_UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
