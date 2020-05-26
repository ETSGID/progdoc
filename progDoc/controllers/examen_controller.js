/* global PATH_PDF */
const Sequelize = require('sequelize');
const moment = require('moment');
const fs = require('fs').promises;
const json2csv = require('json2csv').parse;
const models = require('../models');

const op = Sequelize.Op;
const estados = require('../estados');
const enumsPD = require('../enumsPD');
const funciones = require('../funciones');
const progDocController = require('./progDoc_controller');
const planController = require('./plan_controller');

async function getFranjasExamenes(pdID) {
  // eslint-disable-next-line no-useless-catch
  try {
    const franjasExamen = [];
    const tipo = progDocController.getTipoPd(pdID);
    switch (tipo) {
      case '1S':
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S1_O,
          periodoNombre: 'Periodo Ordinario 1º Semestre',
          franjas: []
        });
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S1_E,
          periodoNombre: 'Periodo Extraordinario 1º Semestre',
          franjas: []
        });
        break;
      case '2S':
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S2_O,
          periodoNombre: 'Periodo Ordinario 2º Semestre',
          franjas: []
        });
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S2_E,
          periodoNombre: 'Periodo Extraordinario 2º Semestre',
          franjas: []
        });
        break;
      case 'I':
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S1_O,
          periodoNombre: 'Periodo Ordinario 1º Semestre',
          franjas: []
        });
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S1_E,
          periodoNombre: 'Periodo Extraordinario 1º Semestre',
          franjas: []
        });
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S2_O,
          periodoNombre: 'Periodo Ordinario 2º Semestre',
          franjas: []
        });
        franjasExamen.push({
          periodo: enumsPD.periodoPD.S2_E,
          periodoNombre: 'Periodo Extraordinario 2º Semestre',
          franjas: []
        });
        break;
      default:
        break;
    }
    const franjas = await models.FranjaExamen.findAll({
      where: {
        ProgramacionDocenteId: pdID
      },
      order: [
        [Sequelize.literal('"FranjaExamen"."periodo"'), 'ASC'],
        [Sequelize.literal('"FranjaExamen"."horaInicio"'), 'ASC']
      ]
    });
    franjas.forEach(franja => {
      const f = franjasExamen.find(obj => obj.periodo === franja.periodo);
      // si la franja no está la añado
      if (f) {
        f.franjas.push(franja);
      }
    });
    return franjasExamen;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
}

