const jwt = require("jsonwebtoken");
const knex = require("../../database");
const { key } = require("../../config/jwb.json");
const { getUserFromToken } = require("../helpers/userToken");

module.exports = {

    async userAccessLevel(req, res, next) {
        try {
            const { token } = req.cookies;
            const { id, email } = jwt.verify(token, process.env.KEY);

            const user = await knex("user_information")
                .where({ id })
                .select("removed", "cpf", "access_level", "validated", "folder", "password")
                .first();

            console.log(
                user.removed == true, // 0
                !user.validated,
                user.access_level === "I",
                req.originalUrl !== "/isLoggedUserLevel",
                req.originalUrl !== "/getUser"
            );
            console.log(
                user.removed, // 0
                user.validated,
                user.access_level,
                req.originalUrl,
            );

            if (
                user.removed ||
                !user.validated ||
                user.access_level === "I" &&
                req.originalUrl !== "/isLoggedUserLevel" &&
                req.originalUrl !== "/getUser" &&
                req.originalUrl !== "/updateProfile"
            ) {
                console.log("entrou no catch");
                const error = new Error("Violação11 nas validações");
                error.status = 401;

                throw error;
            }

            res.locals.user = {
                email,
                cpf: user.cpf,
                id,
                accessLevel: user.access_level, folder: user.folder,
                loggedWith: !!user.password ? "api" : "google"
            };

            next();

        } catch (error) {
            next(error);
        }
    },

    async administratorAccessLevel(req, res, next) {

        try {
            const { token } = req.cookies;
            const { id, email } = jwt.verify(token, process.env.KEY);
            console.log(id);
            const user = await knex("user_information")
                .where({ id })
                .select("removed", "cpf", "access_level", "validated", "folder", "password")
                .first();


            if (user.removed || !user.validated || user.access_level !== 'A') {
                const error = new Error("Violação nas validações");
                error.status = 401;

                throw error;
            }

            res.locals.user = { email, id, accessLevel: user.access_level, folder: user.folder }

            next();

        } catch (error) {
            next(error);
        }
    },
}