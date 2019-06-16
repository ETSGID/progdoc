let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op; 
let estados = require('../estados');
let funciones = require('../funciones');

exports.getGrupos = function (req, res, next) {
    req.session.submenu = "Grupos"
    let view = req.originalUrl.toLowerCase().includes("consultar") ? "gruposConsultar" : "gruposJE"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        res.render(view, {
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: res.locals.planEstudios,
            grupos: null
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] 
        && estados.estadoProgDoc.incidencia !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("gruposJE", {
            estado: "Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: res.locals.planEstudios,
            grupos: null
        })
    } else {
        let cursosConGrupos = [];
        let pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
        //obtengo los cursos que hay en el plan por las asignaturas que tiene el plan
        return models.sequelize.query(query = 'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
            { replacements: { pdID: pdID } }
        ).then(cursos => {
            cursos[0].forEach(function (c) {
                let nuevoCurso = {}
                nuevoCurso.curso = Number(c.curso)
                switch (pdID.split("_")[3]) {
                    case '1S':
                        nuevoCurso.semestres = [{ semestre: 1, grupos: [] }];
                        break;
                    case '2S':
                        nuevoCurso.semestres = [{ semestre: 2, grupos: [] }];
                        break;
                    default:
                        nuevoCurso.semestres = [{ semestre: 1, grupos: [] }, { semestre: 2, grupos: [] }];
                        break;
                }

                cursosConGrupos.push(nuevoCurso);
            })
            return models.Grupo.findAll({
                where: {
                    ProgramacionDocenteId: pdID
                },
                order: [
                    [Sequelize.literal('"nombre"'), 'ASC'],
                ],
                raw: true
            }).each((g) => {
                let curso = cursosConGrupos.find(function (obj) { return obj.curso === g.curso });
                if (curso) {
                    let semestre = curso.semestres.find(function (obj) { return obj.semestre === Number(g.nombre.split(".")[1]) })
                    if (semestre) {
                        semestre.grupos.push(g)
                    }
                }
            })
        })
            .then((grupos) => {
                let nuevopath = "" + req.baseUrl + "/gestionGrupos/guardarGruposJE"
                let cancelarpath = "" + req.baseUrl + "/gestionGrupos/getGrupos?planID=" + req.session.planID
                res.render(view, {
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    nuevopath: nuevopath,
                    cancelarpath: cancelarpath,
                    planID: req.session.planID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    planEstudios: res.locals.planEstudios,
                    grupos: cursosConGrupos,
                    pdID: pdID
                })
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
    }
}

exports.EliminarGruposJE = function (req, res, next) {
    req.session.submenu = "Grupos"
    let planID = req.session.planID;
    let pdID = req.body.pdID;
    let toEliminar = req.body.eliminar;
    let promises = [];
    if (toEliminar && !res.locals.permisoDenegado) {
        let whereEliminar = {};
        let whereEliminar2 = {};
        if (!Array.isArray(toEliminar)) {
            let grupoId = Number(toEliminar.split("_")[1])
            whereEliminar.grupoId = grupoId;
            whereEliminar2.GrupoId = grupoId;
        } else {
            whereEliminar.grupoId = [];
            whereEliminar2.GrupoId = [];
            toEliminar.forEach(function (element, index) {
                let grupoId = Number(element.split("_")[1])
                whereEliminar.grupoId.push(grupoId);
                whereEliminar2.GrupoId.push(grupoId);
            });
        }
        funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
        funciones.isEmpty(whereEliminar2) === true ? whereEliminar2.identificador = "Identificador erróneo" : whereEliminar2 = whereEliminar2;
        //antes de borrarlo de grupos voy a borrarlo de las asignaciones
        models.AsignacionProfesor.destroy({
            where: whereEliminar2
        }).then(() => {
            return models.Grupo.destroy({
                where: whereEliminar
            })
        }).then(() => {
            next();
        }).catch(function (error) {
            console.log("Error:", error);
            next(error);
        });

    } else {
        next();
    }
}

exports.ActualizarGruposJE = function (req, res, next) {
    req.session.submenu = "Grupos"
    let planID = req.session.planID;
    let pdID = req.body.pdID;
    let toActualizar = req.body.actualizar;
    let promises = [];
    if (toActualizar && !res.locals.permisoDenegado) {
        if (!Array.isArray(toActualizar)) {
            let grupoId = Number(toActualizar.split("_")[1])
            let curso = Number(toActualizar.split("_")[3])
            let nombre = toActualizar.split("_")[2]
            let capacidad = Number(req.body['grupo_' + nombre + '_capacidad_'+curso])
            let aula = req.body['grupo_' + nombre + '_aula_'+curso]
            let nombreItinerario = req.body['grupo_' + nombre + '_nombreItinerario_'+curso]
            let nuevaEntrada = {};
            nuevaEntrada.capacidad = capacidad;
            if (isNaN(nuevaEntrada.capacidad)) {
                nuevaEntrada.capacidad = null
            }
            if (aula) {
                nuevaEntrada.aula = aula;
            }
            if (nombreItinerario) {
                nuevaEntrada.nombreItinerario = nombreItinerario;
            }
            promises.push(models.Grupo.update(
                nuevaEntrada, /* set attributes' value */
                { where: { grupoId: grupoId } } /* where criteria */
            ))
        } else {
            let gruposToActualizar = [];
            toActualizar.forEach(function (element, index) {
                let grupoToActualizar;
                let grupoId = Number(element.split("_")[1])
                let curso = Number(element.split("_")[3])
                let nombre = element.split("_")[2]
                let capacidad = Number(req.body['grupo_' + nombre + '_capacidad_'+curso])
                if (isNaN(capacidad)) {
                   capacidad = null
                }
                let aula = req.body['grupo_' + nombre + '_aula_'+curso]
                let nombreItinerario = req.body['grupo_' + nombre + '_nombreItinerario_'+curso]
                grupoToActualizar = {}
                grupoToActualizar.capacidad = capacidad;
                if (aula) {
                    grupoToActualizar.aula = aula;
                }
                if (nombreItinerario) {
                    grupoToActualizar.nombreItinerario = nombreItinerario;
                }
                gruposToActualizar.push(grupoToActualizar)
                promises.push(models.Grupo.update(
                    grupoToActualizar,
                    { where: { grupoId: grupoId } }
                ))
            });
        }
    } else {

    }
    Promise.all(promises).then(() => {
        next();
    }).catch(function (error) {
        console.log("Error:", error);
        next(error);
    });
}


exports.AnadirGruposJE = function (req, res, next) {
    req.session.submenu = "Grupos"
    let planID = req.session.planID;
    let pdID = req.body.pdID;
    let toAnadir = req.body.anadir;
    let gruposToAnadir = [];
    if (toAnadir && !res.locals.permisoDenegado) {
        if (!Array.isArray(toAnadir)) {
            let nombre = toAnadir.split("_")[2];
            let newGrupo = {};
            newGrupo.curso = Number(toAnadir.split("_")[3]);
            newGrupo.nombre = nombre;
            newGrupo.capacidad = Number(req.body['grupo_' + nombre + '_capacidad_'+newGrupo.curso]);
            if (isNaN(newGrupo.capacidad)) {
                newGrupo.capacidad = null
            }
            newGrupo.curso = Number(toAnadir.split("_")[3]);
            newGrupo.aula = req.body['grupo_' + nombre + '_aula_'+newGrupo.curso];
            newGrupo.nombreItinerario = req.body['grupo_' + nombre + '_nombreItinerario_'+newGrupo.curso]
            newGrupo.ProgramacionDocenteId = pdID;
            gruposToAnadir.push(newGrupo)
        } else {
            toAnadir.forEach(function (element, index) {
                let nombre = element.split("_")[2]
                let newGrupo = {};
                newGrupo.curso = Number(element.split("_")[3]);
                newGrupo.nombre = nombre;
                newGrupo.capacidad = Number(req.body['grupo_' + nombre + '_capacidad_'+newGrupo.curso]);
                if (isNaN(newGrupo.capacidad)) {
                    newGrupo.capacidad = null
                }
                newGrupo.aula = req.body['grupo_' + nombre + '_aula_'+newGrupo.curso];
                newGrupo.nombreItinerario = req.body['grupo_' + nombre + '_nombreItinerario_'+newGrupo.curso]
                newGrupo.ProgramacionDocenteId = pdID;
                gruposToAnadir.push(newGrupo)
            });
        }
        models.Grupo.bulkCreate(
            gruposToAnadir
        ).then(() => {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/gestionGrupos/getGrupos?planID=" + planID)
            })
        }).catch(function (error) {
            console.log("Error:", error);
            next(error);
        });
    } else {
        req.session.save(function () {
        res.redirect("" + req.baseUrl + "/gestionGrupos/getGrupos?planID=" + planID)
        })
    }

}


