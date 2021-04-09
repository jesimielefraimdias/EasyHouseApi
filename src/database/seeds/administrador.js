const bcrypt = require("bcryptjs");

exports.seed = function (knex) {

  const senha = "desenvolvimento";
  let gHash;

  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(senha, salt, async function (err, hash) {
      gHash = hash;
    });
  });

  // Deletes ALL existing entries
  return knex('usuario').del()
    .then(function () {
      // Inserts seed entries
      return knex('usuario').insert([
        {
          nome: "Admin_mind", cpf: "94690870039",
          email: "onlyfortest@mindconsulting.com.br", senha: gHash,
          grau_acesso: "A", validado: true
        },
      ]);
    });
};
