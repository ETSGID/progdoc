let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');
let progDocController = require('../controllers/progDoc_controller');
let grupoController = require('./grupo_controller');


//para obtener las notas definidas para el grupo completo no ligadas a asignatura
async function getNotasGruposSinAsignatura(gruposBBDD) {
    try {
        gruposBBDD = gruposBBDD.map(function (g) {
            g.asignaciones = []
            return g
        })
        let gruposBBDDIds = gruposBBDD.map(function (g) {
            return g.grupoId;
        });
        let notas = await models.AsignacionProfesor.findAll({
            where: {
                AsignaturaId: { [op.eq]: null },
                GrupoId: { [op.in]: gruposBBDDIds },
                Nota: { [op.ne]: null }
            },
            raw: true
        })
        notas.forEach(function (nota) {
            let n = {}
            n.identificador = nota.identificador
            n.nota = nota.Nota
            //como nombre de asignatura se pone el nombre del grupo
            n.asignaturaAcronimo = gruposBBDD.find(function (obj) { return obj.grupoId === nota.GrupoId }).nombre
            n.asignaturaNombre = "Nota de grupo"
            n.asignaturaIdentificador = "grupo"
            n.asignaturaCodigo = gruposBBDD.find(function (obj) { return obj.grupoId === nota.GrupoId }).nombre
            gruposBBDD.find(function (obj) { return obj.grupoId === nota.GrupoId }).asignaciones.push(n)
        })
        return gruposBBDD
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

// GET /respDoc/:pdID/:departamentoID/Horario
exports.getHorario = async function (req, res, next) {
    req.session.submenu = "Horarios";
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "horarios/horariosConsultar" : "horarios/horariosCumplimentar"
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
        res.render("horarios/horariosCumplimentar", {
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
        try {
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
            gruposBBDD = await grupoController.getGrupos2(pdID)
            let gruposBBDDConNotas = await getNotasGruposSinAsignatura(gruposBBDD)
            getAsignacionHorario(pdID);
            gruposBBDD = gruposBBDDConNotas
            async function getAsignacionHorario(ProgramacionDocenteIdentificador) {
                //busco las asignaturas con departamento responsable ya que son las que entran en el horario
                let horarioAsignaturas = await models.Asignatura.findAll({
                    where: {
                        ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
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
                horarioAsignaturas.forEach(function (horarioAsignatura) {
                    let GrupoNombre = horarioAsignatura['AsignacionProfesors.Grupo.nombre']
                    //lo convierto en string
                    c = asignacionsHorario.find(function (obj) { return obj.curso === horarioAsignatura['curso']; });
                    //si el curso no está lo añado
                    if (!c) {
                        cursos.push(horarioAsignatura['curso'])
                        let cursoAsignacion = {};
                        cursoAsignacion.curso = horarioAsignatura['curso'];
                        cursoAsignacion.semestres = [];
                        let coincidenciasGrupos;
                        let coincidenciasGrupos1;
                        let coincidenciasGrupos2;
                        switch (pdID.split("_")[3]) {
                            case '1S':
                                coincidenciasGrupos = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(horarioAsignatura['curso']) && Number(gr.nombre.split(".")[1]) === 1)
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
                                    gr => (Number(gr.curso) === Number(horarioAsignatura['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                                );
                                coincidenciasGrupos = coincidenciasGrupos.map(function (e) {
                                    e.grupoNombre = e.nombre;
                                    e.grupoCodigo = e.grupoId; e.asignaturas = []; return e
                                })
                                cursoAsignacion.semestres = [{ semestre: 2, grupos: coincidenciasGrupos }];
                                break;
                            default:
                                coincidenciasGrupos1 = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(horarioAsignatura['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                                );
                                coincidenciasGrupos2 = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(horarioAsignatura['curso']) && Number(gr.nombre.split(".")[1]) === 2)
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
                        c = asignacionsHorario.find(function (obj) { return obj.curso === horarioAsignatura['curso']; });
                    }
                    let asign = asignaturas.find(function (obj) { return obj.nombre === horarioAsignatura['nombre']; });
                    if (!asign) {
                        asign = {}
                        asign.acronimo = horarioAsignatura.acronimo;
                        asign.nombre = horarioAsignatura.nombre;
                        asign.codigo = horarioAsignatura.codigo;
                        asign.identificador = horarioAsignatura.identificador;
                        asign.semestre = horarioAsignatura['semestre'];
                        asign.curso = horarioAsignatura.curso;
                        let s1;
                        let s2;
                        switch (pdID.split("_")[3]) {
                            case '1S':
                                s1 = (horarioAsignatura.semestre === '1S' || horarioAsignatura.semestre === '1S-2S' || horarioAsignatura.semestre === 'A' || horarioAsignatura.semestre === 'I')
                                s2 = false;
                                break;
                            case '2S':
                                s1 = false;
                                s2 = (horarioAsignatura.semestre === '2S' || horarioAsignatura.semestre === '1S-2S' || horarioAsignatura.semestre === 'A' || horarioAsignatura.semestre === 'I')
                                break;
                            default:
                                s1 = (horarioAsignatura.semestre === '1S' || horarioAsignatura.semestre === '1S-2S' || horarioAsignatura.semestre === 'A' || horarioAsignatura.semestre === 'I')
                                s2 = (horarioAsignatura.semestre === '2S' || horarioAsignatura.semestre === '1S-2S' || horarioAsignatura.semestre === 'A' || horarioAsignatura.semestre === 'I')
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
                            let g = s.grupos.find(function (obj) { return obj.grupoId === horarioAsignatura['AsignacionProfesors.GrupoId']; });
                            //busco si está la asignatura
                            if (g) {
                                let a = g.asignaturas.find(function (obj) { return obj.grupoCodigo === horarioAsignatura['identificador']; });

                                //miro si la asignacion no está vacía
                                if (horarioAsignatura['AsignacionProfesors.Dia'] !== null || horarioAsignatura['AsignacionProfesors.Nota'] !== null) {
                                    let asignacion = {};
                                    asignacion.identificador = horarioAsignatura['AsignacionProfesors.identificador']
                                    asignacion.dia = horarioAsignatura['AsignacionProfesors.Dia'];
                                    asignacion.horaInicio = horarioAsignatura['AsignacionProfesors.HoraInicio']
                                    asignacion.duracion = horarioAsignatura['AsignacionProfesors.Duracion']
                                    asignacion.nota = horarioAsignatura['AsignacionProfesors.Nota']
                                    asignacion.asignaturaAcronimo = horarioAsignatura['acronimo'];
                                    asignacion.asignaturaNombre = horarioAsignatura['nombre'];
                                    asignacion.asignaturaIdentificador = horarioAsignatura['identificador'];
                                    asignacion.asignaturaCodigo = horarioAsignatura['codigo'];
                                    g.asignaciones.push(asignacion);
                                }
                            }
                        }
                    }
                })
                let cancelarpath = "" + req.baseUrl + "/coordinador/horarios?planID=" + req.session.planID
                let nuevopath = "" + req.baseUrl + "/coordinador/guardarHorarios"
                let view = req.originalUrl.toLowerCase().includes("consultar") ? "horarios/horariosConsultar" : "horarios/horariosCumplimentar"
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
            }
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    }

}

exports.guardarHorarios = async function (req, res, next) {
    let whereEliminar = {};
    let pdID = req.session.pdID
    let toEliminar = req.body.eliminar
    let promises = [];
    if (!res.locals.permisoDenegado) {
        try {
            let asignaturaAsignacions = await models.Asignatura.findAll({
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
            if (toEliminar) {
                if (!Array.isArray(toEliminar)) {
                    toEliminar = [toEliminar]
                }
                whereEliminar.identificador = [];
                toEliminar.forEach(function (element, index) {
                    let asignacion;
                    if (element.split("_").length === 7) {
                        //si es una hora
                        asignacion = Number(element.split("_")[6])
                        let asig = asignaturaAsignacions.find(function (obj) { return (asignacion && obj['AsignacionProfesors.identificador'] === asignacion) })
                        if (!asig || !asig['AsignacionProfesors.Dia']) {
                            console.log("Intenta cambiar una nota o un profesor")
                        } else {
                            whereEliminar.identificador.push(asignacion);
                        }
                    } else {
                    }
                });
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
                    toAnadir = [toAnadir]
                }
                toAnadir.forEach(function (element) {
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
                    let asig = asignaturaAsignacions.find(function (obj) { return (nuevaEntrada.AsignaturaId && obj.identificador === nuevaEntrada.AsignaturaId) })
                    if (!asig) {
                        console.log("Ha intentado cambiar una asignatura que no puede")
                    } else {
                        queryToAnadir.push(nuevaEntrada);
                    }
                });
                let promise2 = models.AsignacionProfesor.bulkCreate(
                    queryToAnadir
                )
                promises.push(promise2)
            }
            await Promise.all(promises)
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
// recibe la info de una nota nueva y la crea en la asignatura y grupo correspondiente
exports.guardarNota = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        try {
            let notaToAnadir = {};
            //sino tiene asignaturaId se trata de una nota de grupo
            notaToAnadir.AsignaturaId = isNaN(req.body.asignaturaId) ? null : req.body.asignaturaId;
            notaToAnadir.GrupoId = req.body.grupoId;
            notaToAnadir.Nota = req.body.nota;
            let nToAnadir = models.AsignacionProfesor.build(
                notaToAnadir
            )
            let n = await nToAnadir.save();
            notaToAnadir.identificador = n.identificador;
            res.json({ success: true, accion: "create", notaUpdate: notaToAnadir });
        }
        catch (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        }
    } else {
        res.json({ success: false, msg: "No tiene permiso" })
    }
}

// recibe la info de una nota existente y la actualiza en la asignatura y grupo correspondiente
exports.updateNota = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        try {
            let notaToUpdate = {};
            //sino tiene asignaturaId se trata de una nota de grupo
            notaToUpdate.AsignaturaId = isNaN(req.body.asignaturaId) ? null : req.body.asignaturaId;
            notaToUpdate.Nota = req.body.nota;
            await models.AsignacionProfesor.update(
                notaToUpdate,
                { where: { identificador: req.body.notaId } })
            res.json({ success: true, accion: "update", notaUpdate: notaToUpdate })
        }
        catch (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        }
    } else {
        res.json({ success: false, msg: "No tiene permiso" })
    }
}
// recibe la info de una nota existente y la elimina
exports.eliminarNota = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        try {
            await models.AsignacionProfesor.destroy({
                where: { identificador: req.body.notaId }
            })
            res.json({ success: true })
        }
        catch (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        }
    } else {
        res.json({ success: false, msg: "No tiene permiso" })
    }
}

//get
exports.reenviar = function (req, res, next) {
    req.session.save(function () {
        res.redirect("" + req.baseUrl + "/coordinador/horarios?departamentoID=" + req.session.departamentoID + "&planID=" + req.session.planID);
    })
}
// post 
exports.aprobarHorarios = async function (req, res, next) {
    let pdID = req.session.pdID;
    let date = new Date();
    let estadoHorarios;
    try {
        let pd = await models.ProgramacionDocente.findOne
            ({ where: { identificador: pdID }, attributes: ["estadoHorarios"] })
        estadoHorarios = pd['estadoHorarios']
        if (!res.locals.permisoDenegado) {
            switch (estadoHorarios) {
                case (estados.estadoHorario.abierto):
                    estadoHorarios = estados.estadoHorario.aprobadoCoordinador;
                    break;
                default:
                    break;
            }
            await models.ProgramacionDocente.update(
                {
                    estadoHorarios: estadoHorarios,
                    fechaHorarios: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            )
            req.session.save(function () {
                progDocController.isPDLista(pdID, res.redirect("" + req.baseUrl + "/coordinador/horarios"))
            })
        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/coordinador/horarios")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}


