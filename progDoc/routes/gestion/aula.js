const express = require('express');

const router = express.Router();

const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const aulaController = require('../../controllers/aula_controller');

const enumsPD = require('../../enumsPD');

// GET aulas
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
  aulaController.getAulas
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
  aulaController.getAulas
);

module.exports = router;
