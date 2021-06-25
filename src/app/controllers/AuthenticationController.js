const knex = require("../../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const mailer = require("../../services/mailer");
const { environment } = require("../../config/environment");
const { emailIsValid, passwordIsValid, emailInUse } = require("../helpers/userValidation");
const { getUserFromTokenIdGoogle } = require("../helpers/userToken");
const fs = require("fs");
const { google } = require("googleapis");
const credentials = require("../../config/googleCredentials.json");
const scopes = [
    'https://www.googleapis.com/auth/drive'
];
const auth = new google.auth.JWT(
    credentials.client_email, null,
    credentials.private_key, scopes
);
const drive = google.drive({ version: "v3", auth });


//CTR + K + 2
module.exports = {

    async login(req, res, next) {

        try {
            //Login pela plataforma ou pela google.
            let {
                email = null, password = null,
                tokenId = null
            } = req.body;
            let resGoogle = null, name = null, id = null;

            //Se não for login pelo google.
            if (!!!tokenId && (!emailIsValid(email) || !passwordIsValid(password))) {

                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }

            //Verifica se o token existe e se os dados são validos.
            if (!!tokenId && !!!(resGoogle = await getUserFromTokenIdGoogle(tokenId))) {
                const errorMsg = {
                    errorLogin: "Login com google inválido"
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;

                throw error;
            }
            else if (!!tokenId && !!resGoogle) {
                //Recebe o email e o nome.
                email = resGoogle.email;
                name = resGoogle.name;
            }

            //Procuramos um usuário com o email.
            const user = await knex("user_information")
                .where({ email })
                .select("id", "name", "cpf", "email", "password",
                    "removed", "access_level", "validated")
                .first();

            //Se for login com o google e não existir nenhum usuário com o email.
            if (!!tokenId && !!!user) {
                //Inserimos o novo usuário e pegamos o seu id.
                [id] = await knex("user_information")
                    .returning("id")
                    .insert({
                        name,
                        email,
                        cpf: null,
                        access_level: "I",
                        password: null,
                        validated: true
                    });

                const resFolders = await drive.files.list({
                    q: "mimeType = 'application/vnd.google-apps.folder' and name = 'easyhouse'"
                });

                const foldersIds = resFolders.data.files.map(element => element.id);

                const resFolder = await drive.files.create({
                    resource: {
                        name: `${id}_${name}`,
                        parents: foldersIds,
                        mimeType: "application/vnd.google-apps.folder"
                    },
                    fields: 'id',
                });

                await knex('user_information')
                    .where({ id })
                    .update({ folder: resFolder.data.id });

                //Se o usuário não existir e não for login com o google.
            } else if (!!!user) {
                const errorMsg = {
                    errorLogin: "Verifique os dados e tente novamente."
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;

                throw error;
                //Ou se o usuário for removido ou não validado.
            } else if (user.removed || !user.validated) {

                const errorMsg = {
                    errorLogin: "Você não tem acesso!"
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;

                throw error;
                //Se o token existir e o usuário não --> Login com google falso.
                //Ou se o token não existir e a senha não for válida --> Login normal.
            } else if (!!tokenId && !!!user || !!!tokenId && !bcrypt.compareSync(password, user.password)) {
                const errorMsg = {
                    errorLogin: "Verifique os dados e tente novamente!"
                };

                const error = new Error(JSON.stringify(errorMsg));
                error.status = 401;
                throw error;

            }
            
            //Criamos o token.
            const token = jwt.sign({
                id: !!user ? user.id : id,
                email: !!user ? user.email : email,
            }
                ,process.env.KEY, {
                expiresIn: "1h"
            });

            //Retornamos o mesmo.
            return res.cookie("token", token, {
                secure: false, //Falso para http true para https
                httpOnly: true
            }).json(
                {
                    email,
                    cpf: !!user ? user.cpf : null,
                    loggedWith: !!tokenId ? "google" : "api",
                    // Se o usuário existir pegamos seu nível de acesso,
                    // caso seja o primeiro acesso pelo google, é (I)ncompleto.
                    accessLevel: !!user ? user.access_level : "I"
                }
            );

        } catch (error) {
            // res.status(error.status).json(error.message);
            next(error);
        }
    },

    logout(req, res, next) {
        try {
            console.log("entrou");
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
                .select("id", "email", "name", "password");

            console.log(user[0])
            if (user.length === 0) {
                throw new Error("Email não existe");
            } else if (user[0].password === null) {
                throw new Error("Você está logado com google");
            }

            const code = crypto.randomBytes(2).toString("hex");

            const token = jwt.sign({ id: user[0].id, code }
                , process.env.FORGOTKEY, {
                expiresIn: "10m"
            });

            await knex('user_information')
                .where({ id: user[0].id })
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
            });

            res.status(200).send();

        } catch (error) {
            next(error);
        }
    },

    async resetPassword(req, res, next) {

        try {

            const { token } = req.params;
            let id, code = null, error_token = false;

            jwt.verify(token, process.env.FORGOTKEY,
                function (error, decode) {
                    if (error) {
                        error_token = true;
                    } else {
                        id = decode.id;
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
                .where({ id })
                .select("email", "name", "code", "password");

            if (error_token || user[0].code != code || user[0].password === null) {

                return res.status(200).sendFile("invalidCodePasswordView.html", options,
                    function (err) {
                        if (err) {
                            throw new Error(err.toString());
                        }
                    }
                );
            }

            await knex('user_information')
                .where({ id })
                .update({ code: null });


            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(newPassword, salt, async function (err, hash) {

                    if (err) {
                        const error = new Error(JSON.stringify(err));
                        error.status = 400;

                        throw error;
                        return;
                    }

                    await knex("user_information").where({ id })
                        .update({ password: hash })

                    const user = await knex("user_information").where({ id })
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
            let id = null, email = null, errorToken = false;

            jwt.verify(token, process.env.EMAILKEY,
                function (error, decode) {
                    if (error) {
                        errorToken = true;
                    }

                    id = decode.id;
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

            console.log(id, email);
            const user = await knex("user_information")
                .where({ id }).first();

            if (user.email !== email) {

                const resultEmail = await knex("user_information")
                    .where({ email, validated: true }).first();

                if (errorToken || !!resultEmail) {

                    return res.status(200).sendFile("invalidCodeEmailView.html", options,
                        function (error) {
                            if (error) {
                                throw new Error(err.toString());
                            }
                        }
                    );
                }

                //Removendo os demais usuários que tem o mesmo email, porém não estão ativados.
                await knex("user_information")
                    .where({ email })
                    .where("id", "!=", id)
                    .del();

                await knex('user_information')
                    .where({ id })
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

    //Ativar a conta
    async activateAccount(req, res, next) {

        try {
            //Recebendo dados.
            const { token } = req.params;

            let id = null, email = null, errorToken = false;
            let deleteAccount = false, welcomeView = false, validated = false,
                invalidCodeAccountView = false;

            //Decodificando o token e pegamos os dados.
            jwt.verify(token, process.env.EMAILKEY,
                function (error, decode) {
                    if (error) {
                        errorToken = true;
                    }
                    id = decode.id;
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

            //Usuário com id em questão.
            const user = await knex("user_information")
                .where({ id })
                .select("id", "name", "email", "validated")
                .first();

            /*Verificamos se o token é inválido e avisando para o usuário realizar
            o cadastro novamente! */
            if (errorToken) {

                invalidCodeAccountView = true;
                deleteAccount = true;

                //Caso o usuário fique clicando no link igual retardado.
            } else if (!!user && user.validated) {
                welcomeView = true;
                //Validamos
            } else if (!errorToken && !!user) {
                validated = true;
                welcomeView = true;
            } else {

                const error = new Error("Nice try!");
                error.status = 400;

                throw error;
            }

            if (deleteAccount) {
                //Removendo conta que tem código expirado!
                await knex("user_information")
                    .where({ id })
                    .del();
            }

            if (invalidCodeAccountView) {

                return res.status(200).sendFile("invalidCodeAccountView.html", options,
                    function (error) {
                        if (error) {
                            throw new Error(error.toString());
                        }
                    }
                );
            }

            if (validated) {

                const resFolders = await drive.files.list({
                    q: "mimeType = 'application/vnd.google-apps.folder' and name = 'easyhouse'"
                });

                const foldersIds = resFolders.data.files.map(element => element.id);

                const resFolder = await drive.files.create({
                    resource: {
                        name: `${user.id}_${user.name}`,
                        parents: foldersIds,
                        mimeType: "application/vnd.google-apps.folder"
                    },
                    fields: 'id',
                });

                await knex('user_information')
                    .where({ id: user.id })
                    .update({ validated: true, folder: resFolder.data.id });


                //Removendo os demais usuários que tem o mesmo email, porém não estão ativados.
                await knex("user_information")
                    .where({ email })
                    .where("id", "!=", user.id)
                    .del();
            }

            if (welcomeView) {
                return res.status(200).sendFile("welcomeView.html", options,
                    function (error) {
                        if (error) {
                            throw new Error(error.toString());
                        }
                    }
                )
            }

        } catch (error) {
            next(error);
        }
    }
}