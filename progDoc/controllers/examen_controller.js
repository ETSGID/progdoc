let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let funciones = require('../funciones');
let JEcontroller = require('./JE_controller')
let json2csv = require('json2csv').parse;
let menuProgDocController = require('./menuProgDoc_controller')
const fs = require('fs')
const path = require('path')


//funcion que devuelve las franjas de examenes pasandole la pdID
exports.getFranjas = function (req, res, next) {
    let franjasExamen = [];
    if (req.session.pdID) {
        return getFranjasExamenes(req.session.pdID)
        .then((franjasExamen) => {
            res.locals.franjasExamen = franjasExamen
            next();
        }).catch(function (error) {
            console.log("Error:", error);
            next(error);
        });
    } else {
        next()
    }

}

function getFranjasExamenes (pdID){
    let franjasExamen = [];
        let tipo = menuProgDocController.getTipoPd(pdID)
        switch (tipo) {
            case '1S':
                franjasExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre", franjas: [] })
                franjasExamen.push({ periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre", franjas: [] })
                break;
            case '2S':
                franjasExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre", franjas: [] })
                franjasExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre", franjas: [] })
                break;
            case 'I':
                franjasExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre", franjas: [] })
                franjasExamen.push({ periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre", franjas: [] })
                franjasExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre", franjas: [] })
                franjasExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre", franjas: [] })
                break;
        }
        return models.FranjaExamen.findAll({
            where: {
                ProgramacionDocenteId: pdID,
            },
            order: [
                [Sequelize.literal('"FranjaExamen"."periodo"'), 'ASC'],
                [Sequelize.literal('"FranjaExamen"."horaInicio"'), 'ASC'],
            ],
        }).each(function (franja) {
            let f = franjasExamen.find(function (obj) { return obj.periodo === franja['periodo']; });
            //si la franja no está la añado
            if (f) {
                f["franjas"].push(franja)
            }
        }).then(() => {
            return franjasExamen
        })
}
exports.getFranjasExamenes = getFranjasExamenes;

exports.getExamenes = function(req,res,next){
    let asignacionsExamen = []; //asignaciones existentes
    if (req.session.pdID) {
        let pdID = req.session.pdID
        let anoFinal = 2000 + Number(pdID.split("_")[2][4] + "" + pdID.split("_")[2][5])
        switch (menuProgDocController.getTipoPd(req.session.pdID)) {
            case "I":
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre (Enero " + anoFinal + ")", asignaturas: [] })
                asignacionsExamen.push({
                    periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre (Julio " + anoFinal + ")", asignaturas: []
                })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre  (Junio " + anoFinal + ")", asignaturas: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre (Julio " + anoFinal + ")", asignaturas: [] })
                break;
            case "1S":
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre (Enero " + anoFinal + ")", asignaturas: [] })
                asignacionsExamen.push({
                    periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre (Julio " + anoFinal + ")", asignaturas: []
                })
                break;
            case "2S":
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre  (Junio " + anoFinal + ")", asignaturas: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre (Julio " + anoFinal + ")", asignaturas: [] })
                break;
            default:
                break;
        }
        let cursos = []; //array con los cursos por separado
        let asignaturas = []; //array con los acronimos de las asignaturas por separado
        //sino se especifica departamento se queda con el primero del plan responsable. Arriba comprobé que existe el departamento en la pos 0.
        let departamentoID;
        if (res.locals.departamentosResponsables && res.locals.departamentosResponsables.length > 0) {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        } else {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : null;
        }
        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        return getAsignacionExamen(pdID);
        function getAsignacionExamen(ProgramacionDocenteIdentificador) {
            //busco las asignaturas con departamento responsable ya que son las que entran en los exámenes
            return models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdID,
                    DepartamentoResponsable: {
                        [op.ne]: null,
                    }
                },
                attributes: ['acronimo', 'curso', 'identificador', 'nombre', 'semestre', 'codigo','DepartamentoResponsable'],
                order: [

                    [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                    [Sequelize.literal('"Examens.periodo"'), 'ASC']
                ],
                raw: true,
                include: [{
                    //left join 
                    model: models.Examen,
                    required: false
                }]
            })
                .each(function (ej) {
                    //lo convierto en string
                    let cPos = cursos.map(function (x) { return x.curso; }).indexOf(ej.curso);
                    let c = cursos.find(function (obj) { return obj === ej['curso']; });
                    //si el curso no está lo añado
                    if (!c) {
                        cursos.push(ej['curso'])
                        cPos = cursos.map(function (x) { return x.curso; }).indexOf(ej.curso);
                        c = cursos.find(function (obj) { return obj === ej['curso']; });
                    }

                    //busco si la asignatura está en los periodos que debería y si no está la añado.
                    switch (ej.semestre) {
                        case '1S':
                            buscarOCrear(ej, enumsPD.periodoPD.S1_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S1_E)
                            break;
                        case '2S':
                            buscarOCrear(ej, enumsPD.periodoPD.S2_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_E)
                            break;
                        case '1S-2S':
                            buscarOCrear(ej, enumsPD.periodoPD.S1_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S1_E)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_E)
                            break;
                        case 'A':
                            buscarOCrear(ej, enumsPD.periodoPD.S1_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S1_E)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_E)
                            break;
                        case 'I':
                            buscarOCrear(ej, enumsPD.periodoPD.S1_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S1_E)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_O)
                            buscarOCrear(ej, enumsPD.periodoPD.S2_E)
                            break;
                        default:
                            break;
                    }
                    function buscarOCrear(asignatura, periodo) {
                        let p = asignacionsExamen.find(function (obj) { return obj.periodo === periodo; });
                        if (p) {
                            let asign = p.asignaturas.find(function (x) { return x.identificador === asignatura.identificador; })
                            if (!asign) {
                                let a = {};
                                a.acronimo = asignatura.acronimo;
                                a.identificador = asignatura.identificador;
                                a.curso = asignatura.curso;
                                a.nombre = asignatura.nombre;
                                a.departamentoResponsable = asignatura.DepartamentoResponsable
                                a.semestre = asignatura.semestre;
                                a.codigo = asignatura.codigo;
                                a.examen = {};
                                a.examen.identificador = null;
                                a.examen.fecha = null;
                                a.examen.horaInicio = null;
                                a.examen.duracion = null;
                                a.examen.aulas = [];
                                p.asignaturas.push(a);
                                p.asignaturas.sort(funciones.sortAsignaturasCursoNombre)
                            }
                        }
                    }
                    let periodoExamen = ej['Examens.periodo']
                    let p = asignacionsExamen.find(function (obj) { return obj.periodo === periodoExamen; });
                    if (p) {
                        let asign = p.asignaturas.find(function (x) { return x.identificador === ej.identificador; })
                        if (asign) {
                            asign.examen.identificador = ej['Examens.identificador'];
                            asign.examen.fecha = ej['Examens.fecha'];
                            asign.examen.horaInicio = ej['Examens.horaInicio'];
                            asign.examen.duracion = ej['Examens.duracion'];
                            asign.examen.aulas = ej['Examens.aulas'];
                        }

                    }
                })
                .then(() => {
                    res.locals.cursos = cursos
                    res.locals.asignacionsExamen = asignacionsExamen
                    next()
                })
                .catch(function (error) {
                    console.log("Error:", error);
                    next(error);
                });
        }
    }else{
        next();
    }
}


