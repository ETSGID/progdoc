const Sequelize = require('sequelize');
const models = require('../models');
const estados = require('../estados');
const progDocController = require('./progDoc_controller');

const funciones = require('../funciones');

exports.gestionProgDoc = async (req, res, next) => {
  let pds = [];
  /*
  las susceptibles a incidencia son las anteriores. Lo importante es el orden.
  La unica excepcion es si la pd está cerrada o en incidencia que esta es la anterior
  */
  const pdsAnteriores = [];
  const promises2 = [];
  const anos = [];
  try {
    // borras si hay algun error las pds que puedan tenerlos
    await progDocController.borrarPdsWithErrores();
    // la incidencia se marca sobre la pd anterior (no la versión anterior)
    const pdsBBDD = await models.ProgramacionDocente.findAll({
      order: [
        [Sequelize.literal('"PlanEstudioId"'), 'DESC'],
        [Sequelize.literal('"anoAcademico"'), 'DESC'],
        [Sequelize.literal('semestre'), 'DESC'],
        [Sequelize.literal('version'), 'DESC']
      ],
      raw: true
    });
    pdsBBDD.forEach(pdBBDD => {
      const existentePD = pds.find(
        obj => obj.PlanEstudioId === pdBBDD.PlanEstudioId
      );
      if (!existentePD) {
        pds.push({
          PlanEstudioId: pdBBDD.PlanEstudioId,
          identificador: pdBBDD.identificador,
          estadoProGDoc: pdBBDD.estadoProGDoc,
          reabierto: pdBBDD.reabierto,
          anoAcademico: pdBBDD.anoAcademico,
          siguienteAnoAcademico: funciones.siguienteAnoAcademico(
            pdBBDD.anoAcademico
          ),
          semestre: pdBBDD.semestre,
          isPDInitialState: progDocController.isPDInitialState(pdBBDD)
        });
        // TODO: cuando se añadan las otras funciones hay que ponerlas aquí
        // para comprobar si la pd se puede marcar como lista para que Jefatura de Estudios la cierre
        // si manualmente cambia algo de las otras partes para que al acceder a JE cambie
        if (
          pdBBDD.estadoProGDoc === estados.estadoProgDoc.abierto &&
          progDocController.CumpleTodos(
            estados.estadoProfesor.aprobadoDirector,
            pdBBDD.estadoProfesores
          ) &&
          progDocController.CumpleTodos(
            estados.estadoTribunal.aprobadoDirector,
            pdBBDD.estadoTribunales
          ) &&
          pdBBDD.estadoHorarios === estados.estadoHorario.aprobadoCoordinador &&
          pdBBDD.estadoExamenes === estados.estadoExamen.aprobadoCoordinador &&
          pdBBDD.estadoCalendario ===
            estados.estadoCalendario.aprobadoCoordinador
        ) {
          promises2.push(
            models.ProgramacionDocente.update(
              {
                estadoProGDoc: estados.estadoProgDoc.listo
              } /* set attributes' value */,
              {
                where: { identificador: pdBBDD.identificador }
              } /* where criteria */
            )
          );
        }
      } else {
        const existentePDAnterior = pdsAnteriores.find(
          obj => obj.PlanEstudioId === pdBBDD.PlanEstudioId
        );
        /*
        solo habrá una pd susceptible de incidencia como mucho
        y no debe coincidir con el mismo año o semestre, esto es por si hay varias versiones.
        Además si la pdActual está cerrada o incidencia ya será la pdActual la de incidencia
        */
        if (
          !existentePDAnterior &&
          (pdBBDD.anoAcademico !== existentePD.anoAcademico ||
            pdBBDD.semestre !== existentePD.semestre) &&
          existentePD.estadoProgDoc !== estados.estadoProgDoc.cerrado &&
          existentePD.estadoProgDoc !== estados.estadoProgDoc.incidencia
        ) {
          pdsAnteriores.push({
            PlanEstudioId: pdBBDD.PlanEstudioId,
            identificador: pdBBDD.identificador,
            estadoProGDoc: pdBBDD.estadoProGDoc,
            anoAcademico: pdBBDD.anoAcademico,
            semestre: pdBBDD.semestre
          });
        }
      }
    });
    // puede haber planes sin pd, como los nuevos planes
    res.locals.planEstudios.forEach(plan => {
      const existentePD = pds.find(obj => obj.PlanEstudioId === plan.codigo);
      if (existentePD) {
        existentePD.nombre = plan.nombre;
        existentePD.nombreCompleto = plan.nombreCompleto;
      } else {
        pds.push({
          PlanEstudioId: plan.codigo,
          identificador: null,
          estadoProGDoc: estados.estadoProgDoc.cerrado,
          nombre: plan.nombre,
          nombreCompleto: plan.nombreCompleto,
          anoAcademico: null,
          siguienteAnoAcademico: null,
          semestre: null
        }); // estado cerrado en caso de que no haya ninguan pd en el sistema
      }
    });
    // solo se van a mostrar los planes con acronimo
    pds = pds.filter(pd => pd.nombre && pd.nombre.trim() !== '');
    const year = new Date().getFullYear();
    const siguiente = year + 1;
    const siguiente2 = year + 2;
    anos.push(`${year}${siguiente.toString().substr(-2)}`);
    anos.push(`${siguiente}${siguiente2.toString().substr(-2)}`);
    await Promise.all(promises2);
    // si cambie alguna asignatura por el caso ese raro se deberá volver para obtener los datos.
    if (promises2.length > 0) {
      req.session.save(() => {
        res.redirect(req.baseUrl);
      });
    } else {
      res.render('gestionPlanes/abrirCerrarPds', {
        planes: res.locals.planEstudios,
        pds,
        permisoDenegado: res.locals.permisoDenegado || null,
        pdsAnteriores,
        estadosProgDoc: estados.estadoProgDoc,
        anos,
        consultarpath: `${req.baseUrl}/consultar`,
        abrirpath: `${req.baseUrl}/abrir`,
        cerrarpath: `${req.baseUrl}/cerrar`,
        abririncidenciapath: `${req.baseUrl}/abrirIncidencia`,
        cerrarincidenciapath: `${req.baseUrl}/cerrarIncidencia`,
        reabrirpath: `${req.baseUrl}/reabrir`,
        eliminarpath: `${req.baseUrl}/eliminar`
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// se completa con lo que hay en el controller de abrirProgDoc_controller
// TODO a medida que aparezcan mas funciones hay que inicializar sus estados aquí
exports.abrirProgDoc = async (req, res, next) => {
  const estadoProfesores = {};
  const estadoTribunales = {};
  const nuevaEntrada = {};
  try {
    if (!res.locals.permisoDenegado) {
      res.locals.departamentosResponsables.forEach(element => {
        estadoProfesores[element] = estados.estadoProfesor.abierto;
        estadoTribunales[element] = estados.estadoTribunal.abierto;
      });
      nuevaEntrada.estadoProfesores = estadoProfesores;
      nuevaEntrada.fechaProfesores = new Date();
      nuevaEntrada.estadoTribunales = estadoTribunales;
      nuevaEntrada.fechaTribunales = new Date();
      nuevaEntrada.estadoHorarios = estados.estadoHorario.abierto;
      nuevaEntrada.fechaHorarios = new Date();
      nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.abierto;
      nuevaEntrada.fechaProgDoc = new Date();
      nuevaEntrada.fechaGrupos = new Date();
      nuevaEntrada.estadoExamenes = estados.estadoExamen.abierto;
      nuevaEntrada.fechaExamenes = new Date();
      nuevaEntrada.estadoCalendario = estados.estadoCalendario.abierto;
      nuevaEntrada.fechaCalendario = new Date();
      await models.ProgramacionDocente.update(
        nuevaEntrada /* set attributes' value */,
        {
          where: { identificador: res.locals.identificador }
        } /* where criteria */
      );
      req.session.save(() => {
        res.redirect(req.baseUrl);
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
// obtener la pd que se va a cerrar
exports.cerrarProgDoc = async (req, res, next) => {
  try {
    if (!res.locals.permisoDenegado) {
      const pdID = req.body.pdIdentificador.split('-')[1];
      const pd = await models.ProgramacionDocente.findOne({
        where: { identificador: pdID },
        include: [
          {
            model: models.PlanEstudio,
            attributes: ['nombre', 'nombreCompleto']
          }
        ],
        raw: true
      });
      res.locals.progDoc = pd;
      next();
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
// TODO a medida que aparezcan mas funciones hay que inicializar sus estados aquí
exports.abrirIncidenciaProgDoc = async (req, res, next) => {
  try {
    if (!res.locals.permisoDenegado) {
      const estadoProfesores = {};
      const estadoTribunales = {};
      const nuevaEntrada = {};
      res.locals.departamentosResponsables.forEach(element => {
        estadoProfesores[element] = estados.estadoProfesor.aprobadoDirector;
        estadoTribunales[element] = estados.estadoProfesor.aprobadoDirector;
      });
      nuevaEntrada.estadoProfesores = estadoProfesores;
      nuevaEntrada.estadoTribunales = estadoTribunales;
      nuevaEntrada.estadoHorarios = estados.estadoHorario.aprobadoCoordinador;
      nuevaEntrada.estadoExamenes = estados.estadoExamen.aprobadoCoordinador;
      nuevaEntrada.estadoCalendario =
        estados.estadoCalendario.aprobadoCoordinador;
      nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.incidencia;
      nuevaEntrada.fechaProgDoc = new Date();
      nuevaEntrada.fechaProfesores = new Date();
      nuevaEntrada.fechaTribunales = new Date();
      nuevaEntrada.fechaHorarios = new Date();
      nuevaEntrada.fechaGrupos = new Date();
      nuevaEntrada.fechaExamenes = new Date();
      nuevaEntrada.fechaCalendario = new Date();
      await models.ProgramacionDocente.update(
        nuevaEntrada /* set attributes' value */,
        {
          where: { identificador: res.locals.identificador }
        } /* where criteria */
      );
      req.session.save(() => {
        res.redirect(req.baseUrl);
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
exports.cerrarIncidenciaProgDoc = async (req, res, next) => {
  try {
    if (!res.locals.permisoDenegado) {
      const pdID = req.body.pdIdentificador.split('-')[1];
      // debo guardarla para generar los csv de los examenes
      req.session.pdID = pdID;
      const pd = await models.ProgramacionDocente.findOne({
        where: { identificador: pdID },
        include: [
          {
            model: models.PlanEstudio,
            attributes: ['nombre', 'nombreCompleto']
          }
        ],
        raw: true
      });
      res.locals.progDoc = pd;
      next();
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

exports.reabrirProgDoc = async (req, res, next) => {
  /*
  debe quitar de la sesión el pdID que puse antes para ver los permisos
  por si hay algun error y no se reabre.
  */
  req.session.pdID = null;
  const estadoProfesores = {};
  const estadoTribunales = {};
  try {
    if (!res.locals.permisoDenegado) {
      const nuevaEntrada = {};
      res.locals.departamentosResponsables.forEach(element => {
        estadoProfesores[element] = estados.estadoProfesor.abierto;
        estadoTribunales[element] = estados.estadoProfesor.abierto;
      });
      nuevaEntrada.estadoProfesores = estadoProfesores;
      nuevaEntrada.fechaProfesores = new Date();
      nuevaEntrada.estadoTribunales = estadoTribunales;
      nuevaEntrada.fechaTribunales = new Date();
      nuevaEntrada.estadoHorarios = estados.estadoHorario.abierto;
      nuevaEntrada.fechaHorarios = new Date();
      nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.abierto;
      nuevaEntrada.fechaProgDoc = new Date();
      nuevaEntrada.fechaGrupos = new Date();
      nuevaEntrada.estadoExamenes = estados.estadoExamen.abierto;
      nuevaEntrada.fechaExamenes = new Date();
      nuevaEntrada.estadoCalendario = estados.estadoCalendario.abierto;
      nuevaEntrada.fechaCalendario = new Date();
      nuevaEntrada.reabierto = 1;
      await models.ProgramacionDocente.update(
        nuevaEntrada /* set attributes' value */,
        {
          where: { identificador: res.locals.identificador }
        } /* where criteria */
      );
      req.session.save(() => {
        res.redirect(req.baseUrl);
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

// cerrar la progdoc
exports.cerrarProgDoc2 = async (req, res, next) => {
  try {
    const pdID = res.locals.progDoc.identificador;
    await models.ProgramacionDocente.update(
      {
        estadoProGDoc: estados.estadoProgDoc.cerrado,
        fechaProgDoc: new Date(),
        HistorialID: `url_${pdID}`
      } /* set attributes' value */,
      { where: { identificador: pdID } } /* where criteria */
    );
    req.session.save(() => {
      res.redirect(req.baseUrl);
    });
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// eliminar toda la informacion de una progdoc
exports.eliminarProgDoc = async (req, res, next) => {
  try {
    if (!res.locals.permisoDenegado) {
      const { pdID } = req.session;
      await progDocController.borrarPd(pdID);
      req.session.save(() => {
        res.redirect(req.baseUrl);
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
