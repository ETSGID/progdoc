const express = require('express');

const router = express.Router();
const routerCalendario = require('./calendario');
const routerProfesor = require('./profesor');
const routerTribunal = require('./tribunal');
const routerHorario = require('./horario');
const routerActividad = require('./actividad');
const routerExamen = require('./examen');

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const estadoController = require('../../controllers/estado_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.menu = [];
  req.session.menu.push('drop_ProgDoc');
  req.session.menu.push('element_ProgDocCumplimentar');
  req.session.menuBar = enumsPD.menuBar.cumplimentar;
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

// Calendario
router.use('/calendario', routerCalendario);

// Profesores
router.use('/profesores', routerProfesor);

// Tribunales
router.use('/tribunales', routerTribunal);

// Horarios
router.use('/horarios', routerHorario);

// Actividades
router.use('/actividades', routerActividad);

// Examenes
router.use('/examenes', routerExamen);

module.exports = router;
