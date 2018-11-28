let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let funciones = require('../funciones');
let JEcontroller = require('./JE_controller')

// GET /respDoc/:pdID/:departamentoID/Horario
exports.getHorario = function (req, res, next) {

    req.session.submenu = "Horarios"

    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "horariosConsultar" : "horarios"
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programacion docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            asignacionsHorario: null
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (estados.estadoHorario.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoHorarios']
        && res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("horarios", {
            contextPath: app.contextPath,
            estado: "Asignación de horarios ya se realizó",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            asignacionsHorario: null
        })
    } else {
        let asignacionsHorario = []; //asignaciones existentes
        let cursos = []; //array con los cursos por separado
        let asignaturas = []; //array con los acronimos de las asignaturas por separado
        let gruposBBDD = res.locals.grupos;
        let pdID = req.session.pdID
        //sino se especifica departamento se queda con el primero del plan responsable. Arriba comprobé que existe el departamento en la pos 0.
        let departamentoID;
        if (res.locals.departamentosResponsables.length > 0) {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        } else {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : null;
        }

        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });


        getAsignacionHorario(pdID);


        function getAsignacionHorario(ProgramacionDocenteIdentificador) {
            //busco las asignaturas con departamento responsable ya que son las que entran en el horario
            models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdID,
                    DepartamentoResponsable: {
                        [op.ne]: null,
                    },
                    semestre: {
                        [op.ne]: null,
                    }
                },
                attributes: ['acronimo', 'curso', 'identificador', 'nombre', 'semestre', 'codigo'],
                order: [

                    [Sequelize.literal('"curso"'), 'ASC'],
                    [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC'],
                    [Sequelize.literal('"codigo"'), 'ASC']
                ],
                raw: true,
                include: [{
                    //left join 
                    model: models.AsignacionProfesor,
                    where: {
                        ProfesorId: null  //cojo las que no son de asignacion de profesores
                    },
                    required: false,
                    attributes: ['Dia', 'HoraInicio', 'Duracion', 'Nota', 'GrupoId', 'identificador'],
                    include: [{
                        model: models.Grupo,
                        attributes: ['nombre'],
                    }]
                }]
            })
                .each(function (ej) {
                    let GrupoNombre = ej['AsignacionProfesors.Grupo.nombre']
                    //lo convierto en string
                    c = asignacionsHorario.find(function (obj) { return obj.curso === ej['curso']; });
                    //si el curso no está lo añado
                    if (!c) {
                        cursos.push(ej['curso'])
                        let cursoAsignacion = {};
                        cursoAsignacion.curso = ej['curso'];
                        cursoAsignacion.semestres = [];
                        let coincidenciasGrupos;
                        let coincidenciasGrupos1;
                        let coincidenciasGrupos2;
                        switch (pdID.split("_")[3]) {
                            case '1S':
                                coincidenciasGrupos = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                                );
                                //al reformatear el codigo me hizo poner lo de grupoCodigo y lo de grupoNombre
                                coincidenciasGrupos = coincidenciasGrupos.map(function (e) {
                                    e.grupoNombre = e.nombre;
                                    e.grupoCodigo = e.grupoId; e.asignaciones = []; e.asignaturas = []; return e
                                })
                                cursoAsignacion.semestres = [{ semestre: 1, grupos: coincidenciasGrupos }];
                                break;
                            case '2S':
                                coincidenciasGrupos = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                                );
                                coincidenciasGrupos = coincidenciasGrupos.map(function (e) {
                                    e.grupoNombre = e.nombre;
                                    e.grupoCodigo = e.grupoId; e.asignaciones = []; e.asignaturas = []; return e
                                })
                                cursoAsignacion.semestres = [{ semestre: 2, grupos: coincidenciasGrupos }];
                                break;
                            default:
                                coincidenciasGrupos1 = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                                );
                                coincidenciasGrupos2 = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                                );
                                coincidenciasGrupos1 = coincidenciasGrupos1.map(function (e) {
                                    e.grupoNombre = e.nombre;
                                    e.grupoCodigo = e.grupoId; e.asignaciones = []; e.asignaturas = []; return e
                                })
                                coincidenciasGrupos2 = coincidenciasGrupos2.map(function (e) {
                                    e.grupoNombre = e.nombre;
                                    e.grupoCodigo = e.grupoId; e.asignaciones = []; e.asignaturas = []; return e
                                })
                                cursoAsignacion.semestres = [{ semestre: 1, grupos: coincidenciasGrupos1 }, { semestre: 2, grupos: coincidenciasGrupos2 }];
                                break;
                        }
                        asignacionsHorario.push(cursoAsignacion);
                        c = asignacionsHorario.find(function (obj) { return obj.curso === ej['curso']; });
                    }
                    let asign = asignaturas.find(function (obj) { return obj.nombre === ej['nombre']; });
                    if (!asign) {
                        asign = {}
                        asign.acronimo = ej.acronimo;
                        asign.nombre = ej.nombre
                        asign.identificador = ej.identificador
                        asign.semestre = ej['semestre']
                        asign.curso = ej.curso;
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
                        if (s1) {
                            let sem = c.semestres.find(function (obj) { return obj.semestre === 1; })
                            for (let i = 0; i < sem.grupos.length; i++) {
                                sem.grupos[i].asignaturas.push(asign);
                            }
                        }
                        if (s2) {
                            let sem = c.semestres.find(function (obj) { return obj.semestre === 2; })
                            for (let i = 0; i < sem.grupos.length; i++) {
                                sem.grupos[i].asignaturas.push(asign);
                            }
                        }
                        asignaturas.push(asign);
                    }
                    if (GrupoNombre) {
                        s = c.semestres.find(function (obj) { return obj.semestre === Number(GrupoNombre.split(".")[1]); })
                        if(s){
                            //busco el grupo ya se inició
                            let g = s.grupos.find(function (obj) { return obj.grupoId === ej['AsignacionProfesors.GrupoId']; });
                            //busco si está la asignatura
                            if(g){
                                let a = g.asignaturas.find(function (obj) { return obj.grupoCodigo === ej['identificador']; });

                                //miro si la asignacion no está vacía
                                if (ej['AsignacionProfesors.Dia'] !== null || ej['AsignacionProfesors.Nota'] !== null) {
                                    let asignacion = {};
                                    asignacion.identificador = ej['AsignacionProfesors.identificador']
                                    asignacion.dia = ej['AsignacionProfesors.Dia'];
                                    asignacion.horaInicio = ej['AsignacionProfesors.HoraInicio']
                                    asignacion.duracion = ej['AsignacionProfesors.Duracion']
                                    asignacion.nota = ej['AsignacionProfesors.Nota']
                                    asignacion.asignaturaAcronimo = ej['acronimo'];
                                    asignacion.asignaturaNombre = ej['nombre'];
                                    asignacion.asignaturaIdentificador = ej['identificador'];
                                    g.asignaciones.push(asignacion);
                                }
                            }
                        }
                    }
                })
                .then(function (e) {
                    let cancelarpath = "" + req.baseUrl + "/coordinador/horarios?planID=" + req.session.planID
                    let nuevopath = "" + req.baseUrl + "/coordinador/guardarHorarios"
                    let view = req.originalUrl.toLowerCase().includes("consultar") ? "horariosConsultar" : "horarios"
                    res.render(view,
                        {
                            contextPath: app.contextPath,
                            asignacionsHorario: asignacionsHorario,
                            nuevopath: nuevopath,
                            aprobarpath: "" + req.baseUrl + "/coordiandor/aprobarHorarios",
                            cancelarpath: cancelarpath,
                            planID: req.session.planID,
                            pdID: pdID,
                            menu: req.session.menu,
                            submenu: req.session.submenu,
                            estado: null,
                            permisoDenegado: res.locals.permisoDenegado,
                            estadosHorario: estados.estadoHorario,
                            estadosProgDoc: estados.estadoProgDoc,
                            estadoHorarios: res.locals.progDoc['ProgramacionDocentes.estadoHorarios'],
                            estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                            departamentoID: req.session.departamentoID,
                            planEstudios: res.locals.planEstudios
                        })
                }).catch(function (error) {
                    console.log("Error:", error);
                    next(error);
                });
        }
    }

}

