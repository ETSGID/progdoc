let app = require('../app');
let models = require('../models');
let funciones = require('../funciones');
let estados = require('../estados');
let progDocController = require('./progDoc_controller')
let asignaturaController = require('./asignatura_controller')
let departamentoController = require('./departamento_controller')

exports.getAcronimos = async function (req, res, next) {
    req.session.submenu = "Acronimos"
    try {
        let departs = await departamentoController.getAllDepartamentos();
        let nuevopath = "" + req.baseUrl + "/gestionAcronimos/guardarAcronimosJE"
        let cancelarpath = "" + req.baseUrl + "/gestion/acronimos?planID=" + req.session.planID
        let asignaturasPorCursos = {};
        if (!res.locals.progDoc || !res.locals.departamentosResponsables ||
            (estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'])
            && estados.estadoProgDoc.incidencia !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']) {
            res.render("acronimos/acronimosJE", {
                estado: "Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada",
                permisoDenegado: res.locals.permisoDenegado,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                planEstudios: res.locals.planEstudios,
                nuevopath: nuevopath,
                cancelarpath: cancelarpath,
                departamentos: departs.sort(funciones.sortDepartamentos),
                asignaturas: null,
            })
        } else {
            let pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
            let asign = await asignaturaController.getAsignaturasProgDoc(pdID)
            asign.forEach(function (as) {
                if (asignaturasPorCursos[as.curso] == null) {
                    asignaturasPorCursos[as.curso] = [];
                }
                asignaturasPorCursos[as.curso].push(as);
            });
            res.render("acronimos/acronimosJE", {
                estado: null,
                permisoDenegado: res.locals.permisoDenegado,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                planEstudios: res.locals.planEstudios,
                nuevopath: nuevopath,
                cancelarpath: cancelarpath,
                asignaturas: asignaturasPorCursos,
                departamentos: departs.sort(funciones.sortDepartamentos),
                pdID: pdID
            })
        }
    }catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

//guardar acrónimos departamento
exports.actualizarAcronimos = async function (req, res, next) {
    let planID = req.session.planID;
    let toActualizar = req.body.actualizar;
    let promises = [];
    if (toActualizar && !res.locals.permisoDenegado) {
        if (!Array.isArray(toActualizar)) {
            toActualizar = [toActualizar]
        }
        toActualizar.forEach(function (element, index) {
            let elementToActualizar;
            let codigo = element.split("_")[element.split("_").length - 1]
            let acronimo = req.body[element]
            elementToActualizar = {}
            switch (element.split("_")[0]) {
                case "departamento":
                    elementToActualizar.acronimo = acronimo;
                    promises.push(models.Departamento.update(
                        elementToActualizar, /* set attributes' value */
                        { where: { codigo: codigo } } /* where criteria */
                    ))
                    break;
                case "plan":
                    elementToActualizar.nombre = acronimo;
                    promises.push(models.PlanEstudio.update(
                        elementToActualizar, /* set attributes' value */
                        { where: { codigo: codigo } } /* where criteria */
                    ))
                    break;
                case "asignatura":
                    elementToActualizar.acronimo = acronimo;
                    codigo = Number(codigo)
                    promises.push(models.Asignatura.update(
                        elementToActualizar, /* set attributes' value */
                        { where: { identificador: codigo } } /* where criteria */
                    ))
                    break;
            }
        });
    } else {

    }
    try{
        await Promise.all(promises)
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/gestion/acronimos?planID=" + planID)
        })
    }
    catch(error) {
        console.log("Error:", error);
        next(error);
    }
}


