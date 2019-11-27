const axios = require('axios');
let models = require('../models');
let planController = require('./plan_controller');

getAsignaturasApiUpm = async (plan, ano) => {
    try {
        return await axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/plan.json/" + plan + "/asignaturas?anio=" + ano);
    }
    catch (error) {
        //se propaga el error lo captura el middleware. Es critica para abrir progdoc
        throw error;
    }
}

getDepartamentosApiUpm = async () => {
    try {
        return await axios.get('https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/departamentos');
    }
    catch (error) {
        //no se propaga el error porque puede haber fallos en api upm y esta no es critica
        console.log(error);
        return {data:[]}
    }
}

getPlanesApiUpm = async () => {
    try {
        return await axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/planes/PSC")
    }
    catch (error) {
        //no se propaga el error porque puede haber fallos en api upm y esta no es critica
        console.log(error);
        return {data:[]}
    }
}

exports.updatePlanesAndDeparts = async function (){
    let nuevosDepartamentos = [];
    let nuevosPlanes = [];
    let promises = [];
    promises.push(getDepartamentosApiUpm());
    promises.push(getPlanesApiUpm());
    let [response, response2] = await Promise.all(promises);
    try {
        apiDepartamentos = response.data;
        let departamentosBBDD = await models.Departamento.findAll({
            attributes: ["codigo", "nombre", "acronimo"],
            raw: true
        })
        apiDepartamentos.forEach(function (apiDepartamento) {
            let departamentoBBDD = departamentosBBDD.find(function (obj) { return obj.codigo === apiDepartamento.codigo });
            if (!departamentoBBDD) {
                let nuevoDepartamento = {};
                nuevoDepartamento.codigo = apiDepartamento.codigo;
                //TODO: descomentar
                nuevoDepartamento.nombre = apiDepartamento.nombre;
                nuevosDepartamentos.push(nuevoDepartamento);
            }
        })
        await models.Departamento.bulkCreate(
            nuevosDepartamentos
        )
        apiPlanes = response2.data;
        //los ocultos son necesarios para añadir los planes nuevos que aparecen
        let planesBBDD = await planController.getPlanesFunction(false); 
        apiPlanes.forEach(function (apiPlan) {
            let planBBDD = planesBBDD.find(function (obj) { return obj.codigo === apiPlan.codigo });
            if (!planBBDD) {
                let nuevoPlan = {};
                nuevoPlan.codigo = apiPlan.codigo;
                nuevoPlan.nombreCompleto = apiPlan.nombre;
                // falta el acronimo del plan
                nuevoPlan.nombre = null;
                nuevosPlanes.push(nuevoPlan);
            }
        })
        await models.PlanEstudio.bulkCreate(
            nuevosPlanes
        )
    }
    catch (error) {
        //no haces un next(error) pq quieres que siga funcionando aunque api upm falle en este punto
        console.log("Error:", error);
    }
}

exports.getAsignaturasApiUpm = getAsignaturasApiUpm;
exports.getPlanesApiUpm = getPlanesApiUpm;
exports.getDepartamentosApiUpm = getDepartamentosApiUpm;



