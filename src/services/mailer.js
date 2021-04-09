const nodemailer = require("nodemailer");
const { environment } = require("../config/environment");
const path = require("path");
const hbs = require("nodemailer-express-handlebars");

const { host, port, auth } = environment.email;

const transport = nodemailer.createTransport({
    host,
    port,
    auth
});

transport.use("compile", hbs({
    // viewEngine: "handlebars",
    viewEngine: {
        defaultLayout: undefined,
        partialsDir: path.resolve('./src/resources/mail/')
    },
    viewPath: path.resolve("./src/resources/mail/"),
    extName: ".html"
}));

module.exports = transport;