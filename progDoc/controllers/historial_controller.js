let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;


exports.getHistorial = function (req, res, next) {
    res.render('menus/historial', {
        menu: req.session.menu,
        planID: req.session.planID,
        departamentosResponsables: res.locals.departamentosResponsables,
        planEstudios: res.locals.planEstudios,
        PDsWithPdf: res.locals.PDsWithPdf,
        anosExistentes: res.locals.anosExistentes,
        pdSeleccionada: res.locals.pdSeleccionada
    })
}