exports.getExamenesView = function (req, res, next) {

    req.session.submenu = "Examenes"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc. Ojo también comprueba que no esté en incidencia para el JE
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "examenesConsultar" : "examenesCumplimentar"
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            asignacionsExamen: null,
            franjasExamen: null,
            periodosExamen: null,
            cursos: null,
            pdID: null,
            estadosProgDoc: null,
            estadoProgDoc: null
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (estados.estadoExamen.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoExamenes']
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("examenesCumplimentar", {
            contextPath: app.contextPath,
            estado: "Asignación de exámenes ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y el Jefe de Estudios la apruebe",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            estadoExamenes: res.locals.progDoc['ProgramacionDocentes.estadoExamenes'],
            asignacionsExamen: null,
            estadosProgDoc: estados.estadoProgDoc,
            estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
            franjasExamen: null,
            periodosExamen: null,
            cursos: null,
            pdID: null
        })
    } else {
        let cancelarpath = "" + req.baseUrl + "/coordinador/examenes?planID=" + req.session.planID
        let selectExamenespath = "" + req.baseUrl + "/coordinador/franjasexamenes?planID=" + req.session.planID
        let nuevopath = "" + req.baseUrl + "/coordinador/guardarExamenes"
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "examenesConsultar" : "examenesCumplimentar"
        res.render(view,
            {
                contextPath: app.contextPath,
                asignacionsExamen: res.locals.asignacionsExamen,
                franjasExamen: res.locals.franjasExamen,
                periodosExamen: enumsPD.periodoPD,
                nuevopath: nuevopath,
                aprobarpath: "" + req.baseUrl + "/coordiandor/aprobarExamenes",
                selectExamenespath: selectExamenespath,
                cancelarpath: cancelarpath,
                planID: req.session.planID,
                pdID: req.session.pdID,
                cursos: res.locals.cursos,
                menu: req.session.menu,
                submenu: req.session.submenu,
                estado: null,
                permisoDenegado: res.locals.permisoDenegado,
                estadosExamen: estados.estadoExamen,
                estadosProgDoc: estados.estadoProgDoc,
                estadoExamenes: res.locals.progDoc['ProgramacionDocentes.estadoExamenes'],
                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                departamentoID: req.session.departamentoID,
                planEstudios: res.locals.planEstudios
            })
    }

}




