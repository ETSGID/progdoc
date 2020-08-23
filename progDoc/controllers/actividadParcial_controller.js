const Sequelize = require('sequelize');
const moment = require('moment');
const models = require('../models');
const helpers = require('../lib/helpers');
const estados = require('../estados');
const enumsPD = require('../enumsPD');

const op = Sequelize.Op;
const progDocController = require('./progDoc_controller');
const asignaturaController = require('./asignatura_controller');
const grupoController = require('./grupo_controller');
const cursoController = require('./curso_controller');

exports.getActividadParcial = async (req, res, next) => {
  const { pdID } = req.session;
  let grupos;
  let asignaturas;
  const view =
    req.session.menuBar === enumsPD.menuBar.consultar.nombre
      ? 'actividades/actividadesConsultar'
      : 'actividades/actividadesCumplimentar';
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
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
      pdID: null,
      moment: null
    });
    // hay que comprobar que no sea una url de consultar.
  } else if (
    estados.estadoCalendario.abierto !==
      res.locals.progDoc['ProgramacionDocentes.estadoCalendario'] &&
    (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
      estados.estadoProgDoc.abierto ||
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
        estados.estadoProgDoc.listo) &&
    req.session.menuBar !== enumsPD.menuBar.consultar.nombre
  ) {
    res.render(view, {
      estado:
        'Asignación de actividades parciales ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y Jefatura de Estudios la apruebe',
      permisoDenegado: res.locals.permisoDenegado || null,
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
      pdID: null,
      moment: null
    });
  } else {
    try {
      const c = await cursoController.getCursos(pdID);
      // los cursos de ese plan
      const cursos = c;
      const g = await grupoController.getGrupos2(pdID);
      // los grupos de las nuevas asignatuas
      grupos = g;
      const as = await asignaturaController.getAsignaturasProgDoc(pdID);
      asignaturas = as;
      // eslint-disable-next-line no-use-before-define
      const conjuntoActividadesParcial = await getAllActividadParcial([pdID]);
      /*
      res.json({calendarios: conjuntoActividadesParcial,
        asignaturas:asignaturas, grupos:grupos, cursos: cursos})
      */
      res.render(view, {
        permisoDenegado: res.locals.permisoDenegado || null,
        planEstudios: res.locals.planEstudios,
        estadoCalendario:
          res.locals.progDoc['ProgramacionDocentes.estadoCalendario'],
        estadosCalendario: estados.estadoCalendario,
        estadosProgDoc: estados.estadoProgDoc,
        estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
        asignaturas,
        conjuntoActividadesParcial,
        grupos,
        cursos,
        aprobarpath: `${req.baseUrl}/estado`,
        pdID,
        moment
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }
};

/*
obtener todas las actividades parciales y los distitnos conjuntos de actividades parciales.
pdID es un array porque pueden ser varias.
*/
const getAllActividadParcial = async pdID => {
  const conjuntoActividadesParcial = [];
  if (pdID) {
    // eslint-disable-next-line no-useless-catch
    try {
      const cs = await models.ConjuntoActividadParcial.findAll({
        where: {
          ProgramacionDocenteId: {
            [op.in]: pdID
          }
        },
        order: [
          [Sequelize.literal('"curso"'), 'ASC'],
          [Sequelize.literal('"semestre"'), 'ASC']
        ],
        include: [
          {
            model: models.Grupo,
            // left join
            required: false
          }
        ],
        raw: true
      });
      for (const c of cs) {
        let conjuntoActividadParcial = conjuntoActividadesParcial.find(
          obj => obj.identificador === c.identificador
        );
        if (!conjuntoActividadParcial) {
          conjuntoActividadParcial = {};
          conjuntoActividadParcial.identificador = c.identificador;
          conjuntoActividadParcial.notaInicial = c.notaInicial;
          conjuntoActividadParcial.curso = c.curso;
          conjuntoActividadParcial.semestre = c.semestre;
          conjuntoActividadParcial.fechaInicio = helpers.formatFecha(
            c.fechaInicio
          );
          conjuntoActividadParcial.fechaFin = helpers.formatFecha(c.fechaFin);
          conjuntoActividadParcial.ProgramacionDocenteId =
            c.ProgramacionDocenteId;
          conjuntoActividadParcial.grupos = [];
          conjuntoActividadParcial.actividades = [];
          conjuntoActividadesParcial.push(conjuntoActividadParcial);
        }
        if (c['Grupos.grupoId']) {
          const grupo = {};
          grupo.identificador = c['Grupos.grupoId'];
          conjuntoActividadParcial.grupos.push(grupo);
        }
      }
      const acts = await models.ConjuntoActividadParcial.findAll({
        attributes: ['identificador'],
        where: {
          ProgramacionDocenteId: pdID
        },
        include: [
          {
            model: models.ActividadParcial,
            // inner join
            required: true
          }
        ],
        order: [
          [Sequelize.literal('"curso"'), 'ASC'],
          [Sequelize.literal('"semestre"'), 'ASC'],
          [Sequelize.literal('"ActividadParcials.fecha"'), 'ASC']
        ],
        raw: true
      });
      for (const act of acts) {
        const conjuntoActividadParcial = conjuntoActividadesParcial.find(
          obj => obj.identificador === act.identificador
        );
        const actividad = {};
        actividad.identificador = act['ActividadParcials.identificador'];
        actividad.horaInicio = act['ActividadParcials.horaInicio'];
        actividad.duracion = act['ActividadParcials.duracion'];
        actividad.descripcion = act['ActividadParcials.descripcion'];
        actividad.fecha = helpers.formatFecha(act['ActividadParcials.fecha']);
        actividad.tipo = act['ActividadParcials.tipo'];
        actividad.asignaturaId = act['ActividadParcials.AsignaturaId'];
        conjuntoActividadParcial.actividades.push(actividad);
      }

      return conjuntoActividadesParcial;
    } catch (error) {
      // se propaga el error lo captura el middleware
      throw error;
    }
  } else {
    return null;
  }
};

// post
exports.aprobarActividades = async (req, res, next) => {
  const { pdID } = req.session;
  const date = new Date();
  let estadoCalendario;
  try {
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: pdID },
      attributes: ['estadoCalendario']
    });
    estadoCalendario = pd.estadoCalendario;
    if (!res.locals.permisoDenegado) {
      switch (estadoCalendario) {
        case estados.estadoCalendario.abierto:
          estadoCalendario = estados.estadoCalendario.aprobadoCoordinador;
          break;
        case null:
          estadoCalendario = estados.estadoCalendario.aprobadoCoordinador;
          break;
        default:
          break;
      }

      await models.ProgramacionDocente.update(
        {
          estadoCalendario,
          fechaCalendario: date
        } /* set attributes' value */,
        { where: { identificador: pdID } } /* where criteria */
      );
      req.session.save(() => {
        progDocController.isPDLista(pdID, res.redirect(req.baseUrl));
      });
    } else {
      req.session.save(() => {
        res.redirect(req.baseUrl);
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// recibe la info de una actividad nueva y la crea en la asignatura y grupo correspondiente
exports.guardarActividad = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    const actividadToAnadir = {};
    // sino tiene asignaturaId se trata de una actividad de grupo
    // eslint-disable-next-line no-restricted-globals
    actividadToAnadir.AsignaturaId = isNaN(req.body.asignaturaId)
      ? null
      : req.body.asignaturaId;
    actividadToAnadir.descripcion = req.body.descripcion;
    actividadToAnadir.tipo = req.body.tipo || 'act';
    actividadToAnadir.fecha = moment(req.body.fecha, 'DD/MM/YYYY');
    actividadToAnadir.ConjuntoActividadParcialId =
      req.body.conjuntoActividadParcialId;
    const { hora } = req.body;
    let { minutos } = req.body;
    if (!minutos) minutos = '00';
    if (hora && minutos && moment(`${hora}:${minutos}`, 'hh:mm').isValid()) {
      actividadToAnadir.horaInicio = `${hora}:${minutos}`;
    } else {
      actividadToAnadir.horaInicio = null;
    }
    actividadToAnadir.duracion = Number(req.body.duracion) || null;
    try {
      const nToAnadir = models.ActividadParcial.build(actividadToAnadir);
      const n = await nToAnadir.save();
      actividadToAnadir.identificador = n.identificador;
      res.json({
        success: true,
        accion: 'create',
        actividadUpdate: actividadToAnadir
      });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};

/*
recibe la info de una actividad existente y la actualiza en la asignatura tipo
y descripcion correspondiente.
*/
exports.updateActividad = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    const actividadToUpdate = {};
    // sino tiene asignaturaId se trata de una actividad de grupo
    // eslint-disable-next-line no-restricted-globals
    actividadToUpdate.AsignaturaId = isNaN(req.body.asignaturaId)
      ? null
      : req.body.asignaturaId;
    actividadToUpdate.descripcion = req.body.descripcion;
    actividadToUpdate.tipo = req.body.tipo || 'act';
    actividadToUpdate.fecha = moment(req.body.fecha, 'DD/MM/YYYY');
    const { hora } = req.body;
    let { minutos } = req.body;
    if (!minutos) minutos = '00';
    if (hora && minutos && moment(`${hora}:${minutos}`, 'hh:mm').isValid()) {
      actividadToUpdate.horaInicio = `${hora}:${minutos}`;
    } else {
      actividadToUpdate.horaInicio = null;
    }
    actividadToUpdate.duracion = Number(req.body.duracion) || null;
    try {
      await models.ActividadParcial.update(actividadToUpdate, {
        where: { identificador: req.params.id }
      });
      res.json({
        success: true,
        accion: 'update',
        actividadUpdate: actividadToUpdate
      });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};

// recibe la info de una actividad existente y la elimina
exports.eliminarActividad = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      await models.ActividadParcial.destroy({
        where: { identificador: req.params.id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};

// recibe la info de un conjuntoActividadParcial y la crea
exports.crearConjuntoActividadParcial = async (req, res, next) => {
  if (!res.locals.permisoDenegado) {
    const conjuntoActividadParcialToAnadir = {};
    conjuntoActividadParcialToAnadir.curso = Number(req.body.curso);
    conjuntoActividadParcialToAnadir.semestre = req.body.semestre;
    conjuntoActividadParcialToAnadir.notaInicial = req.body.notaInicial;
    if (moment(req.body.date_fInicio, 'DD/MM/YYYY').isValid())
      conjuntoActividadParcialToAnadir.fechaInicio = moment(
        req.body.date_fInicio,
        'DD/MM/YYYY'
      );
    if (moment(req.body.date_fFin, 'DD/MM/YYYY').isValid())
      conjuntoActividadParcialToAnadir.fechaFin = moment(
        req.body.date_fFin,
        'DD/MM/YYYY'
      );
    conjuntoActividadParcialToAnadir.ProgramacionDocenteId = req.session.pdID;
    try {
      const nToAnadir = models.ConjuntoActividadParcial.build(
        conjuntoActividadParcialToAnadir
      );
      await nToAnadir.save();
      req.session.save(() => {
        res.redirect(req.baseUrl);
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    req.session.save(() => {
      res.redirect(req.baseUrl);
    });
  }
};

// recibe la info de un conjuntoActividadParcial existente y la actualiza
exports.actualizarConjuntoActividadParcial = async (req, res, next) => {
  if (!res.locals.permisoDenegado) {
    const conjuntoActividadParcialToUpdate = {};
    conjuntoActividadParcialToUpdate.notaInicial = req.body.notaInicial;
    if (moment(req.body.date_fInicio, 'DD/MM/YYYY').isValid())
      conjuntoActividadParcialToUpdate.fechaInicio = moment(
        req.body.date_fInicio,
        'DD/MM/YYYY'
      );
    if (moment(req.body.date_fFin, 'DD/MM/YYYY').isValid())
      conjuntoActividadParcialToUpdate.fechaFin = moment(
        req.body.date_fFin,
        'DD/MM/YYYY'
      );
    let grupos = [];
    const gruposToAnadir = [];
    grupos = grupos.concat(req.body.selectGrupos);
    grupos.forEach(g => {
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(g)) {
        gruposToAnadir.push({
          ConjuntoParcialId: req.params.id,
          GrupoId: Number(g)
        });
      }
    });
    try {
      await models.ConjuntoActividadParcialGrupo.destroy({
        where: { ConjuntoParcialId: req.params.id }
      });
      await models.ConjuntoActividadParcial.update(
        conjuntoActividadParcialToUpdate,
        { where: { identificador: req.params.id } }
      );
      await models.ConjuntoActividadParcialGrupo.bulkCreate(gruposToAnadir);
      req.session.save(() => {
        res.redirect(req.baseUrl);
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    req.session.save(() => {
      res.redirect(req.baseUrl);
    });
  }
};

// recibe la info de un conjuntoActividadParcial
exports.eliminarConjuntoActividadParcial = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      await models.ConjuntoActividadParcial.destroy({
        where: { identificador: req.params.id }
      });
      await models.ActividadParcial.destroy({
        where: { ConjuntoActividadParcialId: null }
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};

exports.getAllActividadParcial = getAllActividadParcial;
