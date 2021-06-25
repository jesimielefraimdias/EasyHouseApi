const axiosViaCep = require("../../services/axiosViaCep");

exports.evaluationIsValid = (evaluation) => {
    if (evaluation.length === 0 && evaluation.length > 5000) {
        console.log("teste1");
        return false;
    }

    return true;
}

exports.isStringValid255 = (title) => {

    if (title.length === 0 && title.length > 255) {
        console.log("teste2");
        return false;
    }

    return true;
}

exports.isStringValid500 = (title) => {

    if (title.length === 0 && title.length > 500) {
        console.log("teste3");
        return false;
    }

    return true;
}

exports.isContractValid = (contract) => {
    if (contract !== "S" && contract !== "R" && contract !== "A") {
        console.log("teste4");
        return false;
    }

    return true;
}

exports.cepIsValid = async cep => {
    try {
        const res = await axiosViaCep.get(`/ws/${cep}/json/unicode/`);

        // console.log(res.data.cep);
        if (res.data.erro) {
            throw new Error();
        }
        return true;
    } catch (e) {
        console.log("teste5");
        return false;
    }
}

exports.isQuantityValid = value => {
    if (parseInt(value) > 0) return true;
    console.log("teste6");
    return false;
}

exports.isValueValid = value => {
    if (typeof parseFloat(value) === "number" && value > 0) {
        return true;
    }
    console.log("teste7");
    return false;
}