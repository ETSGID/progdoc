let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let funciones = require('../funciones');
let JEcontroller = require('../controllers/JE_controller')
let menuProgDocController = require('../controllers/menuProgDoc_controller')


//para obtener las notas definidas para el grupo completo no ligadas a asignatura
function getNotasGruposSinAsignatura (gruposBBDD) {
    gruposBBDD = gruposBBDD.map(function (g){
        g.asignaciones = []
        return g
    })
    let gruposBBDDIds = gruposBBDD.map(function (g) {
        return g.grupoId;
    });
    return models.AsignacionProfesor.findAll({
        where: {
            AsignaturaId : {[op.eq]: null},
            GrupoId: {[op.in]: gruposBBDDIds},
            Nota : {[op.ne]: null}
        },
        raw:true
    }).each(function(nota){
        let n = {}
        n.identificador = nota.identificador
        n.nota = nota.Nota
        //como nombre de asignatura se pone el nombre del grupo
        n.asignaturaAcronimo = gruposBBDD.find(function (obj) { return obj.grupoId === nota.GrupoId }).nombre
        n.asignaturaNombre = "Nota de grupo"
        n.asignaturaIdentificador = "grupo"
        n.asignaturaCodigo = gruposBBDD.find(function (obj) { return obj.grupoId === nota.GrupoId }).nombre
        gruposBBDD.find(function(obj){ return obj.grupoId === nota.GrupoId}).asignaciones.push(n)
    }).then(function(){
        return gruposBBDD
    })

}

// GET /respDoc/:pdID/:departamentoID/Horario
exports.getHorario = function (req, res, next) {

    req.session.submenu = "Horarios"

    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "horariosConsultar" : "horariosCumplimentar"
        res.render(view, {
            estado: "Programación docente no abierta",
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
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("horariosCumplimentar", {
            estado: "Asignación de horarios ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y el Jefe de Estudios la apruebe",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            planEstudios: res.locals.planEstudios,
            estadoHorarios: res.locals.progDoc['ProgramacionDocentes.estadoHorarios'],
            asignacionsHorario: null
        })
    } else {
        let asignacionsHorario = []; //asignaciones existentes
        let cursos = []; //array con los cursos por separado
        let asignaturas = []; //array con los acronimos de las asignaturas por separado
        let gruposBBDD;
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
        return menuProgDocController.getGrupos(pdID)
        .then(function (grupos) {
            gruposBBDD = grupos
            return getNotasGruposSinAsignatura(gruposBBDD)
        })
        .then(function(gruposBBDDConNotas){
            getAsignacionHorario(pdID);
            gruposBBDD = gruposBBDDConNotas

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
                    attributes: ['acronimo', 'codigo', 'curso', 'identificador', 'nombre', 'semestre', 'codigo'],
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
                                    //al reformatear el codigo pongo el grupoCodigo y el grupoNombre
                                    coincidenciasGrupos = coincidenciasGrupos.map(function (e) {
                                        e.grupoNombre = e.nombre;
                                        e.grupoCodigo = e.grupoId; e.asignaturas = []; return e
                                    })
                                    cursoAsignacion.semestres = [{ semestre: 1, grupos: coincidenciasGrupos }];
                                    break;
                                case '2S':
                                    coincidenciasGrupos = gruposBBDD.filter(
                                        gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                                    );
                                    coincidenciasGrupos = coincidenciasGrupos.map(function (e) {
                                        e.grupoNombre = e.nombre;
                                        e.grupoCodigo = e.grupoId; e.asignaturas = []; return e
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
                                        e.grupoCodigo = e.grupoId; e.asignaturas = []; return e
                                    })
                                    coincidenciasGrupos2 = coincidenciasGrupos2.map(function (e) {
                                        e.grupoNombre = e.nombre;
                                        e.grupoCodigo = e.grupoId; e.asignaturas = []; return e
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
                            asign.nombre = ej.nombre;
                            asign.codigo = ej.codigo;
                            asign.identificador = ej.identificador;
                            asign.semestre = ej['semestre'];
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
                            if (s) {
                                //busco el grupo ya se inició
                                let g = s.grupos.find(function (obj) { return obj.grupoId === ej['AsignacionProfesors.GrupoId']; });
                                //busco si está la asignatura
                                if (g) {
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
                                        asignacion.asignaturaCodigo = ej['codigo'];
                                        g.asignaciones.push(asignacion);
                                    }
                                }
                            }
                        }
                    })
                    .then(function (e) {
                        let cancelarpath = "" + req.baseUrl + "/coordinador/horarios?planID=" + req.session.planID
                        let nuevopath = "" + req.baseUrl + "/coordinador/guardarHorarios"
                        let view = req.originalUrl.toLowerCase().includes("consultar") ? "horariosConsultar" : "horariosCumplimentar"
                        res.render(view,
                            {
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
            }).catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
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
// recibe la info de una nota nueva y la crea en la asignatura y grupo correspondiente
exports.guardarNota = function (req, res) {
if(!res.locals.permisoDenegado){
    let notaToAnadir = {};
    //sino tiene asignaturaId se trata de una nota de grupo
    notaToAnadir.AsignaturaId = isNaN (req.body.asignaturaId) ? null : req.body.asignaturaId;
    notaToAnadir.GrupoId = req.body.grupoId;
    notaToAnadir.Nota = req.body.nota;
    let nToAnadir = models.AsignacionProfesor.build(
        notaToAnadir
    )
    return nToAnadir.save()
        .then((n) => {
            notaToAnadir.identificador = n.identificador
            res.json({success: true, accion:"create", notaUpdate : notaToAnadir })
        })
        .catch(function (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        });
    }else{
        res.json({success: false, msg: "No tiene permiso"})
    }
}

// recibe la info de una nota existente y la actualiza en la asignatura y grupo correspondiente
exports.updateNota = function (req, res) {
    if(!res.locals.permisoDenegado){
    let notaToUpdate = {};
    //sino tiene asignaturaId se trata de una nota de grupo
    notaToUpdate.AsignaturaId = isNaN(req.body.asignaturaId) ? null : req.body.asignaturaId;
    notaToUpdate.Nota = req.body.nota;
    return models.AsignacionProfesor.update(
        notaToUpdate,
        { where: { identificador: req.body.notaId} })
        .then((n) => {
            res.json({ success: true, accion:"update", notaUpdate: notaToUpdate })
        })
        .catch(function (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        });
    }else{
        res.json({success: false, msg: "No tiene permiso"})
    }
}
// recibe la info de una nota existente y la elimina
exports.eliminarNota = function (req, res) {
    if(!res.locals.permisoDenegado){
    return models.AsignacionProfesor.destroy({
        where: {identificador: req.body.notaId}
    })
        .then((n) => {
            res.json({ success: true})
        })
        .catch(function (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        });
    }else{
        res.json({success: false, msg: "No tiene permiso"})
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


