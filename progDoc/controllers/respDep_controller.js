let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');
let JEcontroller = require('./JE_controller')
let enumsPD = require('../enumsPD');
let menuProgDocController = require('../controllers/menuProgDoc_controller')


// GET /respDoc/:pdID/:departamentoID
exports.getAsignaciones = function (req, res, next) {
    req.session.submenu = "Profesores"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionesConsultar" : "asignacionesCumplimentar"
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosProfesor: estados.estadoProfesor,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: res.locals.planEstudios
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (!comprobarEstadoCumpleUno(estados.estadoProfesor.abierto, res.locals.progDoc['ProgramacionDocentes.estadoProfesores'])
        && !comprobarEstadoCumpleUno(estados.estadoProfesor.aprobadoResponsable, res.locals.progDoc['ProgramacionDocentes.estadoProfesores'])
        && res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("asignacionesCumplimentar", {
            contextPath: app.contextPath,
            estado: "Asignación de profesores ya se realizó",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosProfesor: estados.estadoProfesor,
            estadosProgDoc: estados.estadoProgDoc,
            estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
            planEstudios: res.locals.planEstudios
        })
    } else {
        let asignacion = [];
        let gruposBBDD = res.locals.grupos;
        let pdID = req.session.pdID
        let departamentoID = req.session.departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });
        if (!departamentoExisteEnElPlan) {
            let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionesConsultar" : "asignacionesCumplimentar"
            res.render(view, {
                contextPath: app.contextPath,
                estado: "El departamento seleccionado no es responsable de ninguna asignatura del plan, por favor escoja otro departamento en el cuadro superior",
                permisoDenegado: res.locals.permisoDenegado,
                profesores: null,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                departamentoID: req.session.departamentoID,
                departamentosResponsables: res.locals.departamentosResponsables,
                estadosProfesor: estados.estadoProfesor,
                estadosProgDoc: estados.estadoProgDoc,
                estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                planEstudios: res.locals.planEstudios
            })
        }
        else {
            if (res.locals.permisoDenegado) {
                let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionesConsultar" : "asignacionesCumplimentar"
                res.render(view, {
                    contextPath: app.contextPath,
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,
                    asignacion: null,
                    profesores: null,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    estadosProfesor: estados.estadoProfesor,
                    estadosProgDoc: estados.estadoProgDoc,
                    estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                    planEstudios: res.locals.planEstudios
                })
            }
            else {
                let profesores = [];
                return menuProgDocController.getProfesores()
                    .then(function (profesors) {
                        profesores = profesors;
                        return getAsignacion(pdID, departamentoID, profesores, pdID, gruposBBDD);
                    })
                    .then(function (asignacions) {
                        asignacion = asignacions
                        let nuevopath = "" + req.baseUrl + "/respdoc/editAsignacion"
                        let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionesConsultar" : "asignacionesCumplimentar"
                        res.render(view,
                            {
                                contextPath: app.contextPath,
                                profesores: profesores,
                                asignacion: asignacion,
                                nuevopath: nuevopath,
                                aprobarpath: "" + req.baseUrl + "/respDoc/aprobarAsignacion",
                                planID: req.session.planID,
                                estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                                pdID: pdID,
                                menu: req.session.menu,
                                submenu: req.session.submenu,
                                estado: null,
                                permisoDenegado: res.locals.permisoDenegado,
                                departamentoID: req.session.departamentoID,
                                departamentosResponsables: res.locals.departamentosResponsables,
                                estadosProfesor: estados.estadoProfesor,
                                estadosProgDoc: estados.estadoProgDoc,
                                planEstudios: res.locals.planEstudios
                            })
                    })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            }
        }

    }

}