// funcion que devuelve las franjas de examenes pasandole la pdID
exports.getFranjas = async function(req, res, next) {
  if (req.session.pdID) {
    try {
      const franjasExamen = await getFranjasExamenes(req.session.pdID);
      res.locals.franjasExamen = franjasExamen;
      next();
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

// eslint-disable-next-line consistent-return
exports.getExamenes = async function(req, res, next) {
  const asignacionsExamen = []; // asignaciones existentes
  if (req.session.pdID) {
    try {
      const { pdID } = req.session;
      const anoFinal =
        2000 + Number(`${pdID.split('_')[2][4]}${pdID.split('_')[2][5]}`);
      switch (progDocController.getTipoPd(req.session.pdID)) {
        case 'I':
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S1_O,
            periodoNombre: `Periodo Ordinario 1º Semestre (Enero ${anoFinal})`,
            asignaturas: []
          });
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S1_E,
            periodoNombre: `Periodo Extraordinario 1º Semestre (Julio ${anoFinal})`,
            asignaturas: []
          });
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S2_O,
            periodoNombre: `Periodo Ordinario 2º Semestre  (Junio ${anoFinal})`,
            asignaturas: []
          });
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S2_E,
            periodoNombre: `Periodo Extraordinario 2º Semestre (Julio ${anoFinal})`,
            asignaturas: []
          });
          break;
        case '1S':
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S1_O,
            periodoNombre: `Periodo Ordinario 1º Semestre (Enero ${anoFinal})`,
            asignaturas: []
          });
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S1_E,
            periodoNombre: `Periodo Extraordinario 1º Semestre (Julio ${anoFinal})`,
            asignaturas: []
          });
          break;
        case '2S':
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S2_O,
            periodoNombre: `Periodo Ordinario 2º Semestre  (Junio ${anoFinal})`,
            asignaturas: []
          });
          asignacionsExamen.push({
            periodo: enumsPD.periodoPD.S2_E,
            periodoNombre: `Periodo Extraordinario 2º Semestre (Julio ${anoFinal})`,
            asignaturas: []
          });
          break;
        default:
          break;
      }
      const cursos = []; // array con los cursos por separado
      /*
      sino se especifica departamento se queda con el primero del plan responsable.
      Arriba comprobé que existe el departamento en la pos 0.
      */
      let departamentoID;
      if (
        res.locals.departamentosResponsables &&
        res.locals.departamentosResponsables.length > 0
      ) {
        departamentoID = req.session.departamentoID
          ? req.session.departamentoID
          : res.locals.departamentosResponsables[0].codigo;
      } else {
        departamentoID = req.session.departamentoID
          ? req.session.departamentoID
          : null;
      }
      // si no estaba inicializada la inicializo.
      req.session.departamentoID = departamentoID;
      // eslint-disable-next-line no-use-before-define
      return getAsignacionExamen(pdID);
      // eslint-disable-next-line no-inner-declarations
      async function getAsignacionExamen(ProgramacionDocenteIdentificador) {
        /* busca las asignaturas con departamento responsable
         ya que son las que entran en los exámenes
        */
        const asignaturaConExamens = await models.Asignatura.findAll({
          where: {
            ProgramacionDocenteIdentificador,
            DepartamentoResponsable: {
              [op.ne]: null
            }
          },
          attributes: [
            'acronimo',
            'curso',
            'identificador',
            'nombre',
            'semestre',
            'codigo',
            'DepartamentoResponsable'
          ],
          order: [
            [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
            [Sequelize.literal('"Examens.periodo"'), 'ASC']
          ],
          raw: true,
          include: [
            {
              // left join
              model: models.Examen,
              required: false
            }
          ]
        });
        asignaturaConExamens.forEach(asignaturaConExamen => {
          let c = cursos.find(obj => obj === asignaturaConExamen.curso);
          // si el curso no está lo añado
          if (!c) {
            cursos.push(asignaturaConExamen.curso);
            c = cursos.find(obj => obj === asignaturaConExamen.curso);
          }
          function buscarOCrear(asignatura, periodo) {
            const p = asignacionsExamen.find(obj => obj.periodo === periodo);
            if (p) {
              const asign = p.asignaturas.find(
                x => x.identificador === asignatura.identificador
              );
              if (!asign) {
                const a = {};
                a.acronimo = asignatura.acronimo;
                a.identificador = asignatura.identificador;
                a.curso = asignatura.curso;
                a.nombre = asignatura.nombre;
                a.departamentoResponsable = asignatura.DepartamentoResponsable;
                a.semestre = asignatura.semestre;
                a.codigo = asignatura.codigo;
                a.examen = {};
                a.examen.identificador = null;
                a.examen.fecha = null;
                a.examen.horaInicio = null;
                a.examen.duracion = null;
                a.examen.aulas = [];
                p.asignaturas.push(a);
                p.asignaturas.sort(funciones.sortAsignaturasCursoNombre);
              }
            }
          }
          // busco si la asignatura está en los periodos que debería y si no está la añado.
          switch (asignaturaConExamen.semestre) {
            case '1S':
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E);
              break;
            case '2S':
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E);
              break;
            case '1S-2S':
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E);
              break;
            case 'A':
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E);
              break;
            case 'I':
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S1_E);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_O);
              buscarOCrear(asignaturaConExamen, enumsPD.periodoPD.S2_E);
              break;
            default:
              break;
          }
          const periodoExamen = asignaturaConExamen['Examens.periodo'];
          const p = asignacionsExamen.find(
            obj => obj.periodo === periodoExamen
          );
          if (p) {
            const asign = p.asignaturas.find(
              x => x.identificador === asignaturaConExamen.identificador
            );
            if (asign) {
              asign.examen.identificador =
                asignaturaConExamen['Examens.identificador'];
              asign.examen.fecha = asignaturaConExamen['Examens.fecha'];
              asign.examen.horaInicio =
                asignaturaConExamen['Examens.horaInicio'];
              asign.examen.duracion = asignaturaConExamen['Examens.duracion'];
              asign.examen.aulas = asignaturaConExamen['Examens.aulas'];
            }
          }
        });
        res.locals.cursos = cursos;
        res.locals.asignacionsExamen = asignacionsExamen;
        next();
      }
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

