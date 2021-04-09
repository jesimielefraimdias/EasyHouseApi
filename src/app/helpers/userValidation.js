    exports.nameIsValid = (paramNome) => {
        const padraoNome = /[^a-zà-ú ]/gi;


        if (paramNome === null || paramNome.length === 0 || paramNome.length > 50 || padraoNome.test(paramNome)) {
            return false;
        }

        return true;
    }

    exports.cpfIsValid = (strCPF) => {
        let soma = 0;
        let resto;
        let i;

        if (strCPF === null || strCPF.length === 0) return false;
        if (strCPF === "00000000000") return false;
        if (strCPF === "11111111111") return false;
        if (strCPF === "22222222222") return false;
        if (strCPF === "33333333333") return false;
        if (strCPF === "44444444444") return false;
        if (strCPF === "55555555555") return false;
        if (strCPF === "66666666666") return false;
        if (strCPF === "77777777777") return false;
        if (strCPF === "88888888888") return false;
        if (strCPF === "99999999999") return false;

        for (i = 1; i <= 9; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;

        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(strCPF.substring(9, 10))) return false;

        soma = 0;
        for (i = 1; i <= 10; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;

        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(strCPF.substring(10, 11))) return false;
    
        return true;
    
    }


    exports.emailIsValid = (paramEmail) => {
        if (paramEmail == null || paramEmail.length == 0) return false;
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     
        return re.test(String(paramEmail).toLowerCase());
    }
    
    exports.passwordIsValid = (paramSenha) => {
        if (paramSenha === null) return false;
        let numberCaracters = paramSenha.length >= 8 && paramSenha.length <= 20 ? true : false;
     
        return numberCaracters;
    }
    
    exports.emailInUse = (emails) => {
        let validated_email = false;

        emails.forEach(element => {
            if (element.validated_email || element.validated) {
                validated_email = true;
            }
        });
        
        return validated_email;
    }
    
    exports.cpfInUse = (cpf) => {
        let validated = false;
        cpf.forEach(element => {
            if (element.validated) {
                validated = true;
            }
        });
     
        return validated;
    }