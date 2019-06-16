let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let JEcontroller = require('./JE_controller')
let menuProgDocController = require('./menuProgDoc_controller')

exports.getEstado = function (req, res, next) {
    req.session.submenu = "Estado"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "estadoConsultar" : "estadoCumplimentar"
        res.render(view, {
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            //para diferenciar entre pantalla mostrar el estado o poder cambiarlo en gestionPlanes
            verEstado: true
        })
    } else {
        req.session.pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
        let departamentoID;
        if (res.locals.departamentosResponsables.length > 0) {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        } else {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : null;
        }

        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "estadoConsultar" : "estadoCumplimentar"
        return menuProgDocController.getAllDepartamentos()
            .then(function (departamentos) {
                res.render(view, {
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    planEstudios: res.locals.planEstudios,
                    departamentos: departamentos,
                    progDoc : res.locals.progDoc,
                    estadosProfesor: estados.estadoProfesor,
                    estadosTribunal: estados.estadoTribunal,
                    estadosHorario: estados.estadoHorario,
                    estadosExamen: estados.estadoExamen,
                    estadosCalendario: estados.estadoCalendario,
                    estadosProgDoc: estados.estadoProgDoc,
                    pdID: req.session.pdID,
                    //para diferenciar entre mostrar el estado o poder cambiarlo en gestionPlanes
                    verEstado: true
                });
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });


    }
}