exports.getExamenesView = function(req, res) {
  req.session.submenu = 'Examenes';
  /* si no hay progDoc o no hay departamentosResponsables de dicha progDoc.
  Ojo también comprueba que no esté en incidencia para el JE
  */
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    const view = req.originalUrl.toLowerCase().includes('consultar')
      ? 'examenes/examenesConsultar'
      : 'examenes/examenesCumplimentar';
    res.render(view, {
      existe: 'Programación docente no abierta',
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
    });
  } else {
    const cancelarpath = `${req.baseUrl}/coordinador/examenes?planID=${req.session.planID}`;
    const selectExamenespath = `${req.baseUrl}/coordinador/franjasexamenes?planID=${req.session.planID}`;
    const nuevopath = `${req.baseUrl}/coordinador/guardarExamenes`;
    const view = req.originalUrl.toLowerCase().includes('consultar')
      ? 'examenes/examenesConsultar'
      : 'examenes/examenesCumplimentar';
    res.render(view, {
      asignacionsExamen: res.locals.asignacionsExamen,
      franjasExamen: res.locals.franjasExamen,
      periodosExamen: enumsPD.periodoPD,
      nuevopath,
      aprobarpath: `${req.baseUrl}/coordiandor/aprobarExamenes`,
      selectExamenespath,
      cancelarpath,
      planID: req.session.planID,
      pdID: req.session.pdID,
      cursos: res.locals.cursos,
      menu: req.session.menu,
      submenu: req.session.submenu,
      permisoDenegado: res.locals.permisoDenegado,
      estadosExamen: estados.estadoExamen,
      estadosProgDoc: estados.estadoProgDoc,
      estadoExamenes: res.locals.progDoc['ProgramacionDocentes.estadoExamenes'],
      estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
      departamentoID: req.session.departamentoID,
      planEstudios: res.locals.planEstudios
    });
  }
};

// GET /respDoc/:pdID/Examenes
exports.getFranjasView = function(req, res) {
  req.session.submenu = 'Examenes2';
  const view = 'examenes/franjasExamenesCumplimentar';
  /*
  si no hay progDoc o no hay departamentosResponsables de dicha progDoc.
  Ojo también comprueba que no esté en incidencia para el JE
  */
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentoID: req.session.departamentoID,
      planEstudios: res.locals.planEstudios,
      franjasExamen: null,
      periodosExamen: null,
      pdID: null
    });
  } else {
    const cancelarpath = `${req.baseUrl}/coordinador/franjasexamenes?planID=${req.session.planID}`;
    const nuevopath = `${req.baseUrl}/coordinador/guardarFranjasExamenes`;
    const selectExamenespath = `${req.baseUrl}/coordinador/examenes?planID=${req.session.planID}`;
    res.render(view, {
      franjasExamen: res.locals.franjasExamen,
      periodosExamen: enumsPD.periodoPD,
      nuevopath,
      selectExamenespath,
      cancelarpath,
      planID: req.session.planID,
      pdID: req.session.pdID,
      menu: req.session.menu,
      submenu: req.session.submenu,
      permisoDenegado: res.locals.permisoDenegado,
      estadosExamen: estados.estadoExamen,
      estadosProgDoc: estados.estadoProgDoc,
      estadoExamenes: res.locals.progDoc['ProgramacionDocentes.estadoExamenes'],
      estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
      departamentoID: req.session.departamentoID,
      planEstudios: res.locals.planEstudios
    });
  }
};

