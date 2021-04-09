const { environment } = require("../config/environment");
const knex = environment.knex;

module.exports = knex;

