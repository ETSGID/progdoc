const models = require('../models');


// te devuelve todos los departamentos que hay en el sistmea
exports.getAllDepartamentos = async function () {
  // eslint-disable-next-line no-useless-catch
  try {
    const deps = await models.Departamento.findAll({
      attributes: ['codigo', 'nombre', 'acronimo'],
      raw: true,
    });
    return deps;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};
