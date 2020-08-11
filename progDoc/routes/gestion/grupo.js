const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const grupoController = require('../../controllers/grupo_controller');
const rolController = require('../../controllers/rol_controller');

const enumsPD = require('../../enumsPD');

// GET grupos programacion docente
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
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  grupoController.getGrupos
);

// POST grupos programacion docente
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
  planController.getPlanes,
  rolController.comprobarRols,
  grupoController.EliminarGruposJE,
  grupoController.ActualizarGruposJE,
  grupoController.AnadirGruposJE
);

module.exports = router;