// GET respDoc/editAsignacion:pdID/:departamentoID/:acronimo
exports.editAsignacion = function (req, res, next) {
    req.session.submenu = "Profesores"
    let pdID = req.session.pdID
    let departamentoID = req.session.departamentoID
    let asignacion = [];
    let gruposBBDD = res.locals.grupos;
    //por defecto es acronimo pero si no hay debe ser el nombre
    let acronimo = req.query.acronimo
    if (!res.locals.permisoDenegado) {
        let profesores = [];
        return menuProgDocController.getProfesores()
            .then(function (profesors) {
                profesores = profesors;
                return getAsignacion(pdID, departamentoID, profesores, pdID, gruposBBDD);
            })
            .then(function (asignacions) {
                asignacion = asignacions
                let asign = asignacion.find(function (obj) { return (obj.acronimo === acronimo || obj.nombre === acronimo); });
                res.render('asignacionesCumplimentarAsignatura',
                    {
                        contextPath: app.contextPath,
                        asign: asign,
                        pdID: pdID,
                        cancelarpath: "" + req.baseUrl + "/respDoc/profesores?planID=" + req.session.planID + "&departamentoID=" + departamentoID,
                        nuevopath: "" + req.baseUrl + "/respDoc/guardarAsignacion",
                        planID: req.session.planID,
                        departamentoID: req.session.departamentoID,
                        menu: req.session.menu,
                        submenu: req.session.submenu,
                        profesores: profesores,
                        estadosProfesor: estados.estadoProfesor,
                        estadosProgDoc: estados.estadoProgDoc,
                        estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                        planEstudios: res.locals.planEstudios
                    })
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
    } else {
        req.session.save(function () {
        res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planID=" + planID)
        })
    }


}

function getAsignacion(ProgramacionDocenteIdentificador, DepartamentoResponsable, profesores, pdID, gruposBBDD, asignatura) {
    let asignacion = [];
    return models.Asignatura.findAll({
        where: {
            //se obtendrá con req D510 1
            ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
            DepartamentoResponsable: DepartamentoResponsable,
            semestre: {
                [op.ne]: null,
            }
        },
        attributes: ['acronimo', 'curso', 'CoordinadorAsignatura', 'identificador', 'nombre', 'semestre'],
        order: [

            [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
            [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
            [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC']
        ],
        raw: true,
        include: [{
            //left join 
            model: models.AsignacionProfesor,
            required: false,
            attributes: ['ProfesorId', 'GrupoId', 'identificador', 'Dia', 'Nota'],
            include: [{
                model: models.Grupo,
                attributes: ['nombre', 'nombreItinerario'],
            }]
        }]
    })
        .each(function (ej) {
            let asign = asignacion.find(function (obj) { return obj.nombre === ej['nombre']; });
            if (!asign) {
                asign = {}
                let obj = profesores.find(function (obj) { return obj.identificador === ej['CoordinadorAsignatura']; });
                if (!obj) {
                    obj = "No hay coordinador"
                }
                asign.acronimo = ej.acronimo;
                asign.nombre = ej.nombre
                asign.identificador = ej.identificador
                asign.curso = ej.curso;
                asign.coordinador = obj
                asign.grupos = [];
                let s1;
                let s2;
                switch (pdID.split("_")[3]) {
                    case '1S':
                        s1 = (ej.semestre === '1S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                        s2 = false;
                        break;
                    case '2S':
                        s1 = false;
                        s2 = (ej.semestre === '2S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                        break;
                    default:
                        s1 = (ej.semestre === '1S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                        s2 = (ej.semestre === '2S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                        break;
                }
                let coincidenciasGrupos = [];
                if (s1) {
                    coincidenciasGrupos = gruposBBDD.filter(
                        gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                    );
                }
                if (s2) {
                    coincidenciasGrupos = coincidenciasGrupos.concat(gruposBBDD.filter(
                        gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                    ));

                }
                for (let i = 0; i < coincidenciasGrupos.length; i++) {
                    let grupo = {};
                    grupo.GrupoNombre = coincidenciasGrupos[i].nombre
                    grupo.nombreItinerario = coincidenciasGrupos[i].nombreItinerario
                    grupo.grupoPerteneciente = false;
                    grupo.GrupoId = coincidenciasGrupos[i].grupoId
                    grupo.profesors = [];
                    asign.grupos.push(grupo)
                }
                asignacion.push(asign);
                asign = asignacion.find(function (obj) { return obj.nombre === ej['nombre']; });
            }
            let grupo = asign['grupos'].find(function (obj) { return obj.GrupoId === ej["AsignacionProfesors.GrupoId"]; });
            if (grupo) {
                if (ej["AsignacionProfesors.Dia"] || ej["AsignacionProfesors.Nota"]) {
                    grupo.grupoPerteneciente = true;
                }
                let profi = profesores.find(function (obj) { return obj.identificador === ej["AsignacionProfesors.ProfesorId"]; });
                if (profi) {
                    let p = {};
                    p.identificador = profi.identificador;
                    p.nombre = profi.nombre;
                    p.nombreCorregido = profi.nombreCorregido;
                    p.asignacion = ej["AsignacionProfesors.identificador"]
                    grupo.profesors.push(p)
                    grupo.profesors.sort(funciones.sortProfesorCorregido)
                }
            }
        })
        .then(function () {
            return asignacion;
        })
}

//POST respDoc/guardarAsignacion
exports.guardarAsignacion = function (req, res, next) {
    req.session.submenu = "Profesores"
    let whereEliminar = {};
    let profesores = [];
    let coordinador;
    let identificador = Number(req.body.asignaturaId)
    let pdID = req.session.pdID
    let planID = req.session.planID
    let departamentoID = req.session.departamentoID
    let profesoresAnadidos = res.profesoresAnadidos
    return menuProgDocController.getProfesores()
        .then(function (profesors) {
            profesores = profesors;
            coordinador = profesores.find(function (obj) { return obj.nombre === req.body.coordinador; });
            //la 
            return models.Asignatura.findAll(
                {
                    where: {
                        identificador: identificador,
                        ProgramacionDocenteIdentificador: pdID
                    },
                    attributes: ["identificador", "DepartamentoResponsable"],
                    include: [{
                        //incluye las asignaciones de profesores y los horarios.
                        model: models.AsignacionProfesor,
                        //left join
                        required: false
                    }],
                    raw: true
                })
        })
        .then(function (as) {
            //que es la progdoc correspondiente ya se ve en que debe de estar abierta / incidencia en el modulo de permisos
            if (!as[0] || !as[0].DepartamentoResponsable || as[0].DepartamentoResponsable !== departamentoID) {
                res.locals.permisoDenegado = "No tiene permiso contacte con el Jefe de Estudios si debería tenerlo" //lo unico que hara será saltarse lo siguiente 
            }
            if (!res.locals.permisoDenegado) {
                if (coordinador) {
                    models.Asignatura.update(
                        { CoordinadorAsignatura: coordinador.identificador }, /* set attributes' value */
                        { where: { identificador: identificador } } /* where criteria */
                    ).then(() => {
                        paso2();
                    })
                        .catch(function (error) {
                            console.log("Error:", error);
                            next(error);
                        });
                } else {
                    paso2();
                }
                function paso2() {
                    let toEliminar = req.body.eliminar
                    if (toEliminar) {
                        //hago esto para comprobar que la condicion para borrar es que paso un id no otra condición, y además debo pasar un número. Además si le pasa algo a null nunca voy a tener la condición
                        if (!Array.isArray(toEliminar)) {
                            let asignacion = Number(toEliminar.split("_")[2])
                            let asig = as.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                            if (!asig || !asig['AsignacionProfesors.ProfesorId']) {
                                console.log("Intenta cambiar una nota o un horario")
                            } else {
                                whereEliminar.identificador = asignacion;
                            }
                        } else {
                            whereEliminar.identificador = [];
                            toEliminar.forEach(function (element, index) {
                                let asignacion = Number(element.split("_")[2])
                                let asig = as.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                                if (!asig || !asig['AsignacionProfesors.ProfesorId']) {
                                    console.log("Intenta cambiar una nota o un horario")
                                } else {
                                    whereEliminar.identificador.push(asignacion);
                                }
                            });
                        }
                        funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                        models.AsignacionProfesor.destroy({
                            where: whereEliminar
                        }).then(() => {
                            paso3();
                        })
                            .catch(function (error) {
                                console.log("Error:", error);
                                next(error);
                            });
                    } else {
                        paso3();
                    }

                    function paso3() {

                        let toAnadir = req.body.anadir;
                        let queryToAnadir = []
                        if (toAnadir) {
                            if (!Array.isArray(toAnadir)) {
                                let profesor = toAnadir.split("_")[3]
                                if (isNaN(profesor)) {
                                    //le paso el correo en el caso que sea un profesor que se acaba de añadir.
                                    let p = profesoresAnadidos.find(function (obj) { return obj.correo === toAnadir.split("_")[4] });
                                    if (p) {
                                        profesor = p.ProfesorId;
                                    }
                                }
                                let nuevaEntrada = {};
                                nuevaEntrada.AsignaturaId = identificador;
                                nuevaEntrada.ProfesorId = profesor;
                                if (!isNaN(toAnadir.split("_")[2])) {
                                    nuevaEntrada.GrupoId = Number(toAnadir.split("_")[2]);
                                }
                                queryToAnadir.push(nuevaEntrada);
                            } else {
                                toAnadir.forEach(function (element, index) {
                                    let profesor = element.split("_")[3]
                                    if (isNaN(profesor)) {
                                        //le paso el correo en el caso que sea un profesor que se acaba de añadir.
                                        let p = profesoresAnadidos.find(function (obj) { return obj.correo === element.split("_")[4] });
                                        if (p) {
                                            profesor = p.ProfesorId;
                                        }
                                    }
                                    let nuevaEntrada = {};
                                    nuevaEntrada.AsignaturaId = identificador;
                                    if (!isNaN(element.split("_")[2])) {
                                        nuevaEntrada.GrupoId = Number(element.split("_")[2]);
                                    }
                                    nuevaEntrada.ProfesorId = profesor;
                                    queryToAnadir.push(nuevaEntrada);
                                });
                            }
                        }
                        return models.AsignacionProfesor.bulkCreate(
                            queryToAnadir
                        ).then(() => { // Notice: There are no arguments here, as of right now you'll have to...
                            req.session.save(function () {
                            res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planID=" + planID)
                            })
                        })
                            .catch(function (error) {
                                console.log("Error:", error);
                                next(error);
                            });

                    }
                }
            } else {
                req.session.save(function () {
                res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planID=" + planID)
                })
            }
        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });

}
// post respDoc/aprobarAsignacion:pdID
exports.aprobarAsignacion = function (req, res, next) {
    let pdID = req.session.pdID;
    let departamentoID = req.session.departamentoID;
    let date = new Date();
    let planID = req.session.planID;
    let estadoProfesores;
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoProfesores"] }).then(function (pd) {
        estadoProfesores = pd['estadoProfesores']
        if (!res.locals.permisoDenegado) {
            switch (estadoProfesores[departamentoID]) {
                case (estados.estadoProfesor.abierto):
                    estadoProfesores[departamentoID] = estados.estadoProfesor.aprobadoResponsable;
                    break;
                case (estados.estadoProfesor.aprobadoResponsable):
                    req.body.decision !== 'aceptar' ? estadoProfesores[departamentoID] = estados.estadoProfesor.abierto : estadoProfesores[departamentoID] = estados.estadoProfesor.aprobadoDirector
                    break;
            }

            return models.ProgramacionDocente.update(
                {
                    estadoProfesores: estadoProfesores,
                    fechaProfesores: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            ).then(() => {
                req.session.save(function () {
                JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/profesores"))
                })
            })
        } else {
            req.session.save(function () {
            JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/profesores"))
            })
        }

    })

}

// GET respDoc/tribunales:pdID/:departamentoID
exports.getTribunales = function (req, res, next) {
    req.session.submenu = "Tribunales"

    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunalesConsultar" : "tribunalesCumplimentar"
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosTribunal: estados.estadoTribunal,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: res.locals.planEstudios
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (!comprobarEstadoCumpleUno(estados.estadoTribunal.abierto, res.locals.progDoc['ProgramacionDocentes.estadoTribunales'])
        && !comprobarEstadoCumpleUno(estados.estadoTribunal.aprobadoResponsable, res.locals.progDoc['ProgramacionDocentes.estadoTribunales'])
        && res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("tribunalesCumplimentar", {
            contextPath: app.contextPath,
            estado: "Asignación de tribunales ya se realizó",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosTribunal: estados.estadoTribunal,
            estadosProgDoc: estados.estadoProgDoc,
            estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
            planEstudios: res.locals.planEstudios
        })
    }
    else {

        let pdID = req.session.pdID
        let departamentoID = req.session.departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });
        if (!departamentoExisteEnElPlan) {
            let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunalesConsultar" : "tribunalesCumplimentar"
            res.render(view, {
                contextPath: app.contextPath,
                estado: "El departamento seleccionado no es responsable de ninguna asignatura del plan, por favor escoja otro departamento en el cuadro superior",
                permisoDenegado: res.locals.permisoDenegado,
                profesores: null,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                departamentoID: req.session.departamentoID,
                departamentosResponsables: res.locals.departamentosResponsables,
                estadosTribunal: estados.estadoTribunal,
                estadosProgDoc: estados.estadoProgDoc,
                estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                planEstudios: res.locals.planEstudios
            })
        } else {
            if (res.locals.permisoDenegado) {
                let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunalesConsultar" : "tribunalesCumplimentar"
                res.render(view, {
                    contextPath: app.contextPath,
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,
                    profesores: null,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    estadosTribunal: estados.estadoTribunal,
                    estadosProgDoc: estados.estadoProgDoc,
                    estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                    planEstudios: res.locals.planEstudios
                })
            }
            else {
                let profesores = [];
                return menuProgDocController.getProfesores()
                    .then((profesors) => {
                        profesores = profesors;
                        getMiembrosTribunal(pdID, departamentoID, profesores);
                    })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            }

            function getMiembrosTribunal(ProgramacionDocenteIdentificador, DepartamentoResponsable, profesores) {
                req.session.submenu = "Tribunales"
                models.Asignatura.findAll({
                    where: {
                        //se obtendrá con req D510 1
                        ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
                        DepartamentoResponsable: DepartamentoResponsable
                    },
                    attributes: ['acronimo', 'nombre', 'curso', 'semestre', 'identificador', 'PresidenteTribunalAsignatura', 'VocalTribunalAsignatura', 'SecretarioTribunalAsignatura', 'SuplenteTribunalAsignatura'],
                    order: [

                        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                        [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
                        [Sequelize.literal('"Asignatura"."acronimo"'), 'ASC'],
                        [Sequelize.literal('"Asignatura"."nombre"'), 'ASC']

                    ],
                    raw: true,
                })
                    .each(function (ej) {
                        let presidente = profesores.find(function (obj) { return obj.identificador === ej['PresidenteTribunalAsignatura']; });
                        if (presidente) {
                            ej.presidenteNombre = presidente.nombreCorregido
                        }
                        let vocal = profesores.find(function (obj) { return obj.identificador === ej['VocalTribunalAsignatura']; });
                        if (vocal) {
                            ej.vocalNombre = vocal.nombreCorregido
                        }
                        let secretario = profesores.find(function (obj) { return obj.identificador === ej['SecretarioTribunalAsignatura']; });
                        if (secretario) {
                            ej.secretarioNombre = secretario.nombreCorregido
                        }
                        let suplente = profesores.find(function (obj) { return obj.identificador === ej['SuplenteTribunalAsignatura']; });
                        if (suplente) {
                            ej.suplenteNombre = suplente.nombreCorregido
                        }
                        ej.tribunalId = ej['identificador'];


                    })
                    .then(function (e) {
                        let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunalesConsultar" : "tribunalesCumplimentar"
                        let nuevopath = "" + req.baseUrl + "/respdoc/guardarTribunales"
                        let cancelarpath = "" + req.baseUrl + "/respdoc/tribunales?planID=" + req.session.planID + "&departamentoID=" + DepartamentoResponsable
                        res.render(view,
                            {
                                contextPath: app.contextPath,
                                profesores: profesores,
                                tribunales: e,
                                nuevopath: nuevopath,
                                aprobarpath: "" + req.baseUrl + "/respDoc/aprobarTribunales",
                                cancelarpath: cancelarpath,
                                planID: req.session.planID,
                                estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                                pdID: pdID,
                                submenu: req.session.submenu,
                                menu: req.session.menu,
                                estado: null,
                                permisoDenegado: res.locals.permisoDenegado,
                                departamentoID: req.session.departamentoID,
                                departamentosResponsables: res.locals.departamentosResponsables,
                                estadosTribunal: estados.estadoTribunal,
                                estadosProgDoc: estados.estadoProgDoc,
                                planEstudios: res.locals.planEstudios
                            })
                    }).catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            }
        }
    }
}

//POST respDoc/guardarTribunales
exports.guardarTribunales = function (req, res, next) {
    req.session.submenu = "Tribunales"
    let planID = req.session.planID;
    let departamentoID = req.session.departamentoID;
    let pdID = req.session.pdID;
    let toActualizar = req.body.actualizar;
    let profesoresAnadidos = res.profesoresAnadidos;
    
    if (toActualizar && !res.locals.permisoDenegado) {
        //debo de comprobar que estoy cambiando asignaturas de mi pd
        return models.Asignatura.findAll(
            {
                where: {
                    ProgramacionDocenteIdentificador: pdID
                },
                attributes: ["identificador", "DepartamentoResponsable"],
                raw: true
            })
            .then(function (as) {
                if (!Array.isArray(toActualizar)) {
                    let tribunalId = Number(toActualizar.split("_")[0])
                    let asig = as.find(function (obj) { return (tribunalId && obj.identificador === tribunalId) })
                    if (!asig || !asig.DepartamentoResponsable || asig.DepartamentoResponsable !== departamentoID) {
                        next();
                    } else {
                        let profesorIdentificador = toActualizar.split("_")[1]
                        if (isNaN(profesorIdentificador)){
                            //le paso el correo en el caso que sea un profesor que se acaba de añadir.
                            let p = profesoresAnadidos.find(function (obj) { return obj.correo === toActualizar.split("_")[3] });
                            if(p){
                                profesorIdentificador = p.ProfesorId;
                            }
                        }
                        let puestoTribunal = toActualizar.split("_")[2] + "TribunalAsignatura"
                        let nuevaEntrada = {};
                        nuevaEntrada[puestoTribunal] = profesorIdentificador;
                        return models.Asignatura.update(
                            nuevaEntrada, /* set attributes' value */
                            { where: { identificador: tribunalId } } /* where criteria */
                        ).then(() => {
                            next();
                        })
                    }
                } else {
                    let promises = [];
                    let tribunalesToActualizar = [];
                    toActualizar.forEach(function (element, index) {
                        let tribunalToActualizar;
                        let tribunalId = Number(element.split("_")[0])
                        let asig = as.find(function (obj) { return (tribunalId && obj.identificador === tribunalId) })
                        if (!asig || !asig.DepartamentoResponsable || asig.DepartamentoResponsable !== departamentoID) {
                            console.log("Ha intentado cambiar una asignatura que no puede")
                        } else {
                            let profesorIdentificador = element.split("_")[1]
                            if (isNaN(profesorIdentificador)) {
                                //le paso el correo en el caso que sea un profesor que se acaba de añadir.
                                let p = profesoresAnadidos.find(function (obj) { return obj.correo === element.split("_")[3] });
                                if (p) {
                                    profesorIdentificador = p.ProfesorId;
                                }
                            }
                            let puestoTribunal = element.split("_")[2] + "TribunalAsignatura"
                            tribunalToActualizar = tribunalesToActualizar.find(function (obj) { return obj.identificador === tribunalId; });
                            if (tribunalToActualizar) {
                                tribunalToActualizar.puestos[puestoTribunal] = profesorIdentificador;
                            }
                            else {
                                tribunalToActualizar = {}
                                tribunalToActualizar.identificador = tribunalId;
                                tribunalToActualizar.puestos = {}
                                tribunalToActualizar.puestos[puestoTribunal] = profesorIdentificador
                                tribunalesToActualizar.push(tribunalToActualizar)
                            }
                        }
                    });
                    tribunalesToActualizar.forEach(function (element, index) {
                        promises.push(models.Asignatura.update(
                            tribunalesToActualizar[index].puestos,
                            { where: { identificador: tribunalesToActualizar[index].identificador } }
                        ))

                    })

                    return Promise.all(promises).then(() => {
                        next()
                    });

                }

            })

    } else {
        next()
    }
}

//get
exports.reenviar = function (req, res, next) {
    req.session.save(function () {
    res.redirect("" + req.baseUrl + "/respDoc/tribunales?departamentoID=" + req.session.departamentoID + "&planID=" + req.session.planID)
    })
}
// post respDoc/aprobarTribunales:pdID
exports.aprobarTribunales = function (req, res, next) {
    let pdID = req.session.pdID;
    let departamentoID = req.session.departamentoID;
    let date = new Date();
    let planID = req.session.planID;
    let estadoTribunales;
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoTribunales"] }).then(function (pd) {
        estadoTribunales = pd['estadoTribunales']
        if (!res.locals.permisoDenegado) {
            switch (estadoTribunales[departamentoID]) {
                case (estados.estadoTribunal.abierto):
                    estadoTribunales[departamentoID] = estados.estadoTribunal.aprobadoResponsable;
                    break;
                case (estados.estadoTribunal.aprobadoResponsable):
                    req.body.decision !== 'aceptar' ? estadoTribunales[departamentoID] = estados.estadoTribunal.abierto : estadoTribunales[departamentoID] = estados.estadoTribunal.aprobadoDirector
                    break;
            }

            return models.ProgramacionDocente.update(
                {
                    estadoTribunales: estadoTribunales,
                    fechaTribunales: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            ).then(() => {
                req.session.save(function () {
                JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/tribunales"))
                })
            })
        } else {
            req.session.save(function () {
            JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/tribunales"))
            })
        }

    })
}

//funcion para ver el estado de profesores o tribunales si cumple uno el resto lo marca como cumplido
function comprobarEstadoCumpleUno(estado, objeto) {
    for (variable in objeto) {
        if (objeto[variable] === estado) {
            return true;
        }
    }
    return false;
}

