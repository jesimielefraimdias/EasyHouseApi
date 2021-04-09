const jwt = require("jsonwebtoken");
const knex = require("../../database");
const { key } = require("../../config/jwb.json");
const { getUserFromToken } = require("../helpers/userToken");

module.exports = {

    async userAccessLevel(req, res, next) {

        try {

            const user = await getUserFromToken(req);

            if (user.length === 0 || user[0].removed || !user[0].validated_email) {
                const error = new Error("Violação nas validações");
                error.status = 401;

                throw error;
            }

            next();
            // console.log("TUDO CERTO");
        } catch (error) {
            // console.log(error);
            next(error);
        }
    },

    async operatorAccessLevel(req, res, next) {

        try {
            const { token } = req.cookies;
            const { email } = jwt.verify(token, key);

            const user = await knex("user_information")
                .where({ email })
                .select("removed", "access_level", "validated", "validated_email");

            if (user[0].removed || !user[0].validated || !user[0].validated_email ||
                user[0].access_level !== "O" && user[0].access_level !== "A") {
                const error = new Error("Violação nas validações");
                error.status = 401;

                throw error;
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    },

    async administratorAccessLevel(req, res, next) {

        try {
            const { token } = req.cookies;

            const { email } = jwt.verify(token, key);

            const user = await knex("user_information")
                .where({ email })
                .select("removed", "access_level", "validated", "validated_email");

            if (user[0].removed || !user[0].validated || !user[0].validated_email
                || user[0].access_level !== "A") {
                const error = new Error("Violação nas validações");
                error.status = 401;

                throw error;
                return;
            }

            next();

        } catch (error) {
            next(error);
        }
    },

    async accessLevel(req, res, next) {

        try {
            const { token } = req.cookies;

            const { email } = jwt.verify(token, key);

            const user = await knex("user_information")
                .where({ email })
                .select("removed", "access_level", "validated", "validated_email");

            if (user[0].removed || !user[0].validated_email) {
                const error = new Error("Violação nas validações");
                error.status = 401;

                throw error;
                return;
            }

            res.locals.accessLevel = user[0].access_level;

            next();

        } catch (error) {
            next(error);
        }
    }
}