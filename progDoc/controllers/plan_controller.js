
let models = require('../models');
let funciones = require('../funciones');


exports.getPlanes = async function (req, res, next) {
    try {
        let planesBBDD = await models.PlanEstudio.findAll({
            attributes: ["codigo", "nombre", "nombreCompleto"],
            raw: true
        })
        res.locals.planEstudios = planesBBDD.sort(funciones.sortPlanes);
        next();
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}