const express = require('express');

const router = express.Router();

const planController = require('../../controllers/plan_controller');
const aulaController = require('../../controllers/aula_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.gestion.submenu.aula.nombre;
  next();
});
// GET aulas
router.get(
  '/',
  (req, res, next) => {
    req.session.subsubmenu =
      enumsPD.menuBar.consultar.submenu.aula.submenu.aula.nombre;
    next();
  },
  planController.getPlanes,
  aulaController.getAulas
);

// GET asignacion aulas
router.get(
  '/asignacion',
  (req, res, next) => {
    req.session.subsubmenu =
      enumsPD.menuBar.consultar.submenu.aula.submenu.asignacionAulas.nombre;
    next();
  },
  planController.getPlanes,
  aulaController.getAsignacionAulas
);

// POST pdf aulas
router.post(
  '/pdf',
  planController.getPlanes,
  aulaController.getAsignacionAulas
);

module.exports = router;
