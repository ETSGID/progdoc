/* global PATH_PDF */

const Sequelize = require('sequelize');
const fs = require('fs').promises;
const json2csv = require('json2csv').parse;
const models = require('../models');

const op = Sequelize.Op;
const estados = require('../estados');
const enumsPD = require('../enumsPD');
const funciones = require('../funciones');
const progDocController = require('./progDoc_controller');
const asignaturaController = require('./asignatura_controller');
const planController = require('./plan_controller');
const personaYProfesorController = require('./personaYProfesor_controller');
const grupoController = require('./grupo_controller');

const getAsignacion = async (
  ProgramacionDocenteIdentificador,
  DepartamentoResponsable,
  profesores,
  pdID,
  gruposBBDD
) => {
  const asignacions = [];
  // eslint-disable-next-line no-useless-catch
  try {
    const asigns = await models.Asignatura.findAll({
      where: {
        // se obtendrá con req D510 1
        ProgramacionDocenteIdentificador,
        DepartamentoResponsable,
        semestre: {
          [op.ne]: null
        }
      },
      attributes: [
        'acronimo',
        'curso',
        'CoordinadorAsignatura',
        'identificador',
        'nombre',
        'semestre',
        'codigo',
        'estado'
      ],
      order: [
        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
        [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
        [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC']
      ],
      raw: true,
      include: [
        {
          // left join
          model: models.AsignacionProfesor,
          required: false,
          attributes: ['ProfesorId', 'GrupoId', 'identificador', 'Dia', 'Nota'],
          include: [
            {
              model: models.Grupo,
              attributes: ['nombre', 'nombreItinerario']
            }
          ]
        }
      ]
    });
    asigns.forEach(asigni => {
      let asign = asignacions.find(obj => obj.nombre === asigni.nombre);
      if (!asign) {
        asign = {};
        let obj = profesores.find(
          obj2 => obj2.identificador === asigni.CoordinadorAsignatura
        );
        if (!obj) {
          obj = 'No hay coordinador';
        }
        asign.acronimo = asigni.acronimo;
        asign.nombre = asigni.nombre;
        asign.codigo = asigni.codigo;
        asign.estado = asigni.estado;
        asign.identificador = asigni.identificador;
        asign.curso = asigni.curso;
        asign.coordinador = obj;
        asign.grupos = [];
        const s1 = asignaturaController.getSemestresAsignaturainPD(
          progDocController.getTipoPd(pdID),
          asigni.semestre
        )[0];
        const s2 = asignaturaController.getSemestresAsignaturainPD(
          progDocController.getTipoPd(pdID),
          asigni.semestre
        )[1];
        let coincidenciasGrupos = [];
        if (s1) {
          coincidenciasGrupos = gruposBBDD.filter(
            gr =>
              Number(gr.curso) === Number(asigni.curso) &&
              Number(gr.nombre.split('.')[1]) === 1
          );
        }
        if (s2) {
          coincidenciasGrupos = coincidenciasGrupos.concat(
            gruposBBDD.filter(
              gr =>
                Number(gr.curso) === Number(asigni.curso) &&
                Number(gr.nombre.split('.')[1]) === 2
            )
          );
        }
        for (let i = 0; i < coincidenciasGrupos.length; i += 1) {
          const grupo = {};
          grupo.GrupoNombre = coincidenciasGrupos[i].nombre;
          grupo.nombreItinerario = coincidenciasGrupos[i].nombreItinerario;
          grupo.grupoPerteneciente = false;
          grupo.GrupoId = coincidenciasGrupos[i].grupoId;
          grupo.profesors = [];
          asign.grupos.push(grupo);
        }
        asignacions.push(asign);
        asign = asignacions.find(obj2 => obj2.nombre === asigni.nombre);
      }
      const grupo = asign.grupos.find(
        obj => obj.GrupoId === asigni['AsignacionProfesors.GrupoId']
      );
      if (grupo) {
        if (
          asigni['AsignacionProfesors.Dia'] ||
          asigni['AsignacionProfesors.Nota']
        ) {
          grupo.grupoPerteneciente = true;
        }
        const profi = profesores.find(
          obj => obj.identificador === asigni['AsignacionProfesors.ProfesorId']
        );
        if (profi) {
          const p = {};
          p.identificador = profi.identificador;
          p.nombre = profi.nombre;
          p.nombreCorregido = profi.nombreCorregido;
          p.asignacion = asigni['AsignacionProfesors.identificador'];
          grupo.profesors.push(p);
          grupo.profesors.sort(funciones.sortProfesorCorregido);
        }
      }
    });
    return asignacions;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// GET /respDoc/:pdID/:departamentoID
exports.getAsignaciones = async (req, res, next) => {
  req.session.submenu = 'Profesores';
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    const view =
      req.session.menuBar === enumsPD.menuBar.consultar
        ? 'asignacionProfesores/asignacionesConsultar'
        : 'asignacionProfesores/asignacionesCumplimentar';
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
      profesores: null,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentoID: req.session.departamentoID,
      departamentosResponsables: res.locals.departamentosResponsables,
      estadosProfesor: estados.estadoProfesor,
      estadosProgDoc: estados.estadoProgDoc,
      planEstudios: res.locals.planEstudios
    });
    // hay que comprobar que no sea una url de consultar.
    // eslint-disable-next-line no-use-before-define
  } else if (
    !progDocController.comprobarEstadoCumpleUno(
      estados.estadoProfesor.abierto,
      res.locals.progDoc['ProgramacionDocentes.estadoProfesores']
    ) &&
    !progDocController.comprobarEstadoCumpleUno(
      estados.estadoProfesor.aprobadoResponsable,
      res.locals.progDoc['ProgramacionDocentes.estadoProfesores']
    ) &&
    (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
      estados.estadoProgDoc.abierto ||
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
        estados.estadoProgDoc.listo) &&
    req.session.menuBar !== enumsPD.menuBar.consultar
  ) {
    res.render('asignacionProfesores/asignacionesCumplimentar', {
      estado:
        'Asignación de profesores ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y Jefatura de Estudios la apruebe',
      permisoDenegado: res.locals.permisoDenegado || null,
      profesores: null,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentoID: req.session.departamentoID,
      departamentosResponsables: res.locals.departamentosResponsables,
      estadosProfesor: estados.estadoProfesor,
      estadosProgDoc: estados.estadoProgDoc,
      estadoProfesores:
        res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
      planEstudios: res.locals.planEstudios
    });
  } else {
    let asignacions;
    let gruposBBDD;
    const { pdID } = req.session;
    const { departamentoID } = req.session;
    const departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(
      obj => obj.codigo === departamentoID
    );
    let profesores;
    if (!departamentoExisteEnElPlan) {
      const view =
        req.session.menuBar === enumsPD.menuBar.consultar
          ? 'asignacionProfesores/asignacionesConsultar'
          : 'asignacionProfesores/asignacionesCumplimentar';
      res.render(view, {
        existe:
          'El departamento seleccionado no es responsable de ninguna asignatura del plan, por favor escoja otro departamento en el cuadro superior',
        permisoDenegado: res.locals.permisoDenegado || null,
        profesores: null,
        menu: req.session.menu,
        submenu: req.session.submenu,
        planID: req.session.planID,
        departamentoID: req.session.departamentoID,
        departamentosResponsables: res.locals.departamentosResponsables,
        estadosProfesor: estados.estadoProfesor,
        estadosProgDoc: estados.estadoProgDoc,
        estadoProfesores:
          res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
        planEstudios: res.locals.planEstudios
      });
    } else if (res.locals.permisoDenegado) {
      const view =
        req.session.menuBar === enumsPD.menuBar.consultar
          ? 'asignacionProfesores/asignacionesConsultar'
          : 'asignacionProfesores/asignacionesCumplimentar';
      res.render(view, {
        permisoDenegado: res.locals.permisoDenegado || null,
        asignacion: null,
        profesores: null,
        menu: req.session.menu,
        submenu: req.session.submenu,
        planID: req.session.planID,
        departamentoID: req.session.departamentoID,
        departamentosResponsables: res.locals.departamentosResponsables,
        estadosProfesor: estados.estadoProfesor,
        estadosProgDoc: estados.estadoProgDoc,
        estadoProfesores:
          res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
        planEstudios: res.locals.planEstudios
      });
    } else {
      try {
        gruposBBDD = await grupoController.getGrupos2(pdID);
        profesores = await personaYProfesorController.getProfesores();
        asignacions = await getAsignacion(
          pdID,
          departamentoID,
          profesores,
          pdID,
          gruposBBDD
        );
        const nuevopath = `${req.baseUrl}/respdoc/editAsignacion`;
        // se usa cambiopath para cambiar a la asignacions de profesores por grupo o comun
        const cambiopath = `${req.baseUrl}/respdoc/editAsignacion/cambioModo`;
        const view =
          req.session.menuBar === enumsPD.menuBar.consultar
            ? 'asignacionProfesores/asignacionesConsultar'
            : 'asignacionProfesores/asignacionesCumplimentar';
        res.render(view, {
          profesores,
          asignacion: asignacions,
          nuevopath,
          cambiopath,
          aprobarpath: `${req.baseUrl}/respDoc/aprobarAsignacion`,
          planID: req.session.planID,
          estadoProfesores:
            res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
          estadoProgDoc:
            res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
          pdID,
          menu: req.session.menu,
          submenu: req.session.submenu,
          permisoDenegado: res.locals.permisoDenegado || null,
          departamentoID: req.session.departamentoID,
          departamentosResponsables: res.locals.departamentosResponsables,
          estadosProfesor: estados.estadoProfesor,
          estadosProgDoc: estados.estadoProgDoc,
          planEstudios: res.locals.planEstudios
        });
      } catch (error) {
        console.error('Error:', error);
        next(error);
      }
    }
  }
};

exports.editAsignacion = async (req, res, next) => {
  req.session.submenu = 'Profesores2';
  const { pdID } = req.session;
  const { departamentoID } = req.session;
  let asignacions;
  let gruposBBDD;
  let profesores;
  // por defecto es acronimo pero si no hay debe ser el nombre TODO: cambiar a codigo
  const asignaturaIdentificador = Number(req.query.asignatura);
  if (!res.locals.permisoDenegado) {
    try {
      gruposBBDD = await grupoController.getGrupos2(pdID);
      profesores = await personaYProfesorController.getProfesores();
      asignacions = await getAsignacion(
        pdID,
        departamentoID,
        profesores,
        pdID,
        gruposBBDD
      );
      const asign = asignacions.find(
        obj => obj.identificador === asignaturaIdentificador
      );
      res.render('asignacionProfesores/asignacionesCumplimentarAsignatura', {
        asign,
        pdID,
        cancelarpath: `${req.baseUrl}/respDoc/profesores?planID=${req.session.planID}&departamentoID=${departamentoID}`,
        nuevopath: `${req.baseUrl}/respDoc/guardarAsignacion`,
        planID: req.session.planID,
        departamentoID: req.session.departamentoID,
        menu: req.session.menu,
        submenu: req.session.submenu,
        profesores,
        estadosProfesor: estados.estadoProfesor,
        estadosProgDoc: estados.estadoProgDoc,
        estadoProfesores:
          res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
        planEstudios: res.locals.planEstudios,
        // desde esta ventana solo se pueden añadir profesores al sistema.
        onlyProfesor: true
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    req.session.save(() => {
      res.redirect(
        `${req.baseUrl}/respDoc/profesores?pdID=${pdID}&departamentoID=${departamentoID}`
      );
    });
  }
};
// GET respDoc/editAsignacion/cambioModo
/*
cuando quieres cambiar de asignacions indivudal a comun
el cambiar a grupo comun copia todos los profesores de forma no repetida (dentro del mismo grupo),
en todos los grupos
curso y mismo semestre sin diferenciar si en ellos se imparte o no, eso se asigna en el horario
tambien cambia el estado a asignatura a "N" para indicar este modo
----
cuando quieres cambiar de grupo comun a individual solo cambia el parametro estado a "S"
deja todos los profesores en todos los grupos.
*/
exports.changeModeAsignacion = async (req, res, next) => {
  const { pdID } = req.session;
  const { departamentoID } = req.session;
  let gruposBBDD;
  const queryToAnadir = [];
  const profesoresIdNoRepetidos = [];
  let profesores;
  let asignacions;
  // por defecto es acronimo pero si no hay debe ser el nombre TODO: cambiar a codigo
  const asignaturaIdentificador = Number(req.query.asignatura);
  const { modo } = req.query;
  let asign;
  if (!res.locals.permisoDenegado) {
    try {
      gruposBBDD = await grupoController.getGrupos2(pdID);
      profesores = await personaYProfesorController.getProfesores();
      asignacions = await getAsignacion(
        pdID,
        departamentoID,
        profesores,
        pdID,
        gruposBBDD
      );
      asign = asignacions.find(
        obj => obj.identificador === asignaturaIdentificador
      );
      if (modo === 'N') {
        // se rellena el array con los profesores no repetidos
        // si el estado es S no se hace nada simplemente se cambia el modo.
        asign.grupos.forEach(g => {
          g.profesors.forEach(p => {
            if (!profesoresIdNoRepetidos.includes(p.identificador)) {
              profesoresIdNoRepetidos.push(p.identificador);
            }
          });
        });
        /*
        se añaden los profesores que no estaban en los grupos en los que puede existir la asignatura
        */
        asign.grupos.forEach(g => {
          profesoresIdNoRepetidos.forEach(p => {
            const coincide = g.profesors.find(obj => obj.identificador === p);
            if (!coincide) {
              const nuevaEntrada = {};
              nuevaEntrada.AsignaturaId = asign.identificador;
              nuevaEntrada.ProfesorId = p;
              nuevaEntrada.GrupoId = g.GrupoId;
              queryToAnadir.push(nuevaEntrada);
            }
          });
        });
        await models.AsignacionProfesor.bulkCreate(queryToAnadir);
      }
      // cambio el modo.
      await models.Asignatura.update(
        {
          estado: modo
        },
        { where: { identificador: asign.identificador } }
      );
      req.session.save(() => {
        res.redirect(`${req.baseUrl}/respDoc/profesores`);
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    req.session.save(() => {
      res.redirect(`${req.baseUrl}/respDoc/profesores`);
    });
  }
};

// POST respDoc/guardarAsignacion
exports.guardarAsignacion = async (req, res, next) => {
  const whereEliminar = {};
  const identificador = Number(req.body.asignaturaId);
  const { pdID } = req.session;
  const { planID } = req.session;
  const { departamentoID } = req.session;
  const gruposBBDD = await grupoController.getGrupos2(pdID);
  const coordinador = req.body.coordinador
    ? Number(req.body.coordinador)
    : null;
  try {
    const as = await models.Asignatura.findAll({
      where: {
        identificador,
        ProgramacionDocenteIdentificador: pdID
      },
      attributes: [
        'identificador',
        'DepartamentoResponsable',
        'estado',
        'semestre',
        'curso'
      ],
      include: [
        {
          // incluye las asignaciones de profesores y los horarios.
          model: models.AsignacionProfesor,
          // left join
          required: false
        }
      ],
      raw: true
    });
    /*
    que es la progdoc correspondiente ya se ve en que debe de estar abierta / incidencia
    en el modulo de permisos
    */
    if (
      !as[0] ||
      !as[0].DepartamentoResponsable ||
      as[0].DepartamentoResponsable !== departamentoID
    ) {
      res.locals.permisoDenegado =
        'No tiene permiso contacte con Jefatura de Estudios si debería tenerlo'; // lo unico que hara será saltarse lo siguiente
    }
    if (!res.locals.permisoDenegado) {
      if (coordinador || !req.body.coordinador) {
        await models.Asignatura.update(
          { CoordinadorAsignatura: coordinador } /* set attributes' value */,
          { where: { identificador } } /* where criteria */
        );
      }
      // eslint-disable-next-line no-use-before-define
      await paso2();
      // eslint-disable-next-line no-inner-declarations
      async function paso2() {
        let toEliminar = req.body.eliminar;
        if (toEliminar) {
          /*
          Condicion para borrar es que pasó un id no otra condición,
          Además debe pasar un número.
          Además si le pasa algo a null nunca va a tener la condición
          */
          if (!Array.isArray(toEliminar)) {
            toEliminar = [toEliminar];
          }
          whereEliminar.identificador = [];
          toEliminar.forEach(element => {
            const asignacions = Number(element.split('_')[2]);
            const asig = as.find(
              obj =>
                asignacions &&
                obj['AsignacionProfesors.identificador'] === asignacions
            );
            if (!asig || !asig['AsignacionProfesors.ProfesorId']) {
              console.error('Intenta cambiar una nota o un horario');
            } else if (asig.estado === 'N') {
              // si esta la opcion de grupo comun
              // se deben coger todas las asignaciones de profesor de dicha asignatura
              const coincidencias = as.filter(
                a =>
                  a['AsignacionProfesors.ProfesorId'] ===
                  asig['AsignacionProfesors.ProfesorId']
              );
              // eslint-disable-next-line
              coincidencias.forEach((c, index) => {
                whereEliminar.identificador.push(
                  c['AsignacionProfesors.identificador']
                );
              });
            } else {
              whereEliminar.identificador.push(asignacions);
            }
          });
          if (funciones.isEmpty(whereEliminar)) {
            whereEliminar.identificador = 'Identificador erróneo';
          }
          await models.AsignacionProfesor.destroy({
            where: whereEliminar
          });
        }
        // eslint-disable-next-line no-use-before-define
        await paso3();
        async function paso3() {
          let toAnadir = req.body.anadir;
          const queryToAnadir = [];
          const asig = as.find(obj => obj.identificador === identificador);
          const s1 = asignaturaController.getSemestresAsignaturainPD(
            progDocController.getTipoPd(pdID),
            asig.semestre
          )[0];
          const s2 = asignaturaController.getSemestresAsignaturainPD(
            progDocController.getTipoPd(pdID),
            asig.semestre
          )[1];
          // coincidencias de grupos a los que podria pertenecer la asignatura
          let coincidencias = [];
          if (s1) {
            coincidencias = gruposBBDD.filter(
              gr =>
                Number(gr.curso) === Number(asig.curso) &&
                Number(gr.nombre.split('.')[1]) === 1
            );
          }
          if (s2) {
            coincidencias = coincidencias.concat(
              gruposBBDD.filter(
                gr =>
                  Number(gr.curso) === Number(asig.curso) &&
                  Number(gr.nombre.split('.')[1]) === 2
              )
            );
          }
          if (toAnadir) {
            if (!Array.isArray(toAnadir)) {
              toAnadir = [toAnadir];
            }
            toAnadir.forEach(element => {
              const profesor = element.split('_')[3];
              let grupoId = element.split('_')[2];
              // eslint-disable-next-line no-restricted-globals
              if (!isNaN(grupoId)) {
                grupoId = Number(grupoId);
                // si esta la opcion de grupo comun
                if (asig.estado === 'N') {
                  coincidencias.forEach(c => {
                    const nuevaEntrada = {};
                    nuevaEntrada.AsignaturaId = identificador;
                    nuevaEntrada.ProfesorId = profesor;
                    nuevaEntrada.GrupoId = c.grupoId;
                    queryToAnadir.push(nuevaEntrada);
                  });
                } else {
                  const nuevaEntrada = {};
                  nuevaEntrada.AsignaturaId = identificador;
                  nuevaEntrada.ProfesorId = profesor;
                  nuevaEntrada.GrupoId = grupoId;
                  queryToAnadir.push(nuevaEntrada);
                }
              }
            });
          }
          await models.AsignacionProfesor.bulkCreate(queryToAnadir);
          // generar CSV
          await generateCsvCoordinadores(req.session.pdID);
          req.session.save(() => {
            res.redirect(
              `${req.baseUrl}/respDoc/profesores?pdID=${pdID}&departamentoID=${departamentoID}&planID=${planID}`
            );
          });
        }
      }
    } else {
      req.session.save(() => {
        res.redirect(
          `${req.baseUrl}/respDoc/profesores?pdID=${pdID}&departamentoID=${departamentoID}&planID=${planID}`
        );
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// post respDoc/aprobarAsignacion:pdID
exports.aprobarAsignacion = async (req, res, next) => {
  const { pdID } = req.session;
  const { departamentoID } = req.session;
  const date = new Date();
  let estadoProfesores;
  try {
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: pdID },
      attributes: ['estadoProfesores']
    });
    estadoProfesores = pd.estadoProfesores;
    if (!res.locals.permisoDenegado) {
      switch (estadoProfesores[departamentoID]) {
        case estados.estadoProfesor.abierto:
          estadoProfesores[departamentoID] =
            estados.estadoProfesor.aprobadoResponsable;
          break;
        case estados.estadoProfesor.aprobadoResponsable:
          estadoProfesores[departamentoID] =
            req.body.decision !== 'aceptar'
              ? estados.estadoProfesor.abierto
              : estados.estadoProfesor.aprobadoDirector;
          break;
        default:
          break;
      }
      await models.ProgramacionDocente.update(
        {
          estadoProfesores,
          fechaProfesores: date
        } /* set attributes' value */,
        { where: { identificador: pdID } } /* where criteria */
      );
      // generar csv
      await generateCsvCoordinadores(req.session.pdID);
      req.session.save(() => {
        progDocController.isPDLista(
          pdID,
          res.redirect(`${req.baseUrl}/respDoc/profesores`)
        );
      });
    } else {
      req.session.save(() => {
        progDocController.isPDLista(
          pdID,
          res.redirect(`${req.baseUrl}/respDoc/profesores`)
        );
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// GET respDoc/tribunales:pdID/:departamentoID
exports.getTribunales = async (req, res, next) => {
  req.session.submenu = 'Tribunales';
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    const view =
      req.session.menuBar === enumsPD.menuBar.consultar
        ? 'tribunales/tribunalesConsultar'
        : 'tribunales/tribunalesCumplimentar';
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
      profesores: null,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentoID: req.session.departamentoID,
      departamentosResponsables: res.locals.departamentosResponsables,
      estadosTribunal: estados.estadoTribunal,
      estadosProgDoc: estados.estadoProgDoc,
      planEstudios: res.locals.planEstudios,
      // desde esta ventana solo se pueden añadir profesores al sistema.
      onlyProfesor: true
    });
  } else if (
    !progDocController.comprobarEstadoCumpleUno(
      estados.estadoTribunal.abierto,
      res.locals.progDoc['ProgramacionDocentes.estadoTribunales']
    ) &&
    !progDocController.comprobarEstadoCumpleUno(
      estados.estadoTribunal.aprobadoResponsable,
      res.locals.progDoc['ProgramacionDocentes.estadoTribunales']
    ) &&
    (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
      estados.estadoProgDoc.abierto ||
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
        estados.estadoProgDoc.listo) &&
    req.session.menuBar !== enumsPD.menuBar.consultar
  ) {
    // hay que comprobar que no sea una url de consultar.
    res.render('tribunales/tribunalesCumplimentar', {
      estado:
        'Asignación de tribunales ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y Jefatura de Estudios la apruebe',
      permisoDenegado: res.locals.permisoDenegado || null,
      profesores: null,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentoID: req.session.departamentoID,
      departamentosResponsables: res.locals.departamentosResponsables,
      estadosTribunal: estados.estadoTribunal,
      estadosProgDoc: estados.estadoProgDoc,
      estadoTribunales:
        res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
      planEstudios: res.locals.planEstudios,
      // desde esta ventana solo se pueden añadir profesores al sistema.
      onlyProfesor: true
    });
  } else {
    const { pdID } = req.session;
    const asignaturas = [];
    const asignaturasAntiguas = [];
    const whereAsignaturas = [];
    const { departamentoID } = req.session;
    try {
      const pdsAnteriores = await progDocController.getProgramacionDocentesAnteriores(
        progDocController.getPlanPd(pdID),
        progDocController.getTipoPd(pdID),
        progDocController.getAnoPd(pdID),
        pdID,
        null
      );
      whereAsignaturas.push(pdID);
      // voy a obtener el identificador del plan y de paso preparo el where para asignaturas
      for (let i = 0; i < pdsAnteriores.length; i++) {
        whereAsignaturas.push(pdsAnteriores[i].identificador);
      }
      const departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(
        obj => obj.codigo === departamentoID
      );
      if (!departamentoExisteEnElPlan) {
        const view =
          req.session.menuBar === enumsPD.menuBar.consultar
            ? 'tribunales/tribunalesConsultar'
            : 'tribunales/tribunalesCumplimentar';
        res.render(view, {
          existe:
            'El departamento seleccionado no es responsable de ninguna asignatura del plan, por favor escoja otro departamento en el cuadro superior',
          permisoDenegado: res.locals.permisoDenegado || null,
          profesores: null,
          menu: req.session.menu,
          submenu: req.session.submenu,
          planID: req.session.planID,
          departamentoID: req.session.departamentoID,
          departamentosResponsables: res.locals.departamentosResponsables,
          estadosTribunal: estados.estadoTribunal,
          estadosProgDoc: estados.estadoProgDoc,
          estadoTribunales:
            res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
          planEstudios: res.locals.planEstudios,
          // desde esta ventana solo se pueden añadir profesores al sistema.
          onlyProfesor: true
        });
      } else if (res.locals.permisoDenegado) {
        const view =
          req.session.menuBar === enumsPD.menuBar.consultar
            ? 'tribunales/tribunalesConsultar'
            : 'tribunales/tribunalesCumplimentar';
        res.render(view, {
          permisoDenegado: res.locals.permisoDenegado || null,
          profesores: null,
          menu: req.session.menu,
          submenu: req.session.submenu,
          planID: req.session.planID,
          departamentoID: req.session.departamentoID,
          departamentosResponsables: res.locals.departamentosResponsables,
          estadosTribunal: estados.estadoTribunal,
          estadosProgDoc: estados.estadoProgDoc,
          estadoTribunales:
            res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
          planEstudios: res.locals.planEstudios,
          // desde esta ventana solo se pueden añadir profesores al sistema.
          onlyProfesor: true
        });
      } else {
        // eslint-disable-next-line no-use-before-define
        getMiembrosTribunal(whereAsignaturas, departamentoID);
      }
      // eslint-disable-next-line no-inner-declarations
      async function getMiembrosTribunal(
        ProgramacionDocentesIdentificador,
        DepartamentoResponsable
      ) {
        const profesores = await personaYProfesorController.getProfesores();
        const asigns = await models.Asignatura.findAll({
          where: {
            // se obtendrá con req D510 1
            ProgramacionDocenteIdentificador: {
              [op.in]: ProgramacionDocentesIdentificador
            },
            DepartamentoResponsable
          },
          attributes: [
            'acronimo',
            'nombre',
            'curso',
            'codigo',
            'semestre',
            'identificador',
            'PresidenteTribunalAsignatura',
            'VocalTribunalAsignatura',
            'SecretarioTribunalAsignatura',
            'SuplenteTribunalAsignatura',
            'ProgramacionDocenteIdentificador'
          ],
          order: [
            [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
            [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
            [Sequelize.literal('"Asignatura"."acronimo"'), 'ASC'],
            [Sequelize.literal('"Asignatura"."nombre"'), 'ASC']
          ],
          raw: true
        });
        asigns.forEach(asigni => {
          const presidente = profesores.find(
            obj => obj.identificador === asigni.PresidenteTribunalAsignatura
          );
          if (presidente) {
            // eslint-disable-next-line no-param-reassign
            asigni.presidenteNombre = presidente.nombreCorregido;
          }
          const vocal = profesores.find(
            obj => obj.identificador === asigni.VocalTribunalAsignatura
          );
          if (vocal) {
            // eslint-disable-next-line no-param-reassign
            asigni.vocalNombre = vocal.nombreCorregido;
          }
          const secretario = profesores.find(
            obj => obj.identificador === asigni.SecretarioTribunalAsignatura
          );
          if (secretario) {
            // eslint-disable-next-line no-param-reassign
            asigni.secretarioNombre = secretario.nombreCorregido;
          }
          const suplente = profesores.find(
            obj => obj.identificador === asigni.SuplenteTribunalAsignatura
          );
          if (suplente) {
            // eslint-disable-next-line no-param-reassign
            asigni.suplenteNombre = suplente.nombreCorregido;
          }
          // eslint-disable-next-line no-param-reassign
          asigni.tribunalId = asigni.identificador;
          if (asigni.ProgramacionDocenteIdentificador === pdID) {
            asignaturas.push(asigni);
          } else {
            const as = {};
            as.codigo = asigni.codigo;
            as.presidente = asigni.presidenteNombre;
            as.vocal = asigni.vocalNombre;
            as.secretario = asigni.secretarioNombre;
            as.suplente = asigni.suplenteNombre;
            asignaturasAntiguas.push(as);
          }
        });
        const view =
          req.session.menuBar === enumsPD.menuBar.consultar
            ? 'tribunales/tribunalesConsultar'
            : 'tribunales/tribunalesCumplimentar';
        const nuevopath = `${req.baseUrl}/respdoc/guardarTribunales`;
        const cancelarpath = `${req.baseUrl}/respdoc/tribunales?planID=${req.session.planID}&departamentoID=${DepartamentoResponsable}`;
        res.render(view, {
          profesores,
          tribunales: asignaturas,
          tribunalesAntiguos: asignaturasAntiguas,
          nuevopath,
          aprobarpath: `${req.baseUrl}/respDoc/aprobarTribunales`,
          cancelarpath,
          planID: req.session.planID,
          estadoTribunales:
            res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
          estadoProgDoc:
            res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
          pdID,
          submenu: req.session.submenu,
          menu: req.session.menu,
          permisoDenegado: res.locals.permisoDenegado || null,
          departamentoID: req.session.departamentoID,
          departamentosResponsables: res.locals.departamentosResponsables,
          estadosTribunal: estados.estadoTribunal,
          estadosProgDoc: estados.estadoProgDoc,
          planEstudios: res.locals.planEstudios,
          // desde esta ventana solo se pueden añadir profesores al sistema.
          onlyProfesor: true
        });
      }
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }
};

// POST respDoc/guardarTribunales
exports.guardarTribunales = async (req, res, next) => {
  const { departamentoID } = req.session;
  const { pdID } = req.session;
  let toActualizar = req.body.actualizar;
  if (toActualizar && !res.locals.permisoDenegado) {
    try {
      // debo de comprobar que estoy cambiando asignaturas de mi pd
      const as = await models.Asignatura.findAll({
        where: {
          ProgramacionDocenteIdentificador: pdID
        },
        attributes: ['identificador', 'DepartamentoResponsable'],
        raw: true
      });
      if (!Array.isArray(toActualizar)) {
        toActualizar = [toActualizar];
      }
      const promises = [];
      const tribunalesToActualizar = [];
      toActualizar.forEach(element => {
        let tribunalToActualizar;
        const tribunalId = Number(element.split('_')[0]);
        const asig = as.find(
          obj => tribunalId && obj.identificador === tribunalId
        );
        if (
          !asig ||
          !asig.DepartamentoResponsable ||
          asig.DepartamentoResponsable !== departamentoID
        ) {
          console.error('Ha intentado cambiar una asignatura que no puede');
        } else {
          const profesorIdentificador = element.split('_')[1]
            ? element.split('_')[1]
            : null;
          const puestoTribunal = `${element.split('_')[2]}TribunalAsignatura`;
          tribunalToActualizar = tribunalesToActualizar.find(
            obj => obj.identificador === tribunalId
          );
          if (tribunalToActualizar) {
            tribunalToActualizar.puestos[
              puestoTribunal
            ] = profesorIdentificador;
          } else {
            tribunalToActualizar = {};
            tribunalToActualizar.identificador = tribunalId;
            tribunalToActualizar.puestos = {};
            tribunalToActualizar.puestos[
              puestoTribunal
            ] = profesorIdentificador;
            tribunalesToActualizar.push(tribunalToActualizar);
          }
        }
      });
      tribunalesToActualizar.forEach((element, index) => {
        promises.push(
          models.Asignatura.update(tribunalesToActualizar[index].puestos, {
            where: {
              identificador: tribunalesToActualizar[index].identificador
            }
          })
        );
      });
      await Promise.all(promises);
      next();
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

// get
exports.reenviar = (req, res) => {
  req.session.save(() => {
    res.redirect(
      `${req.baseUrl}/respDoc/tribunales?departamentoID=${req.session.departamentoID}&planID=${req.session.planID}`
    );
  });
};
// post respDoc/aprobarTribunales:pdID
exports.aprobarTribunales = async (req, res, next) => {
  const { pdID } = req.session;
  const { departamentoID } = req.session;
  const date = new Date();
  let estadoTribunales;
  try {
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: pdID },
      attributes: ['estadoTribunales']
    });
    estadoTribunales = pd.estadoTribunales;
    if (!res.locals.permisoDenegado) {
      switch (estadoTribunales[departamentoID]) {
        case estados.estadoTribunal.abierto:
          estadoTribunales[departamentoID] =
            estados.estadoTribunal.aprobadoResponsable;
          break;
        case estados.estadoTribunal.aprobadoResponsable:
          estadoTribunales[departamentoID] =
            req.body.decision !== 'aceptar'
              ? estados.estadoTribunal.abierto
              : estados.estadoTribunal.aprobadoDirector;
          break;
        default:
          break;
      }
      await models.ProgramacionDocente.update(
        {
          estadoTribunales,
          fechaTribunales: date
        } /* set attributes' value */,
        { where: { identificador: pdID } } /* where criteria */
      );
      req.session.save(() => {
        progDocController.isPDLista(
          pdID,
          res.redirect(`${req.baseUrl}/respDoc/tribunales`)
        );
      });
    } else {
      req.session.save(() => {
        progDocController.isPDLista(
          pdID,
          res.redirect(`${req.baseUrl}/respDoc/tribunales`)
        );
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

const generateCsvCoordinadores = async (pdID, definitivo) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const plan = progDocController.getPlanPd(pdID);
    const planInfo = await planController.getPlanInfo(plan);
    const planAcronimo = planInfo.nombre || plan;
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: pdID },
      attributes: ['estadoProGDoc', 'estadoProfesores']
    });
    // solo se genera el pdf si se tiene permiso
    const fields = [
      'codigo_programa',
      'nombre_programa',
      'codigo_asignatura',
      'nombre_asignatura',
      'acronimo_asignatura',
      'curso',
      'duracion',
      'nombre_cordinador',
      'apellidos_cordinador',
      'email'
    ];
    const opts = { fields, withBOM: true, delimiter: ';' };
    const ano = progDocController.getAnoPd(pdID);
    const coordinadoresAsignaturas = await asignaturaController.getCoordinadoresAsignaturasProgDoc(
      pdID
    );
    const { estadoProfesores } = pd;
    const estadoProgDoc = pd.estadoProGDoc;
    const data = coordinadoresAsignaturas.map(coordinadorAsign => {
      return {
        codigo_programa: planInfo.codigo,
        nombre_programa: planInfo.nombreCompleto,
        codigo_asignatura: coordinadorAsign.codigo,
        nombre_asignatura: coordinadorAsign.nombre,
        acronimo_asignatura:
          coordinadorAsign.acronimo || coordinadorAsign.codigo,
        curso: coordinadorAsign.curso,
        duracion: coordinadorAsign.semestre,
        nombre_cordinador:
          coordinadorAsign['Coordinador.Persona.nombre'] || 'NO ASIGNADO',
        apellidos_cordinador:
          coordinadorAsign['Coordinador.Persona.apellido'] || 'NO ASIGNADO',
        email: coordinadorAsign['Coordinador.Persona.email'] || 'NO ASIGNADO'
      };
    });
    // si esta abierto se guarda en borrador
    let folder = '/';
    let folder2 = '';
    if (
      !progDocController.CumpleTodos(
        estados.estadoProfesor.aprobadoDirector,
        estadoProfesores
      ) ||
      (estadoProgDoc === estados.estadoProgDoc.incidencia &&
        definitivo !== true)
    ) {
      folder = '/borrador/';
      folder2 = '_borrador';
    }
    const dir = `${PATH_PDF}/pdfs/${progDocController.getAnoPd(
      pdID
    )}/${progDocController.getPlanPd(pdID)}/${progDocController.getTipoPd(
      pdID
    )}/${progDocController.getVersionPdNormalized(pdID)}${folder}`;
    const fileName = `coordinadores_${planAcronimo}_${plan}_${ano}_${progDocController.getTipoPd(
      pdID
    )}_${progDocController.getVersionPdNormalized(pdID)}${folder2}.csv`;
    const ruta = dir + fileName;
    funciones.ensureDirectoryExistence(ruta);
    const csv = json2csv(data, opts);
    await fs.writeFile(ruta, csv);
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.generateCsvCoordinadoresRouter = async (req, res, next) => {
  try {
    await generateCsvCoordinadores(req.session.pdID, req.definitivo);
    next();
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};
