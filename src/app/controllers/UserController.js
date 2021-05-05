const knex = require("../../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailer = require("../../services/mailer");
const { environment } = require("../../config/environment");
const { key, emailKey } = require("../../config/jwb.json");

const { getUserFromToken } = require("../helpers/userToken");
const { titleIsValid, evaluationIsValid } = require("../helpers/evaluationValidation");

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

            const resultEmail = await knex("user_information").where({ email });
            const resultCpf = await knex("user_information").where({ cpf });

            let errorMsg = { error: false, errorEmail: "", errorCpf: "" };

            //Verificando se email ou cpf já estão em uso definitivo.
            if (emailInUse(resultEmail)) {
                // console.log("entrou?");
                errorMsg.errorEmail = "Email já cadastrado!";
                errorMsg.error = true;
            }

            if (cpfInUse(resultCpf)) {
                errorMsg.errorCpf = "Cpf já cadastrado!";
                errorMsg.error = true;
            }

            if (errorMsg.error) {
                const error = new Error(JSON.stringify(errorMsg));
                error.status = 200;

                throw error;
                return;
            }

            //Criando hash.
            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(password, salt, async function (err, hash) {

                    if (err) {

                        const error = new Error(JSON.stringify(
                            {
                                errorPassword: "Senha inválida"
                            }
                        ));
                        error.status = 200;

                        throw error;
                        return;
                    }

                    await knex("user_information")
                        .where({ email })
                        .del();

                    await knex("user_information").insert({
                        name,
                        email,
                        cpf,
                        password: hash
                    });
                });
            });

            const token = jwt.sign({ email }
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
                return;
            });

            return res.status(201).send();

        } catch (error) {

            if (error.status == 200) {
                res.status(error.status).send(error.message);
            }
            else {
                next(error);
            }
        }
    },

    async update(req, res, next) {

        try {

            //Recebendo o token e verificando se pertence ao app ou dashboard.
            //Pegando os dados do usuário.
            const user = await getUserFromToken(req);
            const user_id = user[0].user_id;
            const changeUser = req.body;

            let errorMsg = {
                error: false,
                errorEmail: "",
                errorCpf: "",
                errorPassword: "",
            };


            const changePassword = changeUser.password !== undefined &&
                //Verificando se devemos mudar ou não a senha.
                !!changeUser.password ? true : false;

            const changeEmail = changeUser.email !== user[0].email ? true : false;

            //Validando dados a serem alterados.
            if (!nameIsValid(changeUser.name) ||
                !emailIsValid(changeUser.email) ||
                !cpfIsValid(changeUser.cpf) ||
                changePassword && !passwordIsValid(changeUser.newPassword)) {


                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
                return;
            }


            if (changePassword && !bcrypt.compareSync(changeUser.password, user[0].password)) {
                errorMsg.errorPassword = "Senha atual inválida!";
                errorMsg.error = true;
            }

            if (changeEmail) {


                //Verificando se o email a ser alterado existe.
                const resultEmail = await knex("user_information")
                    .where({ email: changeUser.email })
                    .select("user_id");

                //Verificando se o email pertence a outro usuário.
                if (emailInUse(resultEmail)) {
                    errorMsg.errorEmail = "Email já cadastrado!";
                    errorMsg.error = true;
                }
            }

            //Verificando se o cpf está validado.
            if (changeUser.cpf !== user[0].cpf && user[0].validated) {

                errorMsg.errorCpf = "Impossível alterar CPF já validado!";
                errorMsg.error = true;

                //Permito alteração de cpf para usuários não validados.
            } else if (!user[0].validated) {

                /*
                    Caso o cpf exista e já esteja validado não permito alteração.
                    Logo, o sistema permitirá ter dois cpfs iguais desde que não estejam validados.
                    Iremos validar um único usuário com determinado cpf
                    e os demais que não estão validados com o mesmo cpf irão ter o campo do cpf
                    setados para nulo!
                */

                const resultCpf = await knex("user_information")
                    .where({ cpf: changeUser.cpf })
                    .select("user_id", "validated");


                if (cpfInUse(resultCpf)) {
                    errorMsg.errorCpf = "Cpf já foi validado por outro usuário!";
                    errorMsg.error = true;
                }

                if (!errorMsg.error) {

                    await knex('user_information')
                        .where({ user_id })
                        .update({
                            name: changeUser.name,
                            cpf: changeUser.cpf
                        });
                }
            }
            else if (!changePassword && !errorMsg.error) {

                await knex('user_information')
                    .where({ user_id })
                    .update({
                        name: changeUser.name
                    });
            }
            if (changePassword && !errorMsg.error) {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(changeUser.newPassword, salt, async function (err, hash) {

                        if (err) {
                            const error = new Error("Violação nas validações");
                            error.status = 400;

                            throw error;
                            return;
                        }

                        await knex('user_information')
                            .where({ user_id })
                            .update({
                                password: hash,
                            });

                    });
                });
            }

            if (changeEmail && !errorMsg.error) {

                const token = jwt.sign({ user_id, email: changeUser.email }
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
                    return;
                });
            }

            if (!errorMsg.error) {
                res.status(204).json({
                    name: changeUser.name,
                    cpf: changeUser.cpf
                });
            } else {
                const error = new Error(JSON.stringify(errorMsg));
                error.status = 200;

                throw error;
                return;
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
            });

        } catch (error) {
            next(error);
        }
    },
    async getEvaluation(req, res, next) {

        try {

            // const user = await getUserFromToken(req);
            const { evaluation_id } = req.query;

            const evaluation = await knex("evaluation_information")
                .where({ evaluation_id })
                .first();

            if (!evaluation) {
                throw new Error("Violação nas validações");
            }
            console.log(evaluation);
            res.status(200).json(evaluation);

        } catch (error) {
            next(error);
        }
    },

    async resendEmail(req, res, next) {

        try {
            const { email } = req.body;


            const user = await knex("user_information")
                .where({ email })
                .select("name", "email", "validated_email", "access_level");

            const token = jwt.sign({ email }
                , emailKey, {
                expiresIn: user[0].access_level === "U" ? "30m" : "6h"
            });

            if (user[0].validated_email) {

                const error = new Error(JSON.stringify({
                    error: true,
                    errorMsg: "Conta já validada, se perdeu acesso, clique em esqueci minha senha!"
                }));

                error.status = 400;

                throw error;
                return;
            }

            mailer.sendMail({
                from: environment.email.auth.user, // sender address
                to: user[0].email, // list of receivers
                subject: "Ativar conta", // Subject line
                template: "validateAccount", // Subject line
                context: {
                    time: user[0].access_level === "U" ? "30 minutos" : "6 horas",
                    name: user[0].name,
                    link: `${environment.ipAdress}/activateAccount/${token}`
                }
            }, errorMessage => {
                const error = new Error(errorMessage);
                error.status = 400;

                throw error;
                return;
            });

            res.status(200).end();

        } catch (error) {
            next(error);
        }

    },

    async createEvaluation(req, res, next) {
        try {
            const { title, evaluation } = req.body;
            const user = await getUserFromToken(req);

            if (!titleIsValid(title) || !evaluationIsValid(evaluation)) {
                throw new Error("Violação nas validações");
            }

            await knex("evaluation_information")
                .insert({
                    user_id: user[0].user_id,
                    title,
                    evaluation
                })

            res.status(201).end();

        } catch (error) {
            next(error);
        }
    },

    async getEvaluations(req, res, next) {
        try {

            const { filters = null, page = 0, pageSize } = req.query;

            const { token } = req.cookies;

            let query = knex("evaluation_information")
                .leftJoin("user_information", "user_information.user_id", "evaluation_information.user_id")

            if (filters !== null) {

                //Aplicando os filtros.
                filters.forEach((elementJson) => {
                    const element = JSON.parse(elementJson);
                    //Caso seja uma string usaremos o ilike!
                    if (element.field === "title" ||
                        element.field === "cpf" ||
                        element.field === "email") {

                        query.andWhere(element.field, "like", `%${element.value}%`);

                    } else if (element.field === "viewed" && element.value.length !== 2) {
                        if (element.value.length === 1) {
                            query.andWhere(element.field, element.value[0]);
                        }
                    }
                });
            }

            let model = query;
            const users = await model
                .clone()
                .orderBy("user_id")
                .limit(pageSize)
                .offset(page * pageSize)
                .select(
                    "user_information.user_id", "evaluation_id",
                    "cpf", "email",
                    "access_level", "validated_email",
                    "viewed", "title");

            const totalCount = await model.clone().count();

            res.status(200).send({ users, totalCount: totalCount[0]["count(*)"] });

        } catch (error) {
            next(error);
        }
    },

    logged(req, res, next) {
        res.status(200).json({ accessLevel: res.locals.accessLevel });
    }
}