const express = require('express');

const router = express.Router();

const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
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
      enumsPD.menuBar.gestion.submenu.aula.submenu.aula.nombre;
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
  aulaController.getAulas
);

// GET asignacion aulas
router.get(
  '/asignacion',
  (req, res, next) => {
    req.session.subsubmenu =
      enumsPD.menuBar.gestion.submenu.aula.submenu.asignacionAulas.nombre;
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
  aulaController.getAsignacionAulas
);

// POST pdf aulas
router.post(
  '/pdf',
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
  aulaController.getAsignacionAulas
);

// POST aula
router.post(
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
  rolController.comprobarRols,
  aulaController.createAula
);

// UPDATE aula
router.put(
  '/:id',
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
  rolController.comprobarRols,
  aulaController.updateAula
);

// DELETE aula
router.delete(
  '/:id',
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
  rolController.comprobarRols,
  aulaController.deleteAula
);

module.exports = router;
