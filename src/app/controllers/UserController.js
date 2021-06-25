const knex = require("../../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailer = require("../../services/mailer");
const { environment } = require("../../config/environment");
const { key, emailKey } = require("../../config/jwb.json");

const { getUserFromToken } = require("../helpers/userToken");

const {
    nameIsValid,
    cpfIsValid,
    emailIsValid,
    passwordIsValid,
    cpfInUse,
    emailInUse
} = require("../helpers/userValidation");

//CTR + K + 2
module.exports = {

    async create(req, res, next) {

        try {
            const { name, email, cpf = null, password = null } = req.body;

            //Verificando se os dados são validos.
            if (!nameIsValid(name) || !emailIsValid(email) ||
                !cpfIsValid(cpf) || !passwordIsValid(password)) {

                console.log(name, email, cpf, password);
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;

            }

            const users = await knex("user_information")
                .where({ email, validated: true })
                .orWhere({ cpf }).first();

            if (!!users) {
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }

            //Criando hash.
            bcrypt.genSalt(10, async function (err, salt) {
                bcrypt.hash(password, salt, async function (err, hash) {

                    if (err) {

                        const error = new Error(JSON.stringify(
                            {
                                errorPassword: "Senha inválida"
                            }
                        ));
                        error.status = 200;

                        throw error;
                    }

                    await knex("user_information")
                        .where({ email }).orWhere({ cpf })
                        .del();

                    const [id] = await knex("user_information")
                        .returning("id")
                        .insert({
                            name,
                            email,
                            cpf,
                            password: hash
                        });

                    const token = jwt.sign({ id, email }
                        , emailKey, {
                        expiresIn: "30m"
                    });

                    // console.log(environment.email);

                    mailer.sendMail({
                        from: environment.email.auth.user, // sender address
                        to: email, // list of receivers
                        subject: "Ativar conta", // Subject line
                        template: "validateAccount", // Subject line
                        context: {
                            time: "30 minutos",
                            name,
                            link: `${environment.ipAdress}/activateAccount/${token}`
                        }
                    }, errorMessage => {
                        const error = new Error(errorMessage);
                        error.status = 400;

                        throw error;
                    });

                    return res.status(201).send();

                });
            });

        } catch (error) {

            if (error.status == 200) {
                res.status(error.status).send(error.message);
            }
            else {
                next(error);
            }
        }
    },
    async emailExists(req, res, next) {
        try {

            const { email } = req.body;

            if (!emailIsValid(email)) {
                console.log(!emailIsValid(email));
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }

            const users = await knex("user_information")
                .where({ email, validated: true })
                .first();

            if (!!users) {
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }

            return res.end();
        } catch (error) {
            next(error);
        }
    },
    async cpfExists(req, res, next) {
        try {
            const { cpf } = req.body;

            if (!cpfIsValid(cpf)) {
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }

            const users = await knex("user_information")
                .where({ cpf, validated: true })
                .first();

            if (!!users) {
                console.log("teste");
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }

            return res.end();
        } catch (error) {
            next(error);
        }
    },
    async update(req, res, next) {

        try {

            //Recebendo o token e verificando se pertence ao app ou dashboard.
            //Pegando os dados do usuário.
            const user = await getUserFromToken(req);
            const id = user[0].id;
            const changeUser = req.body;
            let newToken = false;
            console.log(user);
            let errorMsg = {
                error: false,
                errorEmail: "",
                errorCpf: "",
                errorPassword: "",
            };


            const changePassword = changeUser.password !== undefined &&
                //Verificando se devemos mudar ou não a senha.
                !!changeUser.password ? true : false;

            const changeEmail = changeUser.email !== user[0].email && res.locals.user.loggedWith === "api" ? true : false;

            //Validando dados a serem alterados.
            if (!nameIsValid(changeUser.name) ||
                !emailIsValid(changeUser.email) ||
                !cpfIsValid(changeUser.cpf) ||
                changePassword && !passwordIsValid(changeUser.newPassword)) {


                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }


            if (changePassword && !bcrypt.compareSync(changeUser.password, user[0].password)) {
                errorMsg.errorPassword = "Senha atual inválida!";
                errorMsg.error = true;
            }

            if (changeEmail) {
                //Verificando se o email a ser alterado existe.
                const resultEmail = await knex("user_information")
                    .where({ email: changeUser.email, validated: true }).andWhere("id", "<>", id)
                    .select("id").first();
                console.log("já cadastrado", resultEmail);
                //Verificando se o email pertence a outro usuário.
                if (!!resultEmail) {
                    errorMsg.errorEmail = "Email já cadastrado!";
                    errorMsg.error = true;
                }
            }


            const resultCpf = await knex("user_information")
                .where({ cpf: changeUser.cpf, validated: true }).andWhere("id", "<>", id)
                .select("id")
                .first();


            if (!!resultCpf) {
                errorMsg.errorCpf = "Cpf já foi validado por outro usuário!";
                errorMsg.error = true;
            }

            if (!errorMsg.error) {

                await knex('user_information')
                    .where({ id })
                    .update({
                        name: changeUser.name,
                        cpf: changeUser.cpf,
                        access_level: "U",
                    });

                if (user[0].cpf.length === null && !!changeUser.cpf) {
                    newToken = true;
                }
            }

            if (changePassword && !errorMsg.error) {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(changeUser.newPassword, salt, async function (err, hash) {

                        if (err) {
                            const error = new Error("Violação nas validações");
                            error.status = 400;

                            throw error;
                        }

                        await knex('user_information')
                            .where({ id })
                            .update({
                                password: hash,
                            });

                    });
                });
            }

            if (changeEmail && !errorMsg.error) {

                const token = jwt.sign({ id, email: changeUser.email }
                    , emailKey, {
                    expiresIn: "30m"
                });

                mailer.sendMail({
                    from: environment.email.auth.user, // sender address
                    to: changeUser.email, // list of receivers
                    subject: "Trocar email", // Subject line
                    template: "changeEmail", // Subject line
                    context: {
                        name: changeUser.name,
                        link: `${environment.ipAdress}/changeEmail/${token}`
                    }
                }, errorMessage => {
                    const error = new Error(errorMessage);
                    error.status = 400;

                    throw error;

                });
            }

            if (!errorMsg.error && newToken === false) {
                res.status(204).json({
                    name: changeUser.name,
                    cpf: changeUser.cpf
                });
            } else if (!errorMsg.error && newToken === true) {

                //Criamos o token.
                const token = jwt.sign({
                    id: !!user[0].id,
                    email: !!user[0].email,
                }, key, {
                    expiresIn: "1h"
                });

                //Retornamos o mesmo.
                return res.cookie("token", token, {
                    secure: false, //Falso para http true para https
                    httpOnly: true
                })
                    .status(204)
                    .json({
                        name: changeUser.name,
                        cpf: changeUser.cpf
                    });

            } else {
                const error = new Error(JSON.stringify(errorMsg));
                error.status = 200;

                throw error;
            }

        } catch (error) {
            if (error.status === 200) {
                res.status(error.status).send(error.message);
            } else {
                next(error);
            }
        }
    },

    async getUser(req, res, next) {

        try {

            const user = await getUserFromToken(req);

            res.status(200).json({
                name: user[0].name,
                email: user[0].email,
                cpf: user[0].cpf,
                validated: user[0].validated,
                accessLevel: user[0].access_level,
                loggedWith: !!user[0].password ? "google" : "api"
            });

        } catch (error) {
            next(error);
        }
    },

    async resendEmail(req, res, next) {

        try {
            const { email } = req.body;

            const user = await knex("user_information")
                .where({ email })
                .select("name", "email", "validated", "access_level").first();

            const token = jwt.sign({ email }
                , emailKey, {
                expiresIn: user.access_level === "U" ? "30m" : "6h"
            });

            if (user.validated) {

                const error = new Error(JSON.stringify({
                    error: true,
                    errorMsg: "Conta já validada, se perdeu acesso, clique em esqueci minha senha!"
                }));

                error.status = 400;

                throw error;
            }

            mailer.sendMail({
                from: environment.email.auth.user, // sender address
                to: user.email, // list of receivers
                subject: "Ativar conta", // Subject line
                template: "validateAccount", // Subject line
                context: {
                    time: user.access_level === "U" ? "30 minutos" : "6 horas",
                    name: user.name,
                    link: `${environment.ipAdress}/activateAccount/${token}`
                }
            }, errorMessage => {
                const error = new Error(errorMessage);
                error.status = 400;

                throw error;
            });

            res.status(200).end();

        } catch (error) {
            next(error);
        }

    },

    isLogged(req, res, next) {
        res.status(200).json({
            email: res.locals.user.email,
            cpf: res.locals.user.cpf,
            accessLevel: res.locals.user.accessLevel,
            loggedWith: res.locals.user.loggedWith
        });
    }
}