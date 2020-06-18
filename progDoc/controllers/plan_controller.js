const Sequelize = require('sequelize');
const models = require('../models');
const funciones = require('../funciones');

const op = Sequelize.Op;

const getPlanInfo = async function(planId) {
  try {
    const planBBDD = await models.PlanEstudio.findById(planId, {
      raw: true
    });
    return planBBDD;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// un plan es activo cuando tiene nombre == acronimo asignado
const getPlanesFunction = async function(onlyActive) {
  // eslint-disable-next-line no-useless-catch
  try {
    const filtro = {};
    if (onlyActive) {
      filtro.nombre = {
        [op.ne]: null,
        // eslint-disable-next-line no-useless-escape
        [op.notRegexp]: '^s*$' // string vacía
      };
    }
    const planesBBDD = await models.PlanEstudio.findAll({
      attributes: ['codigo', 'nombre', 'nombreCompleto'],
      where: filtro,
      raw: true
    });
    return planesBBDD.sort(funciones.sortPlanes);
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};
exports.getPlanes = async function(req, res, next) {
  try {
    res.locals.planEstudios = await getPlanesFunction(true);
    next();
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

exports.getPlanesFunction = getPlanesFunction;
exports.getPlanInfo = getPlanInfo;
