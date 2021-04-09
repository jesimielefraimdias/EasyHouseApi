const knex = require("../../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const mailer = require("../../services/mailer");
const { key, emailKey, forgotKey } = require("../../config/jwb.json");
const { environment } = require("../../config/environment");
const { emailIsValid, passwordIsValid, emailInUse } = require("../helpers/userValidation");
const { getUserFromTokenIdGoogle } = require("../helpers/userToken");


//CTR + K + 2
module.exports = {

    async loginDashboard(req, res, next) {

        try {
            const { email = null, password = null, tokenId = null } = req.body;

            const res = await getUserFromTokenIdGoogle(tokenId);
            console.log(res);
            return;

            if (!emailIsValid(email) || !passwordIsValid(password)) {
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
                return;
            }

            const user = await knex("user_information").where({ email })
                .select("user_id", "name", "cpf", "email", "password",
                    "removed", "access_level", "validated", "validated_email");

            if (user.length === 0) {

                const errorMsg = {
                    errorLogin: "Verifique os dados e tente novamente."
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;

                throw error;
                return;

            } else if (user[0].removed || !user[0].validated_email) {

                const errorMsg = {
                    errorLogin: "Você não tem acesso!"
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;

                throw error;
                return;

            } else if (!bcrypt.compareSync(password, user[0].password)) {
                const errorMsg = {
                    errorLogin: "Verifique os dados e tente novamente!"
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;
                throw error;
                return;

            }

            const token = jwt.sign({ user_id: user[0].user_id, email: user[0].email }
                , key, {
                expiresIn: "1h"
            });

            res.cookie("token", token, {
                // maxAge: new Date(Date.now() + 90000000),
                secure: false, //Falso para http true para https
                httpOnly: true
            });

            return res.end();
        } catch (error) {
            // res.status(error.status).json(error.message);
            next(error);
        }
    },

    logout(req, res, next) {
        try {
            res.clearCookie("token");

            return res.status(200).end();
        } catch (error) {
            next(error.message);
        }
    },

    async forgotPassword(req, res, next) {

        try {
            const { email } = req.body;

            const user = await knex("user_information").where({ email })
                .select("user_id", "email", "name");

            if (user.length == 0) {
                throw new Error("Email não existe");
                return;
            }

            const code = crypto.randomBytes(2).toString("hex");

            const token = jwt.sign({ user_id: user[0].user_id, code }
                , forgotKey, {
                expiresIn: "10m"
            });

            await knex('user_information')
                .where({ user_id: user[0].user_id })
                .update({ code });

            mailer.sendMail({
                from: environment.email.auth.user, // sender address
                to: user[0].email, // list of receivers
                subject: "Esqueci minha senha", // Subject line
                template: "forgotPassword", // Subject line
                context: {
                    name: user[0].name,
                    link: `${environment.ipAdress}/resetPassword/${token}`
                }
            }, errorMessage => {
                const error = new Error(errorMessage);
                error.status = 400;

                throw error;
                return;
            });

            res.status(200).send();

        } catch (error) {
            next(error);
        }
    },

    async resetPassword(req, res, next) {

        try {

            const { token } = req.params;
            let user_id, code = null, error_token = false;

            jwt.verify(token, forgotKey,
                function (error, decode) {
                    if (error) {
                        error_token = true;
                    } else {
                        user_id = decode.user_id;
                        code = decode.code;
                    }
                }
            );

            const options = {
                root: path.join(__dirname, '../views'),
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true
                }
            }

            const newPassword = crypto.randomBytes(4).toString("hex");

            const user = await knex("user_information")
                .where({ user_id })
                .select("email", "name", "code");

            if (error_token || user[0].code != code) {

                return res.status(200).sendFile("invalidCodePasswordView.html", options,
                    function (err) {
                        if (err) {
                            throw new Error(err.toString());
                            return;
                        }
                    }
                );
            }

            await knex('user_information')
                .where({ user_id })
                .update({ code: null });


            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(newPassword, salt, async function (err, hash) {

                    if (err) {
                        const error = new Error(JSON.stringify(err));
                        error.status = 400;

                        throw error;
                        return;
                    }

                    await knex("user_information").where({ user_id })
                        .update({ password: hash })

                    const user = await knex("user_information").where({ user_id })
                        .select("email", "name");


                    mailer.sendMail({
                        from: environment.email.auth.user, // sender address
                        to: user[0].email, // list of receivers
                        subject: "Sua nova senha", // Subject line
                        template: "newPassword", // Subject line
                        context: {
                            name: user[0].name,
                            newPassword
                        }
                    }, errMessage => {
                        const error = new Error(errMessage);
                        error.status = 400
                        throw error;
                        return;
                    });
                })
            });

            return res.status(200).sendFile("resetPasswordView.html", options,
                function (err) {
                    if (err) {
                        const error = new Error(err.toString());
                        throw error;
                        return;
                    }
                }
            );

        } catch (error) {
            next(error);
        }
    },

    async changeEmail(req, res, next) {

        try {

            const { token } = req.params;
            let user_id = null, email = null, errorToken = false;

            jwt.verify(token, emailKey,
                function (error, decode) {
                    if (error) {
                        errorToken = true;
                    }

                    user_id = decode.user_id;
                    email = decode.email;
                }
            );

            const options = {
                root: path.join(__dirname, '../views'),
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true
                }
            }

            const user = await knex("user_information")
                .where({ user_id });

            if (user[0].email !== email) {

                const resultEmail = await knex("user_information")
                    .where({ email })
                    .select("validated_email", "validated");

                const inUse = emailInUse(resultEmail);

                if (errorToken || inUse) {

                    return res.status(200).sendFile("invalidCodeEmailView.html", options,
                        function (error) {
                            if (error) {
                                throw new Error(err.toString());
                                return;
                            }
                        }
                    );
                }

                //Removendo os demais usuários que tem o mesmo email, porém não estão ativados.
                await knex("user_information")
                    .where({ email })
                    .where("user_id", "!=", user_id)
                    .del();

                await knex('user_information')
                    .where({ user_id })
                    .update({ email, code: null });
            }

            return res.status(200).sendFile("changeEmailView.html", options,
                function (err) {
                    if (err) {
                        const error = new Error(err.toString());
                        throw error;
                        return;
                    }
                }
            );

        } catch (error) {
            next(error);
        }
    },

    async activateAccount(req, res, next) {

        //Recebendo dados.
        const { token } = req.params;

        let email = null, errorToken = false;
        let deleteAccount = false, welcomeView = false,
            invalidCodeAccountView = false, validated_email = false;

        //Decodificando o token e pegando os dados.
        jwt.verify(token, emailKey,
            function (error, decode) {
                if (error) {
                    errorToken = true;
                }
                email = decode.email;
            }
        );

        try {
            const options = {
                root: path.join(__dirname, '../views'),
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true
                }
            }

            //Usuário com id em questão.
            const user = await knex("user_information")
                .where({ email })
                .select("user_id", "email", "validated_email");

            //Todos os usuários com este email.
            const resultEmail = await knex("user_information")
                .where({ email })
                .select("validated_email");

            const inUse = emailInUse(resultEmail);

            /*Verificamos se o token é inválido e avisando para o usuário realizar
            o cadastro novamente! */
            if (errorToken && user[0].email === email &&
                !user[0].validated_email && !inUse) {

                invalidCodeAccountView = true;
                deleteAccount = true;

                //Caso o usuário fique clicando no link igual retardado.
            } else if (user[0].email === email && user[0].validated_email) {
                welcomeView = true;

                //Possíveis tentativas de violação!
            } else if (errorToken || user[0].email !== email || user[0].validated_email || inUse) {

                const error = new Error("Nice try!");
                error.status = 400;

                throw error;
                return;

            } else if (!errorToken && user[0].email === email && !user[0].validated_email && !inUse) {
                validated_email = true;
                welcomeView = true;
            }

            if (deleteAccount) {
                //Removendo conta que tem código expirado!
                await knex("user_information")
                    .where({ user_id: user[0].user_id })
                    .del();
            }

            if (invalidCodeAccountView) {
                return res.status(200).sendFile("invalidCodeAccountView.html", options,
                    function (error) {
                        if (error) {
                            throw new Error(error.toString());
                            return;
                        }
                    }
                );
            }

            if (validated_email) {
                await knex('user_information')
                    .where({ user_id: user[0].user_id })
                    .update({ validated_email: true });

                //Removendo os demais usuários que tem o mesmo email, porém não estão ativados.
                await knex("user_information")
                    .where({ email: email })
                    .where("user_id", "!=", user[0].user_id)
                    .del();
            }

            if (welcomeView) {
                return res.status(200).sendFile("welcomeView.html", options,
                    function (error) {
                        if (error) {
                            throw new Error(error.toString());
                            return;
                        }
                    }
                )
            }

        } catch (error) {
            next(error);
        }
    }
}