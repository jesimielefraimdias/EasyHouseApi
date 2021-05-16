const knex = require("../../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailer = require("../../services/mailer");
const { environment } = require("../../config/environment");
const { key, emailKey } = require("../../config/jwb.json");
const { nameIsValid, emailIsValid, cpfIsValid, passwordIsValid, cpfInUse, emailInUse } = require("../helpers/userValidation");


//CTR + K + 2
module.exports = {

    async create(req, res, next) {
        try {
            const { name, email, cpf, password, access_level, validated } = req.body;

            if (!nameIsValid(name) || !emailIsValid(email) ||
                !cpfIsValid(cpf) || !passwordIsValid(password) ||
                access_level !== "A" && access_level !== "O") {

                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;

                return;
            }

            const resultEmail = await knex("user_information").where({ email });
            const resultCpf = await knex("user_information").where({ cpf });

            let errorMsg = { error: false, errorCpf: "", errorEmail: "" };

            //Verificando se email ou cpf já estão em uso definitivo.
            if (emailInUse(resultEmail)) {

                errorMsg.errorEmail = "Email já cadastrado, você pode aumentar/diminuir o nível de acesso deste usuário em lista de usuário!";
                errorMsg.error = true;
            }

            if (cpfInUse(resultCpf)) {
                errorMsg.errorCpf = "Cpf já foi validado por outro usuário, você pode aumentar o nível de acesso deste usuário em lista de usuário!";
                errorMsg.error = true;
            }

            if (errorMsg.error) {
                const error = new Error(JSON.stringify(errorMsg));
                error.status = 200;

                throw error;
                return;
            }

            //Criando hash
            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(password, salt, async function (err, hash) {

                    if (err) {

                        const error = new Error("Senha inválida");
                        error.status = 400;

                        throw error;
                        return;
                    }

                    await knex("user_information")
                        .where({ email })
                        .del();

                    if (validated) {
                        await knex("user_information")
                            .where({ cpf })
                            .del();
                    }

                    const token = jwt.sign({ email }
                        , emailKey, {
                        expiresIn: "6h"
                    });

                    mailer.sendMail({
                        from: environment.email.auth.user, // sender address
                        to: email, // list of receivers
                        subject: "Ativar conta", // Subject line
                        template: "validateAccount", // Subject line
                        context: {
                            time: "6 horas",
                            name,
                            link: `${environment.ipAdress}/activateAccount/${token}`
                        }
                    }, errorMessage => {
                        const error = new Error(errorMessage);
                        error.status = 400;

                        throw error;
                        return;
                    });

                    await knex("user_information")
                        .insert({
                            name,
                            email,
                            cpf,
                            password: hash,
                            access_level,
                            validated: validated ? 1 : 0
                        });
                });
            });

            return res.status(201).send();

        } catch (error) {
            if (error.status == 200) {
                res.status(error.status).send(error.message);
            } else {
                next(error);
            }
        }
    },

    async update(req, res, next) {

        try {

            const { id } = req.body;
            const changeUser = req.body;

            let errorMsg = {
                error: false,
                errorEmail: "",
            };

            //Pegando os dados do usuário.
            const user = await knex("user_information").where({ id });

            const changeEmail = changeUser.email !== user[0].email ? true : false;

            //Validando dados a serem alterados.
            if (!emailIsValid(changeUser.email)
                || (changeUser.access_level !== "U" && changeUser.access_level !== "O" && changeUser.access_level !== "A")
                || user[0].validated && !changeUser.validated) {

                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
                return;
            }

            if (changeEmail) {
                //Verificando se o email a ser alterado existe.
                const resultEmail = await knex("user_information")
                    .where({ email: changeUser.email })
                    .select("id");

                //Verificando se o email pertence a outro usuário.
                if (emailInUse(resultEmail)) {
                    errorMsg.errorEmail = "Email já cadastrado!";
                    errorMsg.error = true;
                }
            }

            if (changeEmail && !errorMsg.error) {

                const token = jwt.sign({ id, email: changeUser.email }
                    , emailKey, {
                    expiresIn: "30m"
                });

                mailer.sendMail({
                    from: environment.email.auth.user, // sender address
                    // to: changeUser.email, // list of receivers
                    to: user[0].email, // list of receivers
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

                knex('user_information')
                    .where({ id })
                    .update({
                        access_level: changeUser.access_level,
                        validated: changeUser.validated === "true" ? 1 : 0,
                        removed: changeUser.removed === "true" ? 1 : 0,
                    });
            }
            if (!errorMsg.error) {
                res.status(204).send();
            } else {
                const error = new Error(JSON.stringify(errorMsg));
                error.status = 200;

                throw error;
                return;
            }
        } catch (error) {
            if (error.status == 200) {
                res.status(error.status).send(error.message);
            } else {
                next(error);
            }
        }
    },

    async getUsers(req, res, next) {
        try {

            const { filters = null, page = 0, pageSize } = req.query;

            const { token } = req.cookies;
            const { id } = jwt.verify(token, key);

            let query = knex("user_information")
                .whereNot({ id });

            //Se for diferente de null aplicamos os filtros.
            if (filters !== null) {

                //Aplicando os filtros.
                filters.forEach((elementJson) => {
                    const element = JSON.parse(elementJson);
                    //Caso seja uma string usaremos o ilike!
                    if (element.field === "name" ||
                        element.field === "cpf" ||
                        element.field === "email") {

                        query.andWhere(element.field, "like", `%${element.value}%`);

                    } else if (element.field === "access_level" && element.value.length !== 3) {
                        if (element.value.length === 1) {
                            // query.andWhere(element.field, "ilike", element.value[0]);
                            query.andWhere(element.field, "like", element.value[0]);
                        } else if (element.value.length === 2) {
                            query.andWhere(builder => {
                                // builder.where(element.field, "ilike", element.value[0])
                                //     .orWhere(element.field, "ilike", element.value[1]);
                                builder.where(element.field, "like", element.value[0])
                                    .orWhere(element.field, "like", element.value[1]);
                            });
                        }
                    }
                });
            }

            let model = query;
            const users = await model
                .clone()
                .orderBy("id")
                .limit(pageSize)
                .offset(page * pageSize)
                .select("id", "name", "cpf", "email", "access_level", "validated_email");

            const totalCount = await model.clone().count();

            res.status(200).send({ users, totalCount: totalCount[0]["count(*)"] });

        } catch (error) {
            next(error);
        }
    },

    async getUser(req, res, next) {

        try {

            const { id } = req.query;

            const user = await knex("user_information")
                .where({ id })
                .select("access_level", "name", "email", "cpf", "validated", "removed");

            res.status(200).json({
                access_level: user[0].access_level,
                name: user[0].name,
                email: user[0].email,
                cpf: user[0].cpf,
                validated: user[0].validated,
                removed: user[0].removed
            });

        } catch (error) {
            next(error);
        }
    },

    logged(req, res, next) {
        res.status(200).json({ accessLevel: res.locals.accessLevel });
    }
}