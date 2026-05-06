const multer = require('multer');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = req.baseUrl.includes('room') ? 'room' : 'hotel';
        const dest = path.join(PROJECT_ROOT, 'images', folder);
        if (!fs.existsSync(dest))
            fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image'))
        cb(null, true);
    else
        cb(new Error('Only images are allowed'), false);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;