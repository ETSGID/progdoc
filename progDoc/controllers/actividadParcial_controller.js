let app = require('../app');
let models = require('../models');
let funciones = require('../funciones');
let estados = require('../estados');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let moment = require('moment');
let progDocController = require('./progDoc_controller');
let asignaturaController = require('./asignatura_controller')
let grupoController = require('./grupo_controller')
let cursoController = require('./curso_controller')

exports.getActividadParcial = async function (req, res, next) {
    req.session.submenu = "Actividades"
    let pdID = req.session.pdID;
    let grupos;
    let asignaturas;
    let conjuntoActividadesParcial;
    let view = req.originalUrl.toLowerCase().includes("consultar") ? "actividades/actividadesConsultar" : "actividades/actividadesCumplimentar"
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        res.render(view, {
            estado: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            planEstudios: res.locals.planEstudios,
            estadoCalendario: null,
            estadosCalendario: null,
            estadosProgDoc: null,
            estadoProgDoc: null,
            asignaturas: null,
            conjuntoActividadesParcial: null,
            grupos: null,
            cursos: null,
            aprobarpath: null,
            crearConjuntoActividadParcialPath: null,
            actualizarConjuntoActividadParcialPath: null,
            eliminarConjuntoActividadParcialPath: null,
            pdID: null,
            moment: null
        })
    }    //hay que comprobar que no sea una url de consultar.
    else if (estados.estadoCalendario.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoCalendario']
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render(view, {
            estado: "Asignación de actividades parciales ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y el Jefe de Estudios la apruebe",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            planEstudios: res.locals.planEstudios,
            estadoCalendario: null,
            estadosCalendario: null,
            estadosProgDoc: null,
            estadoProgDoc: null,
            asignaturas: null,
            conjuntoActividadesParcial: null,
            grupos: null,
            cursos: null,
            aprobarpath: null,
            crearConjuntoActividadParcialPath: null,
            actualizarConjuntoActividadParcialPath: null,
            eliminarConjuntoActividadParcialPath: null,
            pdID: null,
            moment: null
        })
    } else {
        try {
            let c = await cursoController.getCursos(pdID)
            //los cursos de ese plan
            cursos = c;
            let g = await grupoController.getGrupos2(pdID)
            //los grupos de las nuevas asignatuas
            grupos = g;
            let as = await asignaturaController.getAsignaturasProgDoc(pdID)
            asignaturas = as;
            let conjuntoActividadesParcial = await getAllActividadParcial([pdID])
            //res.json({calendarios: conjuntoActividadesParcial, asignaturas:asignaturas, grupos:grupos, cursos: cursos})
            res.render(view, {
                estado: null,
                permisoDenegado: res.locals.permisoDenegado,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                planEstudios: res.locals.planEstudios,
                estadoCalendario: res.locals.progDoc['ProgramacionDocentes.estadoCalendario'],
                estadosCalendario: estados.estadoCalendario,
                estadosProgDoc: estados.estadoProgDoc,
                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                asignaturas: asignaturas,
                conjuntoActividadesParcial: conjuntoActividadesParcial,
                grupos: grupos,
                cursos: cursos,
                aprobarpath: "" + req.baseUrl + "/coordiandor/aprobarActividades",
                crearConjuntoActividadParcialPath: "" + req.baseUrl + "/coordiandor/crearConjuntoActividadParcial",
                actualizarConjuntoActividadParcialPath: "" + req.baseUrl + "/coordiandor/actualizarConjuntoActividadParcial",
                eliminarConjuntoActividadParcialPath: "" + req.baseUrl + "/coordiandor/eliminarConjuntoActividadParcial",
                pdID: pdID,
                moment: moment
            })
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    }
}