exports.guardarExamenes = async function(req, res, next) {
  const whereEliminar = {};
  const { pdID } = req.session;
  const promises = [];
  if (!res.locals.permisoDenegado) {
    try {
      const toAnadir = req.body.createExamens;
      const toActualizar = req.body.updateExamens;
      const toEliminar = req.body.deleteExamens;
      const queryToAnadir = [];
      const as = await models.Asignatura.findAll({
        where: {
          ProgramacionDocenteIdentificador: pdID
        },
        attributes: ['identificador'],
        include: [
          {
            model: models.Examen,
            // left join
            required: false
          }
        ],
        raw: true
      });
      if (toAnadir) {
        toAnadir.forEach(element => {
          const nuevaEntrada = {};
          nuevaEntrada.AsignaturaIdentificador =
            element.asignaturaIdentificador;
          nuevaEntrada.periodo = element.periodo;
          nuevaEntrada.fecha = moment(element.fecha, 'DD/MM/YYYY');
          nuevaEntrada.horaInicio = element.horaInicio;
          nuevaEntrada.duracion = Number(element.duracion);
          const asig = as.find(
            obj =>
              nuevaEntrada.AsignaturaIdentificador &&
              obj.identificador === nuevaEntrada.AsignaturaIdentificador
          );
          if (!asig) {
            console.log('Quiere añadir un examen que no es suyo');
          } else {
            queryToAnadir.push(nuevaEntrada);
          }
        });
        const promise1 = models.Examen.bulkCreate(queryToAnadir);
        promises.push(promise1);
      }
      if (toActualizar) {
        toActualizar.forEach(element => {
          const nuevaEntrada = {};
          const identificador = Number(element.identificador);
          nuevaEntrada.fecha = moment(element.fecha, 'DD/MM/YYYY');
          nuevaEntrada.horaInicio = element.horaInicio;
          nuevaEntrada.duracion = Number(element.duracion);
          const asig = as.find(
            obj =>
              identificador && obj['Examens.identificador'] === identificador
          );
          if (!asig) {
            console.log('Quiere actulaizar un examen que no es suyo');
          } else {
            promises.push(
              models.Examen.update(
                nuevaEntrada /* set attributes' value */,
                { where: { identificador } } /* where criteria */
              )
            );
          }
        });
      }
      if (toEliminar) {
        whereEliminar.identificador = [];
        toEliminar.forEach(element => {
          const identificador = Number(element.identificador);
          whereEliminar.identificador.push(identificador);
        });
        if (funciones.isEmpty(whereEliminar)) {
          whereEliminar.identificador = 'Identificador erróneo';
        }
        const promise1 = models.Examen.destroy({
          where: whereEliminar
        });
        promises.push(promise1);
      }
      await Promise.all(promises);
      next();
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

exports.guardarFranjasExamenes = async function(req, res, next) {
  const whereEliminar = {};
  const { pdID } = req.session;
  const promises = [];
  try {
    if (!res.locals.permisoDenegado) {
      let toAnadir = req.body.anadir;
      let toActualizar = req.body.actualizar;
      let toEliminar = req.body.eliminar;
      const queryToAnadir = [];
      if (toAnadir) {
        if (!Array.isArray(toAnadir)) {
          toAnadir = [toAnadir];
        }
        toAnadir.forEach(element => {
          const nuevaEntrada = {};
          const identificador = element.split('_')[0];
          const hora = req.body[`${identificador}_hora`];
          let minutos = req.body[`${identificador}_minutos`];
          if (!minutos) minutos = '00';
          nuevaEntrada.ProgramacionDocenteId = pdID;
          // eslint-disable-next-line prefer-destructuring
          nuevaEntrada.periodo = element.split('_')[1];
          if (hora && minutos) {
            nuevaEntrada.horaInicio = `${hora}:${minutos}`;
          }
          nuevaEntrada.duracion = Number(req.body[`${identificador}_duracion`]);
          queryToAnadir.push(nuevaEntrada);
        });
        const promise1 = models.FranjaExamen.bulkCreate(queryToAnadir);
        promises.push(promise1);
      }
      if (toActualizar) {
        if (!Array.isArray(toActualizar)) {
          toActualizar = [toActualizar];
        }
        toActualizar.forEach(element => {
          const nuevaEntrada = {};
          const identificador = element.split('_')[0];
          const hora = req.body[`${identificador}_hora`];
          let minutos = req.body[`${identificador}_minutos`];
          if (!minutos) minutos = '00';
          nuevaEntrada.ProgramacionDocenteId = pdID;
          // eslint-disable-next-line prefer-destructuring
          nuevaEntrada.periodo = element.split('_')[1];
          if (hora && minutos) {
            nuevaEntrada.horaInicio = `${hora}:${minutos}`;
          }
          nuevaEntrada.duracion = Number(req.body[`${identificador}_duracion`]);
          promises.push(
            models.FranjaExamen.update(
              nuevaEntrada /* set attributes' value */,
              { where: { identificador } } /* where criteria */
            )
          );
        });
      }
      if (toEliminar) {
        if (!Array.isArray(toEliminar)) {
          toEliminar = [toEliminar];
        }
        whereEliminar.identificador = [];
        toEliminar.forEach(element => {
          const identificador = Number(element.split('_')[0]);
          whereEliminar.identificador.push(identificador);
        });
        if (funciones.isEmpty(whereEliminar)) {
          whereEliminar.identificador = 'Identificador erróneo';
        }
        const promise1 = models.FranjaExamen.destroy({
          where: whereEliminar
        });
        promises.push(promise1);
      }
      await Promise.all(promises);
      req.session.save(() => {
        res.redirect(`${req.baseUrl}/coordinador/franjasExamenes`);
      });
    } else {
      req.session.save(() => {
        res.redirect(`${req.baseUrl}/coordinador/franjasExamenes`);
      });
    }
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

// get
exports.reenviarExamenes = function(req, res) {
  req.session.save(() => {
    res.redirect(
      `${req.baseUrl}/coordinador/examenes?departamentoID=${req.session.departamentoID}&planID=${req.session.planID}`
    );
  });
};

exports.reenviarExamenesAjax = function(req, res) {
  res.json({ success: true });
};

// post
exports.aprobarExamenes = async function(req, res, next) {
  const { pdID } = req.session;
  const date = new Date();
  let estadoExamenes;
  try {
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: pdID },
      attributes: ['estadoExamenes']
    });
    estadoExamenes = pd.estadoExamenes;
    if (!res.locals.permisoDenegado) {
      switch (estadoExamenes) {
        case estados.estadoExamen.abierto:
          estadoExamenes = estados.estadoExamen.aprobadoCoordinador;
          break;
        default:
          break;
      }
      await models.ProgramacionDocente.update(
        {
          estadoExamenes,
          fechaHorarios: date
        } /* set attributes' value */,
        { where: { identificador: pdID } } /* where criteria */
      );

      progDocController.isPDLista(pdID, next());
    } else {
      req.session.save(() => {
        next();
      });
    }
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

exports.generateCsvExamens = async function(req, res, next) {
  try {
    const plan = progDocController.getPlanPd(req.session.pdID);
    const planInfo = await planController.getPlanInfo(plan);
    const planAcronimo = planInfo.nombre || plan;
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: req.session.pdID },
      attributes: ['estadoProGDoc', 'estadoExamenes']
    });
    const { estadoExamenes } = pd;
    const estadoProgDoc = pd.estadoProGDoc;
    // solo se genera el pdf si se tiene permiso
    if (!res.locals.permisoDenegado) {
      const fields = [
        'codigo',
        'titulacion',
        'curso',
        'dia',
        'hora de comienzo',
        'hora finalizacion',
        'asignatura',
        'departamento responsable'
      ];
      const opts = { fields, withBOM: true, delimiter: ';' };
      let data = [];
      const ano = progDocController.getAnoPd(req.session.pdID);
      if (res.locals.asignacionsExamen) {
        await Promise.all(
          res.locals.asignacionsExamen.map(async asignacions => {
            data = [];
            asignacions.asignaturas.forEach(ex => {
              // eslint-disable-next-line no-param-reassign
              ex.titulacion = plan;
              // eslint-disable-next-line no-param-reassign
              ex.dia = ex.examen.fecha;
              if (moment(ex.examen.horaInicio, 'HH:mm:ss').isValid()) {
                // eslint-disable-next-line no-param-reassign
                ex['hora de comienzo'] = moment(
                  ex.examen.horaInicio,
                  'HH:mm:ss'
                ).format('HH:mm');
              }
              if (
                moment(ex.examen.horaInicio, 'HH:mm:ss')
                  .add(ex.examen.duracion)
                  .isValid()
              ) {
                // eslint-disable-next-line no-param-reassign
                ex['hora finalizacion'] = moment(
                  ex.examen.horaInicio,
                  'HH:mm:ss'
                )
                  .add(ex.examen.duracion, 'm')
                  .format('HH:mm');
              }
              // eslint-disable-next-line no-param-reassign
              ex.asignatura = ex.nombre;
              // eslint-disable-next-line no-param-reassign
              ex['departamento responsable'] = ex.departamentoResponsable;
              data.push(ex);
            });

            // si esta abierto se guarda en borrador
            let folder = '/';
            let folder2 = '';
            if (
              estadoExamenes === estados.estadoExamen.abierto ||
              (estadoProgDoc === estados.estadoProgDoc.incidencia &&
                req.definitivo !== true)
            ) {
              folder = '/borrador/';
              folder2 = '_borrador';
            }
            const dir = `${PATH_PDF}/pdfs/${progDocController.getAnoPd(
              req.session.pdID
            )}/${progDocController.getPlanPd(
              req.session.pdID
            )}/${progDocController.getTipoPd(
              req.session.pdID
            )}/${progDocController.getVersionPdNormalized(
              req.session.pdID
            )}${folder}`;
            const fileName = `examenes_${planAcronimo}_${plan}_${ano}_${
              asignacions.periodo
            }_${progDocController.getVersionPdNormalized(
              req.session.pdID
            )}${folder2}.csv`;
            const ruta = dir + fileName;
            funciones.ensureDirectoryExistence(ruta);
            const csv = json2csv(data, opts);
            await fs.writeFile(ruta, csv);
          })
        );
        next();
      } else {
        next();
      }
    } else {
      req.session.save(() => {
        next();
      });
    }
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

function isExamenInFranjas(examen, franjas) {
  const duracion = +examen.duracion;
  const horaInicial = moment.duration(examen.horaInicio);
  const horaFinal = moment.duration(horaInicial).add(duracion, 'm');
  if (franjas.length === 0) {
    // en este caso no hay franjas
    return false;
  }
  for (let i = 0; i < franjas.length; i++) {
    // encaja con un examen si la horaInicial es posterior o igual a la hora inicial de la period
    // y la hora final es anterior o igual a la hora de la period
    if (
      horaInicial - moment.duration(franjas[i].horaInicio) >= 0 &&
      horaFinal -
        moment.duration(franjas[i].horaInicio).add(franjas[i].duracion, 'm') <=
        0
    ) {
      return i + 1;
    }
  }
  return false;
}

exports.getFranjasExamenes = getFranjasExamenes;
exports.isExamenInFranjas = isExamenInFranjas;
