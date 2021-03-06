const knex = require("../../database");
const jwt = require("jsonwebtoken");
const { key } = require("../../config/jwb.json");
const { OAuth2Client } = require("google-auth-library");
const clientId = "309165722872-gug1ideapidlhdqb7hm954f9fk24q4f8.apps.googleusercontent.com";
const client = new OAuth2Client(clientId);


exports.getUserFromToken = async (req) => {

    const { authorization = null } = req.headers;

    let token = authorization;

    if (!!token === false) {
        token = req.cookies.token;
    }

    if (!!token === false) {
        return [];
    }


    const { id } = jwt.verify(token, key);

    const user = await knex("user_information")
        .where({ id });

    return user;

}

exports.getUserFromTokenIdGoogle = async (object) => {

//    console.log(object.tokenObj.id_token);
    try {

        const ticket = await client.verifyIdToken({
            idToken: object.tokenObj.id_token,
            audience: clientId
        });

        const payload = ticket.getPayload();

        return payload;
    } catch (e) {
        return null;
    }
}