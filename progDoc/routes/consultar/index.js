const express = require('express');

const router = express.Router();

const routerAula = require('./aula');

const asignacionYTribunalController = require('../../controllers/asignacionYTribunal_controller');
const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const horarioController = require('../../controllers/horario_controller');
const grupoController = require('../../controllers/grupo_controller');
const rolController = require('../../controllers/rol_controller');
const estadoController = require('../../controllers/estado_controller');
const pdfController = require('../../controllers/pdf_controller');
const examenController = require('../../controllers/examen_controller');
const calendarioController = require('../../controllers/calendario_controller');
const actividadParcialController = require('../../controllers/actividadParcial_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.menu = [];
  req.session.menu.push('drop_ProgDoc');
  req.session.menu.push('element_ProgDocConsultar');
  req.session.menuBar = enumsPD.menuBar.consultar.nombre;
  next();
});

router.get('/', (req, res) => {
  req.session.save(() => {
    res.redirect(`${req.baseUrl}/estado`);
  });
});

// GET estado programacion docente
router.get(
  '/estado',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.estado;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);

// GET roles
router.get(
  '/roles',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.rol;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  rolController.getRoles
);

// Aulas
router.use('/aulas', routerAula);

// GET grupos programacion docente
router.get(
  '/grupos',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.grupo;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  grupoController.getGrupos
);

// GET calendario programacion docente
router.get(
  '/calendario',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.calendario;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  calendarioController.anoDeTrabajo,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPlanConsultar
);

// GET profesores programacion docente
router.get(
  '/profesores',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.profesor;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  asignacionYTribunalController.getAsignaciones
);

// GET tribunales programacion docente
router.get(
  '/tribunales',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.tribunal;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  asignacionYTribunalController.getTribunales
);

// GET horarios programacion docente
router.get(
  '/horarios',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.horario;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  horarioController.getHorario
);

// GET actividades programacion docente
router.get(
  '/actividades',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.actividad;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  actividadParcialController.getActividadParcial
);

// GET examenes programacion docente
router.get(
  '/examenes',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.examen;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  examenController.getFranjas,
  examenController.getExamenes,
  examenController.getExamenesView
);

// GET PDF programacion docente
router.get(
  '/PDF',
  (req, res, next) => {
    req.session.submenu = enumsPD.menuBar.consultar.submenu.pdf;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF
);

module.exports = router;