// GET /respDoc/:pdID/Examenes
exports.getFranjasView = function (req, res, next) {
    req.session.submenu = "Examenes"
    let view = "franjasExamenesCumplimentar"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc. Ojo también comprueba que no esté en incidencia para el JE
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {

        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            franjasExamen: null,
            periodosExamen: null,
            pdID: null,
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (estados.estadoExamen.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoExamenes']
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Asignación de exámenes ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y el Jefe de Estudios la apruebe",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            estadoExamenes: res.locals.progDoc['ProgramacionDocentes.estadoExamenes'],
            franjasExamen: null,
            periodosExamen: null,
            pdID: null
        })
    } else {
        let cancelarpath = "" + req.baseUrl + "/coordinador/franjasexamenes?planID=" + req.session.planID
        let nuevopath = "" + req.baseUrl + "/coordinador/guardarFranjasExamenes"
        let selectExamenespath = "" + req.baseUrl + "/coordinador/examenes?planID=" + req.session.planID
        res.render(view,
            {
                contextPath: app.contextPath,
                franjasExamen: res.locals.franjasExamen,
                periodosExamen: enumsPD.periodoPD,
                nuevopath: nuevopath,
                selectExamenespath: selectExamenespath,
                cancelarpath: cancelarpath,
                planID: req.session.planID,
                pdID: req.session.pdID,
                menu: req.session.menu,
                submenu: req.session.submenu,
                estado: null,
                permisoDenegado: res.locals.permisoDenegado,
                estadosExamen: estados.estadoExamen,
                estadosProgDoc: estados.estadoProgDoc,
                estadoExamenes: res.locals.progDoc['ProgramacionDocentes.estadoExamenes'],
                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                departamentoID: req.session.departamentoID,
                planEstudios: res.locals.planEstudios
            })
    }
}



