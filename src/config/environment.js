const knexfile = require("../../knexfile");
const email = require("./mail.json");

const selectEnvrionment = (environment = "localPg") => {

    
    if (environment == "localSql") {
        
        return {
            knex: require("knex")(knexfile["localSql"]),
            email: email.mailtrap,
            // email: email.email,
            ipAdress: "http://localhost:3353"
        }
    }
}

module.exports.environment = selectEnvrionment("localSql");
