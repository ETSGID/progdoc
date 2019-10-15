const axios = require('axios');

exports.getAsignaturasApiUpm = async (plan, ano) => {
    try {
        return await axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/plan.json/" + plan + "/asignaturas?anio=" + ano);
    }
    catch (error) {
        //se propaga el error lo captura el middleware. Es critica para abrir progdoc
        throw error;
    }
}

exports.getDepartamentosApiUpm = async () => {
    try {
        return await axios.get('https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/departamentos');
    }
    catch (error) {
        //no se propaga el error porque puede haber fallos en api upm y esta no es critica
        console.log(error);
        return {data:[]}
    }
}

exports.getPlanesApiUpm = async () => {
    try {
        return await axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/planes/PSC")
    }
    catch (error) {
        //no se propaga el error porque puede haber fallos en api upm y esta no es critica
        console.log(error);
        return {data:[]}
    }
}