exports.guardarExamenes = function (req, res, next) {
    req.session.submenu = "Examenes"
    let whereEliminar = {};
    let pdID = req.session.pdID
    let planID = req.session.planID
    let departamentoID = req.session.departamentoID
    let promises = [];
    if (!res.locals.permisoDenegado) {
        let toAnadir = req.body.anadir;
        let toActualizar = req.body.actualizar;
        let toEliminar = req.body.eliminar;
        let queryToAnadir = []
        return models.Asignatura.findAll(
            {
                where: {
                    ProgramacionDocenteIdentificador: pdID
                },
                attributes: ["identificador"],
                include: [{
                    model: models.Examen,
                    //left join
                    required: false,
                }],
                raw: true
            })
            .then(function (as) {
                if (toAnadir) {
                    if (!Array.isArray(toAnadir)) {
                        let nuevaEntrada = {};
                        let hora = req.body["hora_" + toAnadir];
                        let minutos = req.body["minutos_" + toAnadir];
                        if(!minutos) minutos = '00';
                        nuevaEntrada.AsignaturaIdentificador = Number(toAnadir.split("_")[0]);
                        nuevaEntrada.periodo = toAnadir.split("_")[2];
                        nuevaEntrada.fecha = moment(req.body["date_" + toAnadir], "DD/MM/YYYY");
                        if (hora && minutos) {
                        nuevaEntrada.horaInicio = hora + ":" + minutos;
                        }
                        nuevaEntrada.duracion = Number(req.body["duracion_" + toAnadir]);

                        let asig = as.find(function (obj) { return (nuevaEntrada.AsignaturaIdentificador && obj.identificador === nuevaEntrada.AsignaturaIdentificador) })
                        if (!asig) {
                            console.log("Quiere añadir un examen que no es suyo")
                        } else {
                            queryToAnadir.push(nuevaEntrada);
                        }
                    } else {
                        toAnadir.forEach(function (element, index) {
                            let nuevaEntrada = {};
                            let hora = req.body["hora_" + element];
                            let minutos = req.body["minutos_" + element];
                            if (!minutos) minutos = '00';
                            nuevaEntrada.AsignaturaIdentificador = Number(element.split("_")[0]);
                            nuevaEntrada.periodo = element.split("_")[2];
                            nuevaEntrada.fecha = moment(req.body["date_" + element], "DD/MM/YYYY");
                            if(hora && minutos){
                                nuevaEntrada.horaInicio = hora + ":" + minutos;
                            }
                            nuevaEntrada.duracion = Number(req.body["duracion_" + element]);
                            let asig = as.find(function (obj) { return (nuevaEntrada.AsignaturaIdentificador && obj.identificador === nuevaEntrada.AsignaturaIdentificador) })
                            if (!asig) {
                                console.log("Quiere añadir un examen que no es suyo")
                            } else {
                                queryToAnadir.push(nuevaEntrada);
                            }
                        });
                    }
                    let promise1 = models.Examen.bulkCreate(
                        queryToAnadir
                    )
                    promises.push(promise1)
                }
                if (toActualizar) {
                    if (!Array.isArray(toActualizar)) {
                        let nuevaEntrada = {};
                        let hora = req.body["hora_" + toActualizar];
                        let minutos = req.body["minutos_" + toActualizar];
                        if (!minutos) minutos = '00';
                        let identificador = Number(toActualizar.split("_")[1])
                        nuevaEntrada.fecha = moment(req.body["date_" + toActualizar], "DD/MM/YYYY");
                        if (hora && minutos) {
                        nuevaEntrada.horaInicio = hora + ":" + minutos;
                        }
                        nuevaEntrada.duracion = Number(req.body["duracion_" + toActualizar]);
                        let asig = as.find(function (obj) { return (identificador && obj['Examens.identificador'] === identificador) })
                        if (!asig) {
                            console.log("Quiere actualizar un examen que no es suyo")
                        } else {
                            promises.push(models.Examen.update(
                                nuevaEntrada, /* set attributes' value */
                                { where: { identificador: identificador } } /* where criteria */
                            ))
                        }
                    } else {
                        let examensToActualizar = [];
                        toActualizar.forEach(function (element, index) {
                            let nuevaEntrada = {};
                            let hora = req.body["hora_" + element];
                            let minutos = req.body["minutos_" + element];
                            if (!minutos) minutos = '00';
                            let identificador = Number(element.split("_")[1])
                            nuevaEntrada.fecha = moment(req.body["date_" + element], "DD/MM/YYYY");
                            if (hora && minutos) {
                            nuevaEntrada.horaInicio = hora + ":" + minutos;
                            }
                            nuevaEntrada.duracion = Number(req.body["duracion_" + element]);
                            let asig = as.find(function (obj) { return (identificador && obj['Examens.identificador'] === identificador) })
                            if (!asig) {
                                console.log("Quiere actulaizar un examen que no es suyo")
                            } else {
                                promises.push(models.Examen.update(
                                    nuevaEntrada, /* set attributes' value */
                                    { where: { identificador: identificador } } /* where criteria */
                                ))
                            }
                        });
                    }
                }
                if (toEliminar) {
                    if (!Array.isArray(toEliminar)) {
                        let identificador = Number(toEliminar.split("_")[1])
                        whereEliminar.identificador = Number(identificador);
                    } else {
                        whereEliminar.identificador = [];
                        toEliminar.forEach(function (element, index) {
                            let identificador = Number(element.split("_")[1]);
                            whereEliminar.identificador.push(identificador);

                        });
                    }
                    funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                    let promise1 = models.Examen.destroy({
                        where: whereEliminar
                    })
                    promises.push(promise1)
                }
                Promise.all(promises).then(() => {
                    next();
                })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            })
    } else {
        next();
    }

}

