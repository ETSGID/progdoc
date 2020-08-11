const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const calendarioController = require('../../controllers/calendario_controller');

const enumsPD = require('../../enumsPD');

// GET calendario plan
router.get(
  '/',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });

    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  calendarioController.anoDeTrabajo,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPlan
);

// POST create or update evento or eventoGeneral calendario plan
router.post(
  '/evento',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  calendarioController.postEventoPlan
);

// DELETE evento or eventoGeneral calendario plan
router.delete(
  '/evento',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  calendarioController.deleteEventoPlan
);

module.exports = router;
