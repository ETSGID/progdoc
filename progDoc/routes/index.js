const express = require('express');

const router = express.Router();
const routerConsultar = require('./consultar');
const routerCumplimentar = require('./cumplimentar');
const routerGestion = require('./gestion');
const routerHistorial = require('./historial');

const rolController = require('../controllers/rol_controller');
const personaYProfesorController = require('../controllers/personaYProfesor_controller');

const enumsPD = require('../enumsPD');

router.all('*', (req, res, next) => {
  // actualizo la sesion el planID y el departamento seleccionado
  let { planID } = req.query;
  if (!planID) {
    planID = req.session.planID;
  }
  if (!planID) {
    planID = 'none';
  }
  let { departamentoID } = req.query;
  if (!departamentoID) {
    departamentoID = req.session.departamentoID;
  }
  if (!departamentoID) {
    departamentoID = 'none';
  }
  req.session.planID = planID;
  req.session.departamentoID = departamentoID;
  // roles que pueden hacer todo son admin
  res.locals.rols = [];
  res.locals.rols.push({
    rol: enumsPD.rols.Admin,
    PlanEstudioCodigo: null,
    DepartamentoCodigo: null,
    tipo: enumsPD.permisions.cumplimentar,
    condiciones: []
  });

  next();
});

router.all('*', rolController.comprobarRolYPersona);

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get(
  '/',
  (req, res, next) => {
    req.session.menu = [];
    req.session.menuBar = null;
    req.session.submenu = null;
    req.session.subsubmenu = null;
    next();
  },
  rolController.getRolsPersonaView
);

router.use('/consultar', routerConsultar);
router.use('/cumplimentar', routerCumplimentar);
router.use('/historial', routerHistorial);
router.use('/gestion', routerGestion);

// Add persona and profesor
router.post('/anadirProfesor', personaYProfesorController.anadirProfesor);

module.exports = router;
