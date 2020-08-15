const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const calendarioController = require('../../controllers/calendario_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.gestion.submenu.calendario;
  next();
});

// GET calenadrio general
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
  calendarioController.anoDeTrabajo,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendario
);

// POST create or update eventoGeneral calendario general
router.post(
  '/eventoGeneral',
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
  calendarioController.postEventoGeneral
);

// DELETE eventoGeneral calendario general
router.delete(
  '/eventoGeneral',
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
  calendarioController.deleteEventoGeneral
);

// POST estado calendario general
router.post(
  '/estado',
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
  calendarioController.trasladarGeneral
);

// POST copiar eventos calendario general anio anterior
router.post(
  '/copiar',
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
  calendarioController.copiarEventos
);

// POST eventos editables calendario plan
router.post(
  '/editable',
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
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  calendarioController.editablePlan
);
module.exports = router;
