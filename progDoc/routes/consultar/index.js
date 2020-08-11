const express = require('express');

const router = express.Router();

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
const aulaController = require('../../controllers/aula_controller');
const actividadParcialController = require('../../controllers/actividadParcial_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.menu = [];
  req.session.menu.push('drop_ProgDoc');
  req.session.menu.push('element_ProgDocConsultar');
  req.session.menuBar = enumsPD.menuBar.consultar;
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
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);

// GET roles
router.get(
  '/roles',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  rolController.getRoles
);

// GET aulas
router.get('/aulas', planController.getPlanes, aulaController.getAulas);

// GET grupos programacion docente
router.get(
  '/grupos',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  grupoController.getGrupos
);

// GET calendario programacion docente
router.get(
  '/calendario',
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
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  asignacionYTribunalController.getAsignaciones
);

// GET tribunales programacion docente
router.get(
  '/tribunales',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  asignacionYTribunalController.getTribunales
);

// GET horarios programacion docente
router.get(
  '/horarios',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  horarioController.getHorario
);

// GET actividades programacion docente
router.get(
  '/actividades',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  actividadParcialController.getActividadParcial
);

// GET examenes programacion docente
router.get(
  '/examenes',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  examenController.getFranjas,
  examenController.getExamenes,
  examenController.getExamenesView
);

// GET PDF programacion docente
router.get(
  '/PDF',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF
);

module.exports = router;
