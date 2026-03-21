const multer = require('multer');
const fs = require('fs');
const storage = multer.diskStorage
(
    {
        destination: function (req,file,cb)
        {
            const imagesFolder = req.baseUrl.includes("room")
                ? 'images/room'
                : 'images/hotel';
            if (!fs.existsSync(imagesFolder))
                fs.mkdirSync(imagesFolder, {recursive: true});
            cb(null, imagesFolder);
        },
        filename: function(req,file,cb)
        {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    }
);

const fileFilter = (req,file,cb) =>
{
    if(file.mimetype.startsWith("image"))
        cb(null,true)
    else
        cb(new Error("Only images are allowed"),false)
};
const upload = multer({ storage, fileFilter});

module.exports = upload;