exports.guardarHorarios = function (req, res, next) {
    req.session.submenu = "Horarios"
    let whereEliminar = {};
    let pdID = req.session.pdID
    let planID = req.session.planID
    let departamentoID = req.session.departamentoID
    let toEliminar = req.body.eliminar
    let promises = [];
    if (!res.locals.permisoDenegado) {
        return models.Asignatura.findAll({
            where: {
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
            .then(function (as) {
                if (toEliminar) {
                    if (!Array.isArray(toEliminar)) {
                        if (toEliminar.split("_").length === 7) {
                            //si es una hora
                            let asignacion = Number(toEliminar.split("_")[6])
                            let asig = as.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                            if (!asig || !asig['AsignacionProfesors.Dia']) {
                                console.log("Intenta cambiar una nota o un profesor")
                            } else {
                                whereEliminar.identificador = Number(asignacion);
                            }
                        } else {
                            //si es una nota
                            let asignacion = Number(toEliminar.split("_")[0])
                            let asig = as.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                            if (!asig || !asig['AsignacionProfesors.Nota']) {
                                console.log("Intenta cambiar un horario o un profesor")
                            } else {
                                whereEliminar.identificador = Number(asignacion);
                            }
                        }

                    } else {
                        whereEliminar.identificador = [];
                        toEliminar.forEach(function (element, index) {
                            let asignacion;
                            if (element.split("_").length === 7) {
                                //si es una hora
                                asignacion = Number(element.split("_")[6])
                                let asig = as.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                                if (!asig || !asig['AsignacionProfesors.Dia']) {
                                    console.log("Intenta cambiar una nota o un profesor")
                                } else {
                                    whereEliminar.identificador.push(asignacion);
                                }
                            } else {
                                //si es una nota
                                asignacion = Number(element.split("_")[0])
                                let asig = as.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                                if (!asig || !asig['AsignacionProfesors.Nota']) {
                                    console.log("Intenta cambiar un horario o un profesor")
                                } else {
                                    whereEliminar.identificador.push(asignacion);
                                }
                            }

                        });
                    }
                    funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                    let promise1 = models.AsignacionProfesor.destroy({
                        where: whereEliminar
                    })
                    promises.push(promise1)
                }
                let toAnadir = req.body.anadir;
                let queryToAnadir = []
                if (toAnadir) {
                    if (!Array.isArray(toAnadir)) {
                        let nuevaEntrada = {};
                        if (toAnadir.split("_")[0] === 'horario') {
                            //si es una hora
                            nuevaEntrada.Duracion = 60;
                            nuevaEntrada.Dia = toAnadir.split("_")[3];
                            nuevaEntrada.HoraInicio = toAnadir.split("_")[4] + ":00:00";
                            nuevaEntrada.AsignaturaId = Number(toAnadir.split("_")[6]);
                            nuevaEntrada.GrupoId = Number(toAnadir.split("_")[2]);
                        } else {
                            //si es una nota
                            nuevaEntrada.Nota = toAnadir.split("_")[2]
                            nuevaEntrada.AsignaturaId = Number(toAnadir.split("_")[0]);
                            nuevaEntrada.GrupoId = Number(toAnadir.split("_")[1]);
                        }
                        let asig = as.find(function (obj) { return (nuevaEntrada.AsignaturaId && obj.identificador === nuevaEntrada.AsignaturaId) })
                        if (!asig) {
                            console.log("Ha intentado cambiar una asignatura que no puede")
                        } else {
                            queryToAnadir.push(nuevaEntrada);
                        }
                    } else {
                        toAnadir.forEach(function (element, index) {
                            let nuevaEntrada = {};
                            if (element.split("_")[0] === 'horario') {
                                //si es una hora
                                nuevaEntrada.Duracion = 60;
                                nuevaEntrada.Dia = element.split("_")[3];
                                nuevaEntrada.HoraInicio = element.split("_")[4] + ":00:00";
                                nuevaEntrada.AsignaturaId = Number(element.split("_")[6]);
                                nuevaEntrada.GrupoId = Number(element.split("_")[2]);
                            } else {
                                //si es una nota
                                nuevaEntrada.Nota = element.split("_")[2]
                                nuevaEntrada.AsignaturaId = Number(element.split("_")[0]);
                                nuevaEntrada.GrupoId = Number(element.split("_")[1]);
                            }
                            let asig = as.find(function (obj) { return (nuevaEntrada.AsignaturaId && obj.identificador === nuevaEntrada.AsignaturaId) })
                            if (!asig) {
                                console.log("Ha intentado cambiar una asignatura que no puede")
                            } else {
                                queryToAnadir.push(nuevaEntrada);
                            }
                        });
                    }
                    let promise2 = models.AsignacionProfesor.bulkCreate(
                        queryToAnadir
                    )
                    promises.push(promise2)
                }

                Promise.all(promises).then(() => {
                    next();
                }).catch(function (error) {
                    console.log("Error:", error);
                    next(error);
                });
            })

    } else {
        next();
    }

}

//get
exports.reenviar = function (req, res, next) {
    req.session.save(function () {
    res.redirect("" + req.baseUrl + "/coordinador/horarios?departamentoID=" + req.session.departamentoID + "&planID=" + req.session.planID);
    })
}
// post 
exports.aprobarHorarios = function (req, res, next) {
    let pdID = req.session.pdID;
    let date = new Date();
    let planID = req.session.planID;
    let estadoHorarios;
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoHorarios"] }).then(function (pd) {
        estadoHorarios = pd['estadoHorarios']
        if (!res.locals.permisoDenegado) {
            switch (estadoHorarios) {
                case (estados.estadoHorario.abierto):
                    estadoHorarios = estados.estadoHorario.aprobadoCoordinador;
                    break;
                default:
                    break;
            }

            models.ProgramacionDocente.update(
                {
                    estadoHorarios: estadoHorarios,
                    fechaHorarios: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            ).then(() => {
                req.session.save(function () {
                JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/coordinador/horarios"))
                })
            }).catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
        } else {
            req.session.save(function () {
            res.redirect("" + req.baseUrl + "/coordinador/horarios")
            })
        }
    })

}



// GET /respDoc/:pdID/Examenes
exports.getExamenes = function (req, res, next) {

    req.session.submenu = "Examenes"

    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc. Ojo también comprueba que no esté en incidencia para el JE
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "examenesConsultar" : "examenes"
        res.render(view, {
            contextPath: app.contextPath,
            estado: "Programacion docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            asignacionsExamen: null,
            periodosExamen: null,
            cursos: null,
            pdID: null,
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (estados.estadoExamen.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoExamenes']
        && res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("examenes", {
            contextPath: app.contextPath,
            estado: "Asignación de exámenes ya se realizó",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            asignacionsExamen: null,
            periodosExamen: null,
            cursos: null,
            pdID: null
        })
    } else {
        let asignacionsExamen = []; //asignaciones existentes
        let pdID = req.session.pdID
        let anoFinal = 2000 + Number(pdID.split("_")[2][4] + "" + pdID.split("_")[2][5])
        switch (res.locals.pdSemestre) {
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
        if (res.locals.departamentosResponsables.length > 0) {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        } else {
            departamentoID = req.session.departamentoID ? req.session.departamentoID : null;
        }
        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;


        getAsignacionExamen(pdID);


        function getAsignacionExamen(ProgramacionDocenteIdentificador) {
            //busco las asignaturas con departamento responsable ya que son las que entran en los exámenes
            models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdID,
                    DepartamentoResponsable: {
                        [op.ne]: null,
                    }
                },
                attributes: ['acronimo', 'curso', 'identificador', 'nombre', 'semestre', 'codigo'],
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
                .then(function (e) {
                    let cancelarpath = "" + req.baseUrl + "/coordinador/examenes?planID=" + req.session.planID
                    let nuevopath = "" + req.baseUrl + "/coordinador/guardarExamenes"
                    let view = req.originalUrl.toLowerCase().includes("consultar") ? "examenesConsultar" : "examenes"
                    res.render(view,
                        {
                            contextPath: app.contextPath,
                            asignacionsExamen: asignacionsExamen,
                            periodosExamen: enumsPD.periodoPD,
                            nuevopath: nuevopath,
                            aprobarpath: "" + req.baseUrl + "/coordiandor/aprobarExamenes",
                            cancelarpath: cancelarpath,
                            planID: req.session.planID,
                            pdID: pdID,
                            cursos: cursos,
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


                })
                .catch(function (error) {
                    console.log("Error:", error);
                    next(error);
                });

        }
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
                        nuevaEntrada.AsignaturaIdentificador = Number(toAnadir.split("_")[1]);
                        nuevaEntrada.periodo = toAnadir.split("_")[3];
                        nuevaEntrada.fecha = moment(toAnadir.split("_")[4], "DD/MM/YYYY");
                        let asig = as.find(function (obj) { return (nuevaEntrada.AsignaturaIdentificador && obj.identificador === nuevaEntrada.AsignaturaIdentificador) })
                        if (!asig) {
                            console.log("Quiere añadir un examen que no es suyo")
                        } else {
                            queryToAnadir.push(nuevaEntrada);
                        }
                    } else {
                        toAnadir.forEach(function (element, index) {
                            let nuevaEntrada = {};
                            nuevaEntrada.AsignaturaIdentificador = Number(element.split("_")[1]);
                            nuevaEntrada.periodo = element.split("_")[3];
                            nuevaEntrada.fecha = moment(element.split("_")[4], "DD/MM/YYYY");
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
                        let identificador = Number(toActualizar.split("_")[2])
                        nuevaEntrada.fecha = moment(toActualizar.split("_")[4], "DD/MM/YYYY");
                        let asig = as.find(function (obj) { return (identificador && obj['Examens.identificador'] === identificador) })
                        if (!asig) {
                            next();
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
                            let identificador = Number(element.split("_")[2])
                            nuevaEntrada.fecha = moment(element.split("_")[4], "DD/MM/YYYY");
                            let asig = as.find(function (obj) { return (identificador && obj['Examens.identificador'] === identificador) })
                            if (!asig) {
                                next();
                            } else {
                                promises.push(models.Examen.update(
                                    nuevaEntrada, /* set attributes' value */
                                    { where: { identificador: identificador } } /* where criteria */
                                ))
                            }
                        });
                    }
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
                JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/coordinador/examenes"))
            }).catch(function (error) {
                next(error);
            });
        } else {
            req.session.save(function () {
            res.redirect("" + req.baseUrl + "/coordinador/examenes")
            })
        }
    })
}
