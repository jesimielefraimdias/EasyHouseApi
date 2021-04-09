
exports.evaluationIsValid = (evaluation) => {

    if (evaluation.length === 0 && evaluation.length > 5000) {
        return false;
    }

    return true;
}

exports.titleIsValid = (title) => {

    if (title.length === 0 && title.length > 255) {
        return false;
    }

    return true;
}

