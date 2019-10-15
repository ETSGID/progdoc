let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let funciones = require('../funciones');
let json2csv = require('json2csv').parse;
let progDocController = require('./progDoc_controller')
const fs = require('fs')


//funcion que devuelve las franjas de examenes pasandole la pdID
exports.getFranjas = async function (req, res, next) {
    if (req.session.pdID) {
        try {
            let franjasExamen = await getFranjasExamenes(req.session.pdID);
            res.locals.franjasExamen = franjasExamen;
            next();
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        next()
    }

}

async function getFranjasExamenes(pdID) {
    try {
        let franjasExamen = [];
        let tipo = progDocController.getTipoPd(pdID);
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
        let franjas = await models.FranjaExamen.findAll({
            where: {
                ProgramacionDocenteId: pdID,
            },
            order: [
                [Sequelize.literal('"FranjaExamen"."periodo"'), 'ASC'],
                [Sequelize.literal('"FranjaExamen"."horaInicio"'), 'ASC'],
            ],
        })
        franjas.forEach((franja) => {
            let f = franjasExamen.find(function (obj) { return obj.periodo === franja['periodo']; });
            //si la franja no está la añado
            if (f) {
                f["franjas"].push(franja)
            }
        })
        return franjasExamen
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}


exports.getExamenes = async function (req, res, next) {
    let asignacionsExamen = []; //asignaciones existentes
    if (req.session.pdID) {
        try {
            let pdID = req.session.pdID
            let anoFinal = 2000 + Number(pdID.split("_")[2][4] + "" + pdID.split("_")[2][5])
            switch (progDocController.getTipoPd(req.session.pdID)) {
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
            async function getAsignacionExamen(ProgramacionDocenteIdentificador) {
                //busco las asignaturas con departamento responsable ya que son las que entran en los exámenes
                let asignaturaConExamens = await models.Asignatura.findAll({
                    where: {
                        ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
                        DepartamentoResponsable: {
                            [op.ne]: null,
                        }
                    },
                    attributes: ['acronimo', 'curso', 'identificador', 'nombre', 'semestre', 'codigo', 'DepartamentoResponsable'],
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
                asignaturaConExamens.forEach((asignaturaConExamen) => {
                    //lo convierto en string
                    let cPos = cursos.map(function (x) { return x.curso; }).indexOf(asignaturaConExamen.curso);
                    let c = cursos.find(function (obj) { return obj === asignaturaConExamen['curso']; });
                    //si el curso no está lo añado
                    if (!c) {
                        cursos.push(asignaturaConExamen['curso'])
                        cPos = cursos.map(function (x) { return x.curso; }).indexOf(asignaturaConExamen.curso);
                        c = cursos.find(function (obj) { return obj === asignaturaConExamen['curso']; });
                    }
                    //busco si la asignatura está en los periodos que debería y si no está la añado.
                    switch (asignaturaConExamen.semestre) {
                        case '1S':
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E)
                            break;
                        case '2S':
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E)
                            break;
                        case '1S-2S':
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E)
                            break;
                        case 'A':
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E)
                            break;
                        case 'I':
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O)
                            buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E)
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
                    let periodoExamen = asignaturaConExamen['Examens.periodo'];
                    let p = asignacionsExamen.find(function (obj) { return obj.periodo === periodoExamen });
                    if (p) {
                        let asign = p.asignaturas.find(function (x) { return x.identificador === asignaturaConExamen.identificador })
                        if (asign) {
                            asign.examen.identificador = asignaturaConExamen['Examens.identificador'];
                            asign.examen.fecha = asignaturaConExamen['Examens.fecha'];
                            asign.examen.horaInicio = asignaturaConExamen['Examens.horaInicio'];
                            asign.examen.duracion = asignaturaConExamen['Examens.duracion'];
                            asign.examen.aulas = asignaturaConExamen['Examens.aulas'];
                        }

                    }
                })
                res.locals.cursos = cursos;
                res.locals.asignacionsExamen = asignacionsExamen;
                next();
            }
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        next();
    }
}


exports.getExamenesView = function (req, res, next) {
    req.session.submenu = "Examenes"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc. Ojo también comprueba que no esté en incidencia para el JE
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "examenes/examenesConsultar" : "examenes/examenesCumplimentar"
        res.render(view, {
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
    /*else if (estados.estadoExamen.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoExamenes']
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("examenes/examenesCumplimentar", {
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
    }*/ else {
        let cancelarpath = "" + req.baseUrl + "/coordinador/examenes?planID=" + req.session.planID
        let selectExamenespath = "" + req.baseUrl + "/coordinador/franjasexamenes?planID=" + req.session.planID
        let nuevopath = "" + req.baseUrl + "/coordinador/guardarExamenes"
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "examenes/examenesConsultar" : "examenes/examenesCumplimentar"
        res.render(view,
            {
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
    req.session.submenu = "Examenes2"
    let view = "examenes/franjasExamenesCumplimentar"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc. Ojo también comprueba que no esté en incidencia para el JE
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {

        res.render(view, {
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
    /*else if (estados.estadoExamen.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoExamenes']
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render(view, {
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
    }*/ else {
        let cancelarpath = "" + req.baseUrl + "/coordinador/franjasexamenes?planID=" + req.session.planID
        let nuevopath = "" + req.baseUrl + "/coordinador/guardarFranjasExamenes"
        let selectExamenespath = "" + req.baseUrl + "/coordinador/examenes?planID=" + req.session.planID
        res.render(view,
            {
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



exports.guardarExamenes = async function (req, res, next) {
    let whereEliminar = {};
    let pdID = req.session.pdID
    let promises = [];
    if (!res.locals.permisoDenegado) {
        try {
            let toAnadir = req.body.anadir;
            let toActualizar = req.body.actualizar;
            let toEliminar = req.body.eliminar;
            let queryToAnadir = []
            let as = await models.Asignatura.findAll(
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
            if (toAnadir) {
                if (!Array.isArray(toAnadir)) {
                    toAnadir = [toAnadir]
                }
                toAnadir.forEach(function (element, index) {
                    let nuevaEntrada = {};
                    let hora = req.body["hora_" + element];
                    let minutos = req.body["minutos_" + element];
                    if (!minutos) minutos = '00';
                    nuevaEntrada.AsignaturaIdentificador = Number(element.split("_")[0]);
                    nuevaEntrada.periodo = element.split("_")[2];
                    nuevaEntrada.fecha = moment(req.body["date_" + element], "DD/MM/YYYY");
                    if (hora && minutos) {
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
                let promise1 = models.Examen.bulkCreate(
                    queryToAnadir
                )
                promises.push(promise1)
            }
            if (toActualizar) {
                if (!Array.isArray(toActualizar)) {
                    toActualizar = [toActualizar]
                }
                toActualizar.forEach(function (element) {
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
            if (toEliminar) {
                if (!Array.isArray(toEliminar)) {
                    toEliminar = [toEliminar]
                }
                whereEliminar.identificador = [];
                toEliminar.forEach(function (element, index) {
                    let identificador = Number(element.split("_")[1]);
                    whereEliminar.identificador.push(identificador);

                });
                funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                let promise1 = models.Examen.destroy({
                    where: whereEliminar
                })
                promises.push(promise1)
            }
            await Promise.all(promises);
            next();
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        next();
    }

}

exports.guardarFranjasExamenes = async function (req, res, next) {
    let whereEliminar = {};
    let pdID = req.session.pdID
    let promises = [];
    try {
        if (!res.locals.permisoDenegado) {
            let toAnadir = req.body.anadir;
            let toActualizar = req.body.actualizar;
            let toEliminar = req.body.eliminar;
            let queryToAnadir = []
            if (toAnadir) {
                if (!Array.isArray(toAnadir)) {
                    toAnadir = [toAnadir]
                }
                toAnadir.forEach(function (element) {
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
                let promise1 = models.FranjaExamen.bulkCreate(
                    queryToAnadir
                )
                promises.push(promise1)
            }
            if (toActualizar) {
                if (!Array.isArray(toActualizar)) {
                    toActualizar = [toActualizar]
                }
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
            if (toEliminar) {
                if (!Array.isArray(toEliminar)) {
                    toEliminar = [toEliminar]
                }
                whereEliminar.identificador = [];
                toEliminar.forEach(function (element, index) {
                    let identificador = Number(element.split("_")[0]);
                    whereEliminar.identificador.push(identificador);

                });
                funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                let promise1 = models.FranjaExamen.destroy({
                    where: whereEliminar
                })
                promises.push(promise1);
            }
            await Promise.all(promises);
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/coordinador/franjasExamenes")
            })
        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/coordinador/franjasExamenes")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

//get
exports.reenviarExamenes = function (req, res, next) {
    req.session.save(function () {
        res.redirect("" + req.baseUrl + "/coordinador/examenes?departamentoID=" + req.session.departamentoID + "&planID=" + req.session.planID);
    })
}

// post 
exports.aprobarExamenes = async function (req, res, next) {
    let pdID = req.session.pdID;
    let date = new Date();
    let estadoExamenes;
    try {
        let pd = await models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoExamenes"] });
        estadoExamenes = pd['estadoExamenes'];
        if (!res.locals.permisoDenegado) {
            switch (estadoExamenes) {
                case (estados.estadoExamen.abierto):
                    estadoExamenes = estados.estadoExamen.aprobadoCoordinador;
                    break;
                default:
                    break;
            }
            await models.ProgramacionDocente.update(
                {
                    estadoExamenes: estadoExamenes,
                    fechaHorarios: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            )

            progDocController.isPDLista(pdID, next())
        } else {
            req.session.save(function () {
                next()
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}


exports.generateCsvExamens = async function (req, res, next) {
    try {
        let pd = await models.ProgramacionDocente.findOne({ where: { identificador: req.session.pdID }, attributes: ["estadoProGDoc", "estadoExamenes"] })
        let estadoExamenes = pd['estadoExamenes']
        //solo se genera el pdf si se tiene permiso
        if (!res.locals.permisoDenegado) {
            let acronimoOIdPlan = progDocController.getPlanPd(req.session.pdID);
            const fields = ['codigo', 'titulacion', 'curso', 'dia', 'hora de comienzo', 'hora finalizacion', 'asignatura', 'departamento responsable'];
            const opts = { fields };
            let data = [];
            let ano = progDocController.getAnoPd(req.session.pdID)
            //supongo que un acronimo como mucho 10 letras, si es mayor cojo el identificador del plan
            if (acronimoOIdPlan.length > 10) {
                acronimoOIdPlan = progDocController.getPlanPd(req.session.pdID)
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
                            ex['hora finalizacion'] = moment(ex.examen.horaInicio, 'HH:mm:ss').add(ex.examen.duracion, "m").format("HH:mm")
                        }
                        ex['asignatura'] = ex.nombre;
                        ex['departamento responsable'] = ex.departamentoResponsable
                        data.push(ex)

                    })

                    //si esta abierto se guarda en borrador
                    let folder = "/examenes/"
                    let folder2 = ""
                    if (estadoExamenes === estados.estadoExamen.abierto) {
                        folder = "/borrador/"
                        folder2 = "_borrador"
                    }
                    let dir = app.pathPDF + '/pdfs/' + progDocController.getAnoPd(req.session.pdID) + "/" + progDocController.getTipoPd(req.session.pdID) + "/" + progDocController.getPlanPd(req.session.pdID) + '/' + progDocController.getVersionPd(req.session.pdID) + folder
                    let ruta = dir + acronimoOIdPlan + "_" + ano + "_" + asignacions.periodo + "_" + progDocController.getVersionPd(req.session.pdID) + folder2 + ".csv"
                    funciones.ensureDirectoryExistence(ruta)
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
        } else {
            req.session.save(function () {
                next()
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

function isExamenInFranjas(examen, franjas) {
    let duracion = +examen.duracion;
    let horaInicial = moment.duration(examen.horaInicio)
    let horaFinal = (moment.duration(horaInicial).add(duracion, "m"));
    if (franjas.length === 0) {
        //en este caso no hay franjas
        return false;
    }
    for (let i = 0; i < franjas.length; i++) {
        //encaja con un examen si la horaInicial es posterior o igual a la hora inicial de la period
        //y la hora final es anterior o igual a la hora de la period
        if ((horaInicial - moment.duration(franjas[i].horaInicio) >= 0) &&
            (horaFinal - moment.duration(franjas[i].horaInicio).add(franjas[i].duracion, "m") <= 0)) {
            return i + 1;
        }
    }
    return false;
}

exports.getFranjasExamenes = getFranjasExamenes;
exports.isExamenInFranjas = isExamenInFranjas;
