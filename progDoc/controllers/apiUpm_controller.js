const axios = require('axios');
const models = require('../models');
const planController = require('./plan_controller');

const getAsignaturasApiUpm = async (plan, ano) => {
  // eslint-disable-next-line no-useless-catch
  try {
    return await axios.get(
      `https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/plan.json/${plan}/asignaturas?anio=${ano}`
    );
  } catch (error) {
    // se propaga el error lo captura el middleware. Es critica para abrir progdoc
    throw error;
  }
};

const getDepartamentosApiUpm = async () => {
  try {
    return await axios.get(
      'https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/departamentos'
    );
  } catch (error) {
    // no se propaga el error porque puede haber fallos en api upm y esta no es critica
    console.error(error);
    return { data: [] };
  }
};

const getPlanesApiUpm = async () => {
  try {
    return await axios.get(
      'https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/planes/PSC'
    );
  } catch (error) {
    // no se propaga el error porque puede haber fallos en api upm y esta no es critica
    console.error(error);
    return { data: [] };
  }
};

exports.updatePlanesAndDeparts = async () => {
  const nuevosDepartamentos = [];
  const nuevosPlanes = [];
  const promises = [];
  promises.push(getDepartamentosApiUpm());
  promises.push(getPlanesApiUpm());
  const [response, response2] = await Promise.all(promises);
  try {
    const apiDepartamentos = response.data;
    const departamentosBBDD = await models.Departamento.findAll({
      attributes: ['codigo', 'nombre', 'acronimo'],
      raw: true
    });
    apiDepartamentos.forEach(apiDepartamento => {
      const departamentoBBDD = departamentosBBDD.find(
        obj => obj.codigo === apiDepartamento.codigo
      );
      if (!departamentoBBDD) {
        const nuevoDepartamento = {};
        nuevoDepartamento.codigo = apiDepartamento.codigo;
        nuevoDepartamento.nombre = apiDepartamento.nombre;
        nuevosDepartamentos.push(nuevoDepartamento);
      }
    });
    await models.Departamento.bulkCreate(nuevosDepartamentos);
    const apiPlanes = response2.data;
    // los ocultos son necesarios para añadir los planes nuevos que aparecen
    const planesBBDD = await planController.getPlanesFunction(false);
    apiPlanes.forEach(apiPlan => {
      const planBBDD = planesBBDD.find(obj => obj.codigo === apiPlan.codigo);
      if (!planBBDD) {
        const nuevoPlan = {};
        nuevoPlan.codigo = apiPlan.codigo;
        nuevoPlan.nombreCompleto = apiPlan.nombre;
        // falta el acronimo del plan
        nuevoPlan.nombre = null;
        nuevosPlanes.push(nuevoPlan);
      }
    });
    await models.PlanEstudio.bulkCreate(nuevosPlanes);
  } catch (error) {
    // no haces un next(error) pq quieres que siga funcionando aunque api upm falle en este punto
    console.error('Error:', error);
  }
};

/**
 * Funcion que devuelve el departamento responsable
 * de todos los que tiene la asignatura en api upm
 * @param {{codigo_departamento: String, responsable: String}[]} apiDepartamentos departamentos de la asignatura en api upm con el formato que devuelve api upm
 * @param {{codigo: String}[]} departamentosBBDD  departamentos en la bbdd con el formato de la bbdd
 * @param {String} nombreCompletoPlan  nombre completo del plan
 * @param {String} codigoTipoAsignatura codigo tipo de la asignatura
 * @retruns {String} codigoDepartamento o null con el codigo del departamento responsable
 */

const addDepartamentoResponsable = (
  apiDepartamentos,
  departamentosBBDD,
  nombreCompletoPlan,
  codigoTipoAsignatura
) => {
  let departamentoResponsable = null;
  if (apiDepartamentos.length === 0) {
    if (
      codigoTipoAsignatura === 'P' &&
      (nombreCompletoPlan.toUpperCase().includes('MASTER') ||
        nombreCompletoPlan.toUpperCase().includes('MÁSTER'))
    ) {
      departamentoResponsable = 'TFM';
    }
    if (
      codigoTipoAsignatura === 'P' &&
      nombreCompletoPlan.toUpperCase().includes('GRADO')
    ) {
      departamentoResponsable = 'TFG';
    }
  } else {
    // devuelve el ultimo departamento del array si varios cumplen las condiciones:
    // el departamento debe estar en la base de datos
    // el departamento en api upm debe tener esas dos etiquetas
    apiDepartamentos.forEach(element => {
      if (
        (element.responsable === 'S' || element.responsable === '') &&
        departamentosBBDD.find(
          dep => dep.codigo === element.codigo_departamento
        )
      ) {
        departamentoResponsable = element.codigo_departamento;
      }
    });
  }

  return departamentoResponsable;
};

exports.getAsignaturasApiUpm = getAsignaturasApiUpm;
exports.getPlanesApiUpm = getPlanesApiUpm;
exports.getDepartamentosApiUpm = getDepartamentosApiUpm;
exports.addDepartamentoResponsable = addDepartamentoResponsable;
