
const mime = require('mime-types');
const knex = require("../../database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mailer = require("../../services/mailer");
const { environment } = require("../../config/environment");
const { emailKey } = require("../../config/jwb.json");
const path = require("path");
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
const { getUserFromToken } = require("../helpers/userToken");

//CTR + K + 2
module.exports = {

    async create(req, res, next) {

        try {
            // console.log(req.body.nickname);
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
                lat,
                lng
            } = req.body;
            // console.log(req.body);
            //Verificando se os dados são validos.
            // console.log(req.files);
            // if (
            //     !(!!req.files && req.files.length > 0) ||
            //     !isStringValid255(nickname) ||
            //     !isStringValid255(address) ||
            //     !isStringValid255(complement) ||
            //     !isStringValid255(district) ||
            //     !isStringValid500(description) ||
            //     !isQuantityValid(number) ||
            //     !isQuantityValid(room) ||
            //     !isQuantityValid(restroom) ||
            //     !isContractValid(contract) ||
            //     !isValueValid(rentAmount) ||
            //     !isValueValid(propertyValue) ||
            //     !await cepIsValid(cep)
            // ) {
            //     console.log(!isStringValid255(nickname),
            //         !isStringValid255(address),
            //         !isStringValid255(complement),
            //         !isStringValid255(district),
            //         !isStringValid500(description),
            //         !isQuantityValid(number),
            //         !isQuantityValid(room),
            //         !isQuantityValid(restroom),
            //         !isContractValid(contract),
            //         !isValueValid(rentAmount),
            //         !isValueValid(propertyValue),
            //         !await cepIsValid(cep))
            //     const error = new Error("Violação nas validações");
            //     error.status = 400;

            //     throw error;
            // }

            // console.log("aqui", nickname, res.locals.user.folder);
            const resFolder = await drive.files.create({
                resource: {
                    name: nickname,
                    parents: [res.locals.user.folder],
                    mimeType: "application/vnd.google-apps.folder"
                },
                fields: 'id',
            });
            console.log(resFolder.data, resFolder.status)

            await req.files.forEach(async (element, index) => {
                console.log(element);
                const resCreate = await drive.files.create({
                    resource: {
                        name: element.originalname,
                        parents: [resFolder.data.id]
                    },
                    media: {
                        mimeType: element.mimeType,
                        body: fs.createReadStream(path.resolve(element.path))
                    },
                    fields: 'id',
                });

                if (fs.existsSync(element.path)) {
                    fs.unlinkSync(element.path)
                }
                console.log(resCreate.status);
            });

            const [id] = await knex("property")
                .returning("id")
                .insert({
                    user_id: res.locals.user.id,
                    folder: resFolder.data.id,
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
                    lat,
                    lng
                });

            return res.status(201).send();

        } catch (error) {
            next(error);
        }
    },
    async list(req, res, next) {
        const user = await getUserFromToken(req);
        console.log(user);
        const data = await knex("property").where({ user_id: user[0].id });

        res.status(200).json(data);
    },
    async listByUser(req, res, next) {
        const { user_id } = req.params;

        const data = await knex("property").where({ user_id });

        res.status(200).json(data);
    },
    async listAll(req, res, next) {
        const data = await knex("property");

        res.status(200).json(data);
    },
    async getProperty(req, res, next) {
        try {
            const { id } = req.params;
            //folder = hash
            if (!!id === false) {
                const error = new Error("Property not found");
                error.status = 400;
                throw error;
            }

            const property = await knex("property").where({ id }).first();

            const resFiles = await drive.files.list({
                q: `mimeType != 'application/vnd.google-apps.folder' and '${property.folder}' in parents`
            });
            res.status(200).json({ property, files: resFiles.data.files });

        } catch (e) {
            next(e);
        }
    },

    async download(req, res, next) {
        try {
            const { file = null } = req.params;

            if (!!file === false) {
                const error = new Error("File not found");
                error.status = 400;

                throw error;
            }

            const resDrive = await drive.files.get(
                {
                    fileId: file,
                    alt: "media"
                }, {
                responseType: "stream"
            }
            );

            const hash = crypto.randomBytes(8);
            const date = Date.now();
            // const ext = resFiles.data.files[0].name.split(".")[1];
            const ext = mime.extension(resDrive.headers["content-type"]);
            const fileName = `${hash.toString("hex")}_${date}.${ext}`;
            // const fileId = resFiles.data.files[0].id;
            // const realName = resFiles.data.files[0].name;
            const tempFile = path.resolve(__dirname, "..", "..", "..", "uploads", "temp", `${fileName}`);
            console.log(tempFile);
            console.log(resDrive.headers["content-type"]);

            // return res.status(200).end();

            const dest = fs.createWriteStream(tempFile);
            resDrive.data.pipe(dest);
            console.log(fileName);
            dest.on("finish", _ => {

                res.download(tempFile, tempFile, err => {
                    if (err) {
                        console.log(err);
                    }

                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile)
                    }
                }
                );

            });
            console.log("teste");
        } catch (e) {
            next(e);
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
                .select("name", "email", "validated", "access_level");

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