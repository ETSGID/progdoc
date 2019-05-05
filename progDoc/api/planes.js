let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let menuProgDocController = require('../controllers/menuProgDoc_controller')
let estados = require('../estados');
let enumsPD = require('../enumsPD')

// GET planes de una PD
exports.getPlanesPD = function (req, res, next) {
    let resp = {}
    let respError
return models.PlanEstudio.findAll({
    attributes: ["codigo", 'nombreCompleto', 'nombre'],
    raw: true
})
    .then((plans) => {
        plans.forEach(function (p, index) {
            resp[p['codigo']] = p
        })
        if (respError) res.json(respError)
        else res.json(resp)
    })
    .catch(function (error) {
        console.log('API error: ' + error.message);
        next(error);
    });
}