exports.guardarFranjasExamenes = function (req, res, next) {
    req.session.submenu = "Examenes"
    let whereEliminar = {};
    let pdID = req.session.pdID
    let planID = req.session.planID
    let departamentoID = req.session.departamentoID
    let promises = [];
    if (!res.locals.permisoDenegado) {
        let toAnadir = req.body.anadir;
        let toActualizar = req.body.actualizar;
        let toEliminar = req.body.eliminar;
        let queryToAnadir = []
        return models.FranjaExamen.findAll(
            {
                where: {
                    ProgramacionDocenteId: pdID
                },
                attributes: ["identificador"],
                raw: true
            })
            .then(function (franjas) {
                if (toAnadir) {
                    if (!Array.isArray(toAnadir)) {
                        let nuevaEntrada = {};
                        let identificador = toAnadir.split("_")[0];
                        let hora = req.body[identificador + "_hora"];
                        let minutos = req.body[identificador + "_minutos"];
                        if (!minutos) minutos = '00';
                        nuevaEntrada.ProgramacionDocenteId = pdID;
                        nuevaEntrada.periodo = toAnadir.split("_")[1];
                        if (hora && minutos) {
                        nuevaEntrada.horaInicio = hora + ":" + minutos;
                        }
                        nuevaEntrada.duracion = Number(req.body[identificador + "_duracion"]);
                        queryToAnadir.push(nuevaEntrada);

                    } else {
                        toAnadir.forEach(function (element, index) {
                            let nuevaEntrada = {};
                            let identificador = element.split("_")[0];
                            let hora = req.body[identificador + "_hora"];
                            let minutos = req.body[identificador + "_minutos"];
                            if (!minutos) minutos = '00';
                            nuevaEntrada.ProgramacionDocenteId = pdID;
                            nuevaEntrada.periodo = element.split("_")[1];
                            if (hora && minutos) {
                            nuevaEntrada.horaInicio = hora + ":" + minutos;
                            }
                            nuevaEntrada.duracion = Number(req.body[identificador + "_duracion"]);
                            queryToAnadir.push(nuevaEntrada);
                        });
                    }
                    let promise1 = models.FranjaExamen.bulkCreate(
                        queryToAnadir
                    )
                    promises.push(promise1)
                }
                if (toActualizar) {
                    if (!Array.isArray(toActualizar)) {
                        let nuevaEntrada = {};
                        let identificador = toActualizar.split("_")[0];
                        let hora = req.body[identificador + "_hora"];
                        let minutos = req.body[identificador + "_minutos"];
                        if (!minutos) minutos = '00';
                        nuevaEntrada.ProgramacionDocenteId = pdID;
                        nuevaEntrada.periodo = toActualizar.split("_")[1];
                        if (hora && minutos) {
                        nuevaEntrada.horaInicio = hora + ":" + minutos;
                        }
                        nuevaEntrada.duracion = Number(req.body[identificador + "_duracion"]);
                        promises.push(models.FranjaExamen.update(
                            nuevaEntrada, /* set attributes' value */
                            { where: { identificador: identificador } } /* where criteria */
                        ))

                    } else {
                        toActualizar.forEach(function (element, index) {
                            let nuevaEntrada = {};
                            let identificador = element.split("_")[0];
                            let hora = req.body[identificador + "_hora"];
                            let minutos = req.body[identificador + "_minutos"];
                            if (!minutos) minutos = '00';
                            nuevaEntrada.ProgramacionDocenteId = pdID;
                            nuevaEntrada.periodo = element.split("_")[1];
                            if (hora && minutos) {
                            nuevaEntrada.horaInicio = hora + ":" + minutos;
                            }
                            nuevaEntrada.duracion = Number(req.body[identificador + "_duracion"]);
                            promises.push(models.FranjaExamen.update(
                                nuevaEntrada, /* set attributes' value */
                                { where: { identificador: identificador } } /* where criteria */
                            ))
                        });
                    }
                }
                if (toEliminar) {
                    if (!Array.isArray(toEliminar)) {
                        let identificador = Number(toEliminar.split("_")[0])
                        whereEliminar.identificador = Number(identificador);
                    } else {
                        whereEliminar.identificador = [];
                        toEliminar.forEach(function (element, index) {
                            let identificador = Number(element.split("_")[0]);
                            whereEliminar.identificador.push(identificador);

                        });
                    }
                    funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                    let promise1 = models.FranjaExamen.destroy({
                        where: whereEliminar
                    })
                    promises.push(promise1)
                }
                Promise.all(promises).then(() => {
                    res.redirect("" + req.baseUrl + "/coordinador/franjasExamenes")
                })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            })
    } else {
        res.redirect("" + req.baseUrl + "/coordinador/franjasExamenes")
    }

}

