const axios = require('axios');

const axiosViaCep = axios.create({
    baseURL: "https://viacep.com.br"

});

module.exports = axiosViaCep;