let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let JEcontroller = require('./JE_controller')

exports.getEstado = function (req, res, next) {
    req.session.submenu = "Estado"
    
    let departamentosList = [];
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "estadoConsultar" : "estadoCumplimentar"
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
        })
    } else {
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        let estadoProgDoc = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']
        let fechaProgDoc = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.fechaProgDoc']
        let estadoProfesores = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.estadoProfesores']
        let fechaProfesores = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.fechaProfesores']
        let estadoTribunales = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.estadoTribunales']
        let fechaTribunales = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.fechaTribunales']
        let estadoHorarios = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.estadoHorarios']
        let fechaHorarios = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.fechaHorarios']
        let estadoExamenes = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.estadoExamenes']
        let fechaExamenes = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.fechaExamenes']
        let departamentoID;
        if (res.locals.departamentosResponsables.length > 0) {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        } else {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : null;
        }

        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "estadoConsultar" : "estadoCumplimentar"
        models.Departamento.findAll({
            attributes: ['codigo', 'nombre', 'acronimo'],

            raw: true
        })
            .each(function (departamentos) {
                let codigoDepartamento = departamentos['codigo'];
                let nombreDepartamento = departamentos['nombre'];
                let acronimoDepartamento = departamentos['acronimo']
                let departamento = { codigo: codigoDepartamento, nombre: nombreDepartamento, acronimo: acronimoDepartamento }
                departamentosList.push(departamento);

            })
            .then(function (departamentos) {
                res.render(view, {
                    contextPath: app.contextPath,
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    planEstudios: res.locals.planEstudios,
                    departamentos: departamentos,
                    estadoProgDoc: estadoProgDoc,
                    fechaProgDoc: fechaProgDoc,
                    estadoProfesores: estadoProfesores,
                    fechaProfesores: fechaProfesores,
                    estadoTribunales: estadoTribunales,
                    fechaTribunales: fechaTribunales,
                    estadoHorarios: estadoHorarios,
                    fechaHorarios: fechaHorarios,
                    estadoExamenes: estadoExamenes,
                    fechaExamenes: fechaExamenes,
                    estadosProfesor: estados.estadoProfesor,
                    estadosTribunal: estados.estadoTribunal,
                    estadosHorario: estados.estadoHorario,
                    estadosExamen: estados.estadoExamen,
                    estadosCalendario: estados.estadoCalendario,
                    estadosProgDoc: estados.estadoProgDoc,
                    pdID: pdID
                });
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });


    }
}