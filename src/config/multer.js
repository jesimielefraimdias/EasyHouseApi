const multer = require("multer");
const crypto = require("crypto");
const { getUserFromToken } = require("../app/helpers/userToken");

module.exports = {

    fileFilter: function (req, file, cb) {
        console.log("teste1");
        const allowedMimes = [
            "application/pdf"
        ];

        if (!allowedMimes.includes(file.mimetype)) {
            cb(null, false);
        } else {
            console.log(file);
            cb(null, true);
        }
    },

    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            console.log("teste2");
            cb(null, "uploads/temp");
        },
        filename: async function (req, file, cb) {
            try {
                console.log("teste3");

                const user = await getUserFromToken(req);
                const hash = crypto.randomBytes(8);
                const date = Date.now();

                // const fileName = `${user[0].id}_${hash.toString("hex")}_${date}.pdf`;
                const fileName = `user_${hash.toString("hex")}_${date}.pdf`;

                cb(null, fileName);

            } catch (error) {
                cb(error);
            }
        }
    }),

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }

}