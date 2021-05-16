const knex = require("../../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailer = require("../../services/mailer");
const path = require("path");
const fs = require("fs");
const { environment } = require("../../config/environment");
const { key, emailKey } = require("../../config/jwb.json");
const { google } = require("googleapis");
const { getUserFromToken } = require("../helpers/userToken");
const credentials = require("../../config/googleCredentials.json");
const scopes = [
    'https://www.googleapis.com/auth/drive'
];
const auth = new google.auth.JWT(
    credentials.client_email, null,
    credentials.private_key, scopes
);
const drive = google.drive({ version: "v3", auth });

const {
    isStringValid255,
    isStringValid500,
    cepIsValid,
    isQuantityValid,
    isContractValid,
    isValueValid
} = require("../helpers/propertyValidation");

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
            const {
                nickname, //255
                address, //255
                complement, //255
                district, //255
                description, //500
                number, //QuantityValid -- 
                room, //QuantityValid --
                restroom, //QuantityValid --
                contract, //isContractValid
                rentAmount, //isValueValid
                propertyValue, //isValueValid
                cep, //cepIsValid
            } = req.body;
            console.log(req.body);
            //Verificando se os dados são validos.
            if (
                !isStringValid255(nickname) ||
                !isStringValid255(address) ||
                !isStringValid255(complement) ||
                !isStringValid255(district) ||
                !isStringValid500(description) ||
                !isQuantityValid(number) ||
                !isQuantityValid(room) ||
                !isQuantityValid(restroom) ||
                !isContractValid(contract) ||
                !isValueValid(rentAmount) ||
                !isValueValid(propertyValue) ||
                !await cepIsValid(cep)
            ) {
                const error = new Error("Violação nas validações");
                error.status = 400;

                throw error;
            }


            const user = await getUserFromToken(req);
            console.log(user[0].id);
            await knex("property").insert({
                user_id: user[0].id,
                nickname, //255
                address, //255
                complement, //255
                district, //255
                description, //500
                number, //QuantityValid -- 
                room, //QuantityValid --
                restroom, //QuantityValid --
                contract, //isContractValid
                rent_amount: rentAmount * 100, //isValueValid
                property_value: propertyValue * 100, //isValueValid
                cep, //cepIsValid
            });


            console.log("passou");
            return res.status(201).send();

        } catch (error) {
            next(error);
        }
    },

    async listFiles(req, res, next) {
        await drive.files.list({}, (err, res) => {
            if (err) throw err;
            const files = res.data.files;
            if (files.length) {
                files.map((file) => {
                    console.log(file);
                });
            } else {
                console.log('No files found');
            }
        });

        res.status(200).end();
    },

    async test(req, res, next) {
        try {

            //Cria um diretório teste
            const newDirectory = path.resolve(__dirname, "..", "..", "..", "uploads", `teste`);
            //Solicita o caminho do arquivo
            const filePath = req.file.path;
            //Cria um nome
            const newName = path.resolve(__dirname, "..", "..", "..", "uploads", `teste`, `teste.pdf`);
            //Verifica se o arquivo já existe
            if (!fs.existsSync(newDirectory)) {
                //Se não existe, cria.
                fs.mkdir(newDirectory, (err) => {
                    if (err) {
                        throw err;
                    } else {

                        fs.rename(
                            filePath,
                            newName,
                            err => { if (err) throw err; }
                        );

                    }
                });
            } else {
                //Se existe, recria
                fs.rename(
                    filePath,
                    newName,
                    err => {
                        if (err) {
                            throw err;
                        }
                    }
                );
            }


            res.status(201).end();
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
            }


            if (changePassword && !bcrypt.compareSync(changeUser.password, user[0].password)) {
                errorMsg.errorPassword = "Senha atual inválida!";
                errorMsg.error = true;
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
                    .select("id", "validated");


                if (cpfInUse(resultCpf)) {
                    errorMsg.errorCpf = "Cpf já foi validado por outro usuário!";
                    errorMsg.error = true;
                }

                if (!errorMsg.error) {

                    await knex('user_information')
                        .where({ id })
                        .update({
                            name: changeUser.name,
                            cpf: changeUser.cpf
                        });
                }
            }
            else if (!changePassword && !errorMsg.error) {

                await knex('user_information')
                    .where({ id })
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
}