const express = require('express');

const router = express.Router();
const routerEstado = require('./estado');
const routerCalendario = require('./calendario');
const routerGrupo = require('./grupo');
const routerPersonal = require('./personal');
const routerRol = require('./rol');
const routerAcronimo = require('./acronimo');
const routerPlan = require('./plan');
const routerAula = require('./aula');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.menu = [];
  req.session.menu.push('drop_ProgDoc');
  req.session.menu.push('element_ProgDocGestion');
  req.session.menuBar = enumsPD.menuBar.gestion;
  next();
});

router.get('/', (req, res) => {
  req.session.save(() => {
    res.redirect(`${req.baseUrl}/estados`);
  });
});

// Estados
router.use('/estados', routerEstado);

// Calendario
router.use('/calendario', routerCalendario);

// Grupos
router.use('/grupos', routerGrupo);

// Personal
router.use('/personal', routerPersonal);

// Roles
router.use('/roles', routerRol);

// Acronimos
router.use('/acronimos', routerAcronimo);

// Plan
router.use('/plan', routerPlan);

// Aulas
router.use('/aulas', routerAula);

module.exports = router;
