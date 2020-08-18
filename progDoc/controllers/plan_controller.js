const Sequelize = require('sequelize');
const models = require('../models');
const helpers = require('../lib/helpers');

const op = Sequelize.Op;

const getPlanInfo = async planId => {
  // eslint-disable-next-line no-useless-catch
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
const getPlanesFunction = async onlyActive => {
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
    return planesBBDD.sort(helpers.sortPlanes);
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};
exports.getPlanes = async (req, res, next) => {
  try {
    res.locals.planEstudios = await getPlanesFunction(true);
    next();
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.getPlanesFunction = getPlanesFunction;
exports.getPlanInfo = getPlanInfo;
