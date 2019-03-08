let app = require('../app');
let models = require('../models');
let funciones = require('../funciones');
let estados = require('../estados');
//en res.locals.asignaturas tendre todas las asignaturas de la pd
exports.getAcronimos = function (req, res, next) {
    let nuevopath = "" + req.baseUrl + "/gestionAcronimos/guardarAcronimosJE"
    let asignaturasPorCursos = {};
    req.session.submenu = "Acronimos"
    if (!res.locals.progDoc || !res.locals.departamentosResponsables ||
        (estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']) 
        && estados.estadoProgDoc.incidencia !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']) {
        res.render("acronimosJE", {
            contextPath: app.contextPath,
            estado: "Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            planEstudios: res.locals.planEstudios,
            nuevopath: nuevopath,
            departamentos: res.locals.departamentos.sort(funciones.sortDepartamentos),
            asignaturasPorCursos: null,
        })
    }else{
        let pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
        if (res.locals.asignaturas) {
            res.locals.asignaturas.forEach(function (as) {
                if (asignaturasPorCursos[as.curso] == null) {
                    asignaturasPorCursos[as.curso] = [];
                }
                asignaturasPorCursos[as.curso].push(as);
            });
        }
        res.render("acronimosJE", {
            contextPath: app.contextPath,
            estado: null,
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            planEstudios: res.locals.planEstudios,
            nuevopath: nuevopath,
            asignaturas: asignaturasPorCursos,
            departamentos: res.locals.departamentos,
            pdID: pdID
        })

    }
}

//guardar acrónimos departamento
exports.actualizarAcronimos = function (req, res, next) {
    req.session.submenu = "Acronimos"
    let planID = req.session.planID;
    let toActualizar = req.body.actualizar;
    let promises = [];
    if (toActualizar && !res.locals.permisoDenegado) {
        if (!Array.isArray(toActualizar)) {
            let codigo = toActualizar.split("_")[toActualizar.split("_").length-1]
            let acronimo = req.body[toActualizar]           
            let nuevaEntrada = {};
            switch (toActualizar.split("_")[0]){
                case "departamento":
                    nuevaEntrada.acronimo = acronimo;
                    promises.push(models.Departamento.update(
                        nuevaEntrada, /* set attributes' value */
                        { where: { codigo: codigo } } /* where criteria */
                ))
                    break;
                case "plan":
                    nuevaEntrada.nombre = acronimo;
                    promises.push(models.PlanEstudio.update(
                        nuevaEntrada, /* set attributes' value */
                        { where: { codigo: codigo } } /* where criteria */
                    ))
                    break;
                case "asignatura":              
                    codigo = Number(codigo)
                    nuevaEntrada.acronimo = acronimo;
                    promises.push(models.Asignatura.update(
                        nuevaEntrada, /* set attributes' value */
                        { where: { identificador: codigo } } /* where criteria */
                    ))
                    
                    break;
                default:
                    break;
            }
        } else { 
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
        }
    } else {

    }
    Promise.all(promises).then(() => {
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/gestion/acronimos?planID=" + planID)
        })
    }).catch(function (error) {
        console.log("Error:", error);
        next(error);
    });
}


