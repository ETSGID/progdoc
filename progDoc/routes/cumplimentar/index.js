const express = require('express');

const router = express.Router();
const routerEstado = require('./estado');
const routerCalendario = require('./calendario');
const routerProfesor = require('./profesor');
const routerTribunal = require('./tribunal');
const routerHorario = require('./horario');
const routerActividad = require('./actividad');
const routerExamen = require('./examen');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.menu = [];
  req.session.menu.push('drop_ProgDoc');
  req.session.menu.push('element_ProgDocCumplimentar');
  req.session.menuBar = enumsPD.menuBar.cumplimentar.nombre;
  next();
});

router.get('/', (req, res) => {
  req.session.save(() => {
    res.redirect(`${req.baseUrl}/estado`);
  });
});

// Estado programacion docente
router.use('/estado', routerEstado);

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
