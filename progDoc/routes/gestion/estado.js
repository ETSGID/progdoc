const express = require('express');

const router = express.Router();

const asignacionYTribunalController = require('../../controllers/asignacionYTribunal_controller');
const abrirProgDocController = require('../../controllers/abrirProgDoc_controller');
const abrirProgDoc2Controller = require('../../controllers/abrirProgDoc2_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const pdfController = require('../../controllers/pdf_controller');
const examenController = require('../../controllers/examen_controller');
const calendarioController = require('../../controllers/calendario_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.gestion.submenu.estado;
  next();
});

// GET estado programaciones docentes
router.get(
  '/',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDoc2Controller.gestionProgDoc
);

// POST abrir programacion docente
router.post(
  '/abrir',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDocController.abrirNuevaProgDoc,
  abrirProgDoc2Controller.abrirProgDoc
);

// POST cerrar programacion docente
router.post(
  '/cerrar',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDoc2Controller.cerrarProgDoc,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF,
  abrirProgDoc2Controller.cerrarProgDoc2
);

// POST abrir incidencia programacion docente
router.post(
  '/abrirIncidencia',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDocController.abrirCopiaProgDoc,
  abrirProgDoc2Controller.abrirIncidenciaProgDoc
);

// POST cerrar incidencia programacion docente
router.post(
  '/cerrarIncidencia',
  (req, res, next) => {
    req.definitivo = true;
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDoc2Controller.cerrarIncidenciaProgDoc,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF,
  examenController.getExamenes,
  examenController.generateCsvExamens,
  asignacionYTribunalController.generateCsvCoordinadoresRouter,
  abrirProgDoc2Controller.cerrarProgDoc2
);

// POST reabrir programacion docente
router.post(
  '/reabrir',
  (req, res, next) => {
    // es el unico caso en el que debo hacer esto aqui pq no está guardada en sesión
    // y lo necesito para los permisos
    // eslint-disable-next-line prefer-destructuring
    req.session.pdID = req.body.pdIdentificador.split('-')[1];
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['reabierto'],
          resultado: 0
        }
      ]
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDocController.abrirCopiaProgDoc,
  abrirProgDoc2Controller.reabrirProgDoc
);

// POST eliminar programacion docente
router.post(
  '/eliminar',
  (req, res, next) => {
    // es el unico caso en el que debo hacer esto aqui pq no está guardada en sesión
    // y lo necesito para los permisos
    // eslint-disable-next-line prefer-destructuring
    req.session.pdID = req.body.pdIdentificador.split('-')[1];
    // solo se pueden borrar progdocs con nada aprobado o progdocs en incidencia
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.abierto
        },
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.abierto
        },
        {
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
        },
        {
          condicion: ['estadoExamenes'],
          resultado: estados.estadoExamen.abierto
        },
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.incidencia
        }
      ]
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDoc2Controller.eliminarProgDoc
);

module.exports = router;
