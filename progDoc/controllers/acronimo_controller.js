const models = require('../models');
const funciones = require('../funciones');
const estados = require('../estados');
const asignaturaController = require('./asignatura_controller');
const departamentoController = require('./departamento_controller');
const planController = require('./plan_controller');

exports.getAcronimos = async function(req, res, next) {
  req.session.submenu = 'Acronimos';
  // se obtienen todos los planes, incluidos los que no se muestran
  // no se muestran normalmente los planes sin acronimo
  res.locals.planEstudios = await planController.getPlanesFunction(false);
  try {
    const departs = await departamentoController.getAllDepartamentos();
    const nuevopath = `${req.baseUrl}/gestionAcronimos/guardarAcronimosJE`;
    const cancelarpath = `${req.baseUrl}/gestion/acronimos?planID=${req.session.planID}`;
    const asignaturasPorCursos = {};
    if (
      !res.locals.progDoc ||
      !res.locals.departamentosResponsables ||
      (estados.estadoProgDoc.abierto !==
        res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
        estados.estadoProgDoc.incidencia !==
          res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'])
    ) {
      res.render('acronimos/acronimosJE', {
        existe:
          'Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada',
        permisoDenegado: res.locals.permisoDenegado,
        menu: req.session.menu,
        submenu: req.session.submenu,
        planID: req.session.planID,
        planEstudios: res.locals.planEstudios,
        nuevopath,
        cancelarpath,
        departamentos: departs.sort(funciones.sortDepartamentos),
        asignaturas: null
      });
    } else {
      const pdID = res.locals.progDoc['ProgramacionDocentes.identificador'];
      const asign = await asignaturaController.getAsignaturasProgDoc(pdID);
      asign.forEach(as => {
        if (asignaturasPorCursos[as.curso] == null) {
          asignaturasPorCursos[as.curso] = [];
        }
        asignaturasPorCursos[as.curso].push(as);
      });
      res.render('acronimos/acronimosJE', {
        permisoDenegado: res.locals.permisoDenegado,
        menu: req.session.menu,
        submenu: req.session.submenu,
        planID: req.session.planID,
        planEstudios: res.locals.planEstudios,
        nuevopath,
        cancelarpath,
        asignaturas: asignaturasPorCursos,
        departamentos: departs.sort(funciones.sortDepartamentos),
        pdID
      });
    }
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

// guardar acrónimos departamento
exports.actualizarAcronimos = async function(req, res, next) {
  const { planID } = req.session;
  let toActualizar = req.body.actualizar;
  const promises = [];
  if (toActualizar && !res.locals.permisoDenegado) {
    if (!Array.isArray(toActualizar)) {
      toActualizar = [toActualizar];
    }
    toActualizar.forEach(element => {
      const elementToActualizar = {};
      let codigo = element.split('_')[element.split('_').length - 1];
      const acronimo = req.body[element];
      switch (element.split('_')[0]) {
        case 'departamento':
          elementToActualizar.acronimo = acronimo;
          promises.push(
            models.Departamento.update(
              elementToActualizar /* set attributes' value */,
              { where: { codigo } } /* where criteria */
            )
          );
          break;
        case 'plan':
          elementToActualizar.nombre = acronimo;
          if (acronimo === 'null' || acronimo.trim('').trim() === '')
            elementToActualizar.nombre = null;
          promises.push(
            models.PlanEstudio.update(
              elementToActualizar /* set attributes' value */,
              { where: { codigo } } /* where criteria */
            )
          );
          break;
        case 'asignatura':
          elementToActualizar.acronimo = acronimo;
          codigo = Number(codigo);
          promises.push(
            models.Asignatura.update(
              elementToActualizar /* set attributes' value */,
              { where: { identificador: codigo } } /* where criteria */
            )
          );
          break;
        default:
          break;
      }
    });
  }
  try {
    await Promise.all(promises);
    req.session.save(() => {
      res.redirect(`${req.baseUrl}/gestion/acronimos?planID=${planID}`);
    });
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};
