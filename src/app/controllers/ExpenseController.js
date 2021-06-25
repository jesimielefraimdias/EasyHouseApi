
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

//CTR + K + 2
module.exports = {

    async create(req, res, next) {

        try {
            // console.log(req.body.nickname);
            const {
                property_id,
                nickname, //255
                value,
                description,
                expense_date,
            } = req.body;
            // const {
            //     property_id
            // } = req.params;
            // console.log(req.body);
            const property = await knex("property").where({ id: property_id }).first();
            //Verificando se os dados são validos.
            // console.log(req.files);

            const resFolder = await drive.files.create({
                resource: {
                    name: nickname,
                    parents: [property.folder],
                    mimeType: "application/vnd.google-apps.folder"
                },
                fields: 'id',
            });

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

            const [id] = await knex("expense")
                .returning("id")
                .insert({
                    property_id,
                    nickname, //255
                    folder: resFolder.data.id,
                    value: value * 100, //isValueValid,
                    description,
                    expense_date: new Date(expense_date)
                });

            return res.status(201).send();

        } catch (error) {
            next(error);
        }
    },
    async list(req, res, next) {

        const { property_id } = req.params;

        const data = await knex("expense").where({ property_id }).select("*");
        console.log("aqui", data);
        res.status(200).json({ expenses: data });
    },

    async getExpense(req, res, next) {
        try {
            const { id } = req.params;
            //folder = hash
            if (!!id === false) {
                const error = new Error("Expense not found");
                error.status = 400;
                throw error;
            }

            const expense = await knex("expense").where({ id }).first();

            const resFiles = await drive.files.list({
                q: `mimeType != 'application/vnd.google-apps.folder' and '${expense.folder}' in parents`
            });
            console.log("aqui2")
            res.status(200).json({ expense, files: resFiles.data.files });

        } catch (e) {
            next(e);
        }
    },
    async getAllExpense(req, res, next) {
        try {

            const { id } = res.locals.user;
            //folder = hash
            if (!!id === false) {
                const error = new Error("Expense not found");
                error.status = 400;
                throw error;
            }

            const expenses = await knex("expense")
                .innerJoin("property", "expense.property_id", "property.id")
                .where("property.user_id", "=", id)
                .orderBy("expense_date", "desc");

            const categories = [];
            let date = new Date();
            // let auxDate;

            for (let i = 0; i < 6; i++) {
                var newDate = new Date(date.setMonth(date.getMonth() - 1));
                categories.push({ name: `${newDate.getMonth() + 1}/${newDate.getFullYear()}`, despesa: 0, expenses: 0 });
            }

            expenses.forEach(element => {
                const aux = new Date(element.expense_date);
                const name = `${aux.getMonth() + 1}/${aux.getFullYear()}`;

                const index = (categories.findIndex(element => element.name === name));
                if (index !== -1) {
                    categories[index].despesa += element.value / 100;
                    categories[index].expenses += 1;
                }
            });
            console.log(categories);

            res.json(categories);
        } catch (e) {
            next(e);
        }
    },
}