//obtener todas las actividades parciales y los distitnos conjuntos de actividades parciales. pdID es un array porque pueden ser varias
async function getAllActividadParcial(pdID) {
    let conjuntoActividadesParcial = [];
    if (pdID) {
        try {
            let cs = await models.ConjuntoActividadParcial.findAll({
                where: {
                    ProgramacionDocenteId: {
                        [op.in]: pdID
                    }
                },
                order: [
                    [Sequelize.literal('"curso"'), 'ASC'],
                    [Sequelize.literal('"semestre"'), 'ASC'],
                ],
                include: [{
                    model: models.Grupo,
                    //left join
                    required: false
                }],
                raw: true
            })
            for (let c of cs) {
                let conjuntoActividadParcial = conjuntoActividadesParcial.find(function (obj) { return obj.identificador === c.identificador; });
                if (!conjuntoActividadParcial) {
                    conjuntoActividadParcial = {};
                    conjuntoActividadParcial.identificador = c.identificador;
                    conjuntoActividadParcial.notaInicial = c.notaInicial;
                    conjuntoActividadParcial.curso = c.curso;
                    conjuntoActividadParcial.semestre = c.semestre;
                    conjuntoActividadParcial.fechaInicio = funciones.formatFecha(c.fechaInicio);
                    conjuntoActividadParcial.fechaFin = funciones.formatFecha(c.fechaFin);
                    conjuntoActividadParcial.ProgramacionDocenteId = c.ProgramacionDocenteId;
                    conjuntoActividadParcial.grupos = [];
                    conjuntoActividadParcial.actividades = [];
                    conjuntoActividadesParcial.push(conjuntoActividadParcial)
                }
                if (c['Grupos.grupoId']) {
                    let grupo = {};
                    grupo.identificador = c['Grupos.grupoId'];
                    conjuntoActividadParcial.grupos.push(grupo);
                }
            }
            let acts = await models.ConjuntoActividadParcial.findAll({
                attributes: ['identificador'],
                where: {
                    ProgramacionDocenteId: pdID
                },
                include: [{
                    model: models.ActividadParcial,
                    //inner join
                    required: true
                }],
                order: [
                    [Sequelize.literal('"curso"'), 'ASC'],
                    [Sequelize.literal('"semestre"'), 'ASC'],
                    [Sequelize.literal('"ActividadParcials.fecha"'), 'ASC'],
                ],
                raw: true
            })
            for (let act of acts) {
                let conjuntoActividadParcial = conjuntoActividadesParcial.find(function (obj) { return obj.identificador === act.identificador; });
                let actividad = {};
                actividad.identificador = act['ActividadParcials.identificador'];
                actividad.horaInicio = act['ActividadParcials.horaInicio']
                actividad.duracion = act['ActividadParcials.duracion']
                actividad.descripcion = act['ActividadParcials.descripcion']
                actividad.fecha = funciones.formatFecha(act['ActividadParcials.fecha'])
                actividad.tipo = act['ActividadParcials.tipo']
                actividad.asignaturaId = act['ActividadParcials.AsignaturaId']
                conjuntoActividadParcial.actividades.push(actividad);

            }

            return conjuntoActividadesParcial;
        } 
        catch (error) {
            //se propaga el error lo captura el middleware
            throw error;
        }
    } else {
        return null
    }
}

// post 
exports.aprobarActividades = async function (req, res, next) {
    let pdID = req.session.pdID;
    let date = new Date();
    let estadoCalendario;
    try {
        let pd = await models.ProgramacionDocente.findOne(
            { where: { identificador: pdID }, attributes: ["estadoCalendario"] })
        estadoCalendario = pd['estadoCalendario']
        if (!res.locals.permisoDenegado) {
            switch (estadoCalendario) {
                case (estados.estadoCalendario.abierto):
                    estadoCalendario = estados.estadoCalendario.aprobadoCoordinador;
                    break;
                case (null):
                    estadoCalendario = estados.estadoCalendario.aprobadoCoordinador;
                    break;
                default:
                    break;
            }

            await models.ProgramacionDocente.update(
                {
                    estadoCalendario: estadoCalendario,
                    fechaCalendario: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            )
            req.session.save(function () {
                progDocController.isPDLista(pdID, res.redirect("" + req.baseUrl + "/cumplimentar/actividades"))
            })

        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/cumplimentar/actividades")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

// recibe la info de una actividad nueva y la crea en la asignatura y grupo correspondiente
exports.guardarActividad = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        let actividadToAnadir = {};
        //sino tiene asignaturaId se trata de una actividad de grupo
        actividadToAnadir.AsignaturaId = isNaN(req.body.asignaturaId) ? null : req.body.asignaturaId;
        actividadToAnadir.descripcion = req.body.descripcion;
        actividadToAnadir.tipo = req.body.tipo || 'act'
        actividadToAnadir.fecha = moment(req.body.fecha, "DD/MM/YYYY");
        actividadToAnadir.ConjuntoActividadParcialId = req.body.conjuntoActividadParcialId
        let hora = req.body.hora;
        let minutos = req.body.minutos;
        if (!minutos) minutos = '00';
        if (hora && minutos && moment(hora + ":" + minutos, "hh:mm").isValid()) {
            actividadToAnadir.horaInicio = hora + ":" + minutos;
        } else {
            actividadToAnadir.horaInicio = null;
        }
        actividadToAnadir.duracion = Number(req.body.duracion) || null;
        try {
            let nToAnadir = models.ActividadParcial.build(
                actividadToAnadir
            )
            let n = await nToAnadir.save()
            actividadToAnadir.identificador = n.identificador
            res.json({ success: true, accion: "create", actividadUpdate: actividadToAnadir })
        }
        catch (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        }
    } else {
        res.json({ success: false, msg: "No tiene permiso" })
    }
}

// recibe la info de una actividad existente y la actualiza en la asignatura tipo y descripcion correspondiente
exports.updateActividad = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        let actividadToUpdate = {};
        //sino tiene asignaturaId se trata de una actividad de grupo
        actividadToUpdate.AsignaturaId = isNaN(req.body.asignaturaId) ? null : req.body.asignaturaId;
        actividadToUpdate.descripcion = req.body.descripcion;
        actividadToUpdate.tipo = req.body.tipo || 'act'
        actividadToUpdate.fecha = moment(req.body.fecha, "DD/MM/YYYY");
        let hora = req.body.hora;
        let minutos = req.body.minutos;
        if (!minutos) minutos = '00';
        if (hora && minutos && moment(hora + ":" + minutos, "hh:mm").isValid()) {
            actividadToUpdate.horaInicio = hora + ":" + minutos;
        } else {
            actividadToUpdate.horaInicio = null;
        }
        actividadToUpdate.duracion = Number(req.body.duracion) || null;
        try {
            await models.ActividadParcial.update(
                actividadToUpdate,
                {
                    where: { identificador: req.body.actividadId }
                })
            res.json({ success: true, accion: "update", actividadUpdate: actividadToUpdate })
        }
        catch (error) {
            console.log("Error:", error);
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        }
    } else {
        res.json({ success: false, msg: "No tiene permiso" })
    }
}

