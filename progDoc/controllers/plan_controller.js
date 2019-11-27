
let models = require('../models');
let funciones = require('../funciones');
let Sequelize = require('sequelize')
const op = Sequelize.Op
exports.getPlanes = async function (req, res, next) {
    try {
        res.locals.planEstudios = await getPlanesFunction(true);
        next();
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }

}
//un plan es activo cuando tiene nombre == acronimo asignado
getPlanesFunction = async function (onlyActive) {
    try {
        let filtro = {};
        if (onlyActive){
            filtro.nombre = {
                [op.ne]: null,
                [op.notRegexp]: '^\s*$'//string vacía
            }
        }
        let planesBBDD = await models.PlanEstudio.findAll({
            attributes: ["codigo", "nombre", "nombreCompleto"],
            where: filtro, 
            raw: true
        })
        return planesBBDD.sort(funciones.sortPlanes);
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

exports.getPlanesFunction = getPlanesFunction;