const fs = require('fs');
const path = require('path');
const multer = require('multer');

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function ensureAvatarDir() {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureAvatarDir();
    cb(null, AVATAR_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${req.auth.sub}-${Date.now()}${safeExt}`);
  },
});

const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    const err = new Error('Only JPEG, PNG, WebP, or GIF images are allowed');
    err.status = 400;
    return cb(err);
  },
});

/**
 * Accept common avatar field aliases from different clients, then normalize to `req.file`.
 * Supported keys: picture (preferred), avatar, profilePic, file.
 */
const uploadAvatarFields = uploadAvatar.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'avatar', maxCount: 1 },
  { name: 'profilePic', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

function uploadAvatarSingle(req, res, next) {
  uploadAvatarFields(req, res, (err) => {
    if (err) return next(err);
    const files = req.files || {};
    req.file =
      (files.picture && files.picture[0]) ||
      (files.avatar && files.avatar[0]) ||
      (files.profilePic && files.profilePic[0]) ||
      (files.file && files.file[0]) ||
      null;
    return next();
  });
}

module.exports = {
  uploadAvatarSingle,
  AVATAR_PUBLIC_PREFIX: '/uploads/avatars',
  AVATAR_DIR,
};