// recibe la info de una actividad existente y la elimina
exports.eliminarActividad = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        try {
            await models.ActividadParcial.destroy({
                where: { identificador: req.body.actividadId }
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

// recibe la info de un conjuntoActividadParcial y la crea
exports.crearConjuntoActividadParcial = async function (req, res, next) {
    if (!res.locals.permisoDenegado) {
        let conjuntoActividadParcialToAnadir = {};
        conjuntoActividadParcialToAnadir.curso = Number(req.body.curso)
        conjuntoActividadParcialToAnadir.semestre = req.body.semestre
        conjuntoActividadParcialToAnadir.notaInicial = req.body.notaInicial
        if (moment(req.body.date_fInicio, "DD/MM/YYYY").isValid()) conjuntoActividadParcialToAnadir.fechaInicio = moment(req.body.date_fInicio, "DD/MM/YYYY");
        if (moment(req.body.date_fFin, "DD/MM/YYYY").isValid()) conjuntoActividadParcialToAnadir.fechaFin = moment(req.body.date_fFin, "DD/MM/YYYY");
        conjuntoActividadParcialToAnadir.ProgramacionDocenteId = req.session.pdID
        try {
            let nToAnadir = models.ConjuntoActividadParcial.build(
                conjuntoActividadParcialToAnadir
            )
            await nToAnadir.save()
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/cumplimentar/actividades")
            })
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/cumplimentar/actividades")
        })
    }
}

// recibe la info de un conjuntoActividadParcial existente y la actualiza 
exports.actualizarConjuntoActividadParcial = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        let conjuntoActividadParcialToUpdate = {};
        conjuntoActividadParcialToUpdate.notaInicial = req.body.notaInicial
        if (moment(req.body.date_fInicio, "DD/MM/YYYY").isValid()) conjuntoActividadParcialToUpdate.fechaInicio = moment(req.body.date_fInicio, "DD/MM/YYYY");
        if (moment(req.body.date_fFin, "DD/MM/YYYY").isValid()) conjuntoActividadParcialToUpdate.fechaFin = moment(req.body.date_fFin, "DD/MM/YYYY");
        let grupos = [];
        let gruposToAnadir = [];
        grupos = grupos.concat(req.body.selectGrupos)
        grupos.forEach(function (g) {
            if (!isNaN(g)) gruposToAnadir.push({ ConjuntoParcialId: req.body.conjuntoActividadParcialId, GrupoId: Number(g) })
        })
        try {
            await models.ConjuntoActividadParcialGrupo.destroy({
                where: { ConjuntoParcialId: req.body.conjuntoActividadParcialId }
            })
            await models.ConjuntoActividadParcial.update(
                conjuntoActividadParcialToUpdate,
                { where: { identificador: req.body.conjuntoActividadParcialId } })
            await models.ConjuntoActividadParcialGrupo.bulkCreate(
                gruposToAnadir
            )
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/cumplimentar/actividades")
            })
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/cumplimentar/actividades")
        })
    }
}

// recibe la info de un conjuntoActividadParcial
exports.eliminarConjuntoActividadParcial = async function (req, res) {
    if (!res.locals.permisoDenegado) {
        try {
            await models.ConjuntoActividadParcial.destroy({
                where: { identificador: req.body.conjuntoActividadParcialId }
            })
            await models.ActividadParcial.destroy({
                where: { ConjuntoActividadParcialId: null }
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

exports.getAllActividadParcial = getAllActividadParcial