//get
exports.reenviarExamenes = function (req, res, next) {
    req.session.save(function () {
        res.redirect("" + req.baseUrl + "/coordinador/examenes?departamentoID=" + req.session.departamentoID + "&planID=" + req.session.planID);
    })
}

// post 
exports.aprobarExamenes = function (req, res, next) {
    let pdID = req.session.pdID;
    let date = new Date();
    let planID = req.session.planID;
    let estadoExamenes;
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoExamenes"] }).then(function (pd) {
        estadoExamenes = pd['estadoExamenes']
        if (!res.locals.permisoDenegado) {
            switch (estadoExamenes) {
                case (estados.estadoExamen.abierto):
                    estadoExamenes = estados.estadoExamen.aprobadoCoordinador;
                    break;
                default:
                    break;
            }

            models.ProgramacionDocente.update(
                {
                    estadoExamenes: estadoExamenes,
                    fechaHorarios: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            ).then(() => {
                JEcontroller.isPDLista(pdID, next())
            }).catch(function (error) {
                next(error);
            });
        } else {
            req.session.save(function () {
                next()
            })
        }
    })
}


exports.generateCsvExamens = function (req, res, next){
    return models.ProgramacionDocente.findOne({ where: { identificador: req.session.pdID }, attributes: ["estadoProGDoc","estadoExamenes"] }).then(function (pd) {
        let estadoExamenes = pd['estadoExamenes']
        let estadoProgDoc = pd['estadoProGDoc']
        //solo se genera el pdf si se tiene permiso
        if (!res.locals.permisoDenegado) {
            let planID = req.session.planID
            let acronimoOIdPlan = menuProgDocController.getPlanPd(req.session.pdID);
            try {
                const fields = ['codigo', 'titulacion', 'curso', 'dia', 'hora de comienzo', 'hora finalizacion','asignatura','departamento responsable'];
                const opts = { fields };
                let data = [];
                let ano = menuProgDocController.getAnoPd(req.session.pdID)
                //supongo que un acronimo como mucho 10 letras, si es mayor cojo el identificador del plan
                if (acronimoOIdPlan.length > 10) {
                    acronimoOIdPlan = menuProgDocController.getPlanPd(req.session.pdID)
                }
                if (res.locals.asignacionsExamen) {
                    res.locals.asignacionsExamen.forEach(function (asignacions, index) {
                        data = [];
                        asignacions.asignaturas.forEach(function (ex, index) {
                            ex['titulacion'] = acronimoOIdPlan
                            ex['dia'] = ex.examen.fecha
                            if (moment(ex.examen.horaInicio, 'HH:mm:ss').isValid()) {
                                ex['hora de comienzo'] = moment(ex.examen.horaInicio, 'HH:mm:ss').format("HH:mm")
                            }
                            if (moment(ex.examen.horaInicio, 'HH:mm:ss').add(ex.examen.duracion).isValid()) {
                                ex['hora finalizacion'] = moment(ex.examen.horaInicio, 'HH:mm:ss').add(ex.examen.duracion,"m").format("HH:mm")
                            }
                            ex['asignatura'] = ex.nombre;
                            ex['departamento responsable'] = ex.departamentoResponsable
                            data.push(ex)

                        })
                         
                        //si esta abierto se guarda en borrador
                        let folder = "/examenes/"
                        let folder2 =""
                       if(estadoExamenes === estados.estadoExamen.abierto){
                            folder = "/borrador/"
                            folder2 = "_borrador"
                        }
                        let dir = app.pathPDF + '/pdfs/' + menuProgDocController.getAnoPd(req.session.pdID) + "/" + menuProgDocController.getTipoPd(req.session.pdID) + "/" + menuProgDocController.getPlanPd(req.session.pdID) + '/' + menuProgDocController.getVersionPd(req.session.pdID) + folder
                        let ruta = dir + acronimoOIdPlan + "_" + ano + "_" + asignacions.periodo + "_" + menuProgDocController.getVersionPd(req.session.pdID) + folder2 + ".csv"
                        menuProgDocController.ensureDirectoryExistence(ruta)
                        const csv = json2csv(data, opts);
                        fs.writeFile(ruta, csv, function (err) {
                            if (err) throw err;
                        });
                    })
                    next();
                }
                else {
                    next();
                }

            } catch (error) {
                console.log("Error:", error);
                next(error);
            }
        } else {
            req.session.save(function () {
                next()
            })
        }
    })    
}
