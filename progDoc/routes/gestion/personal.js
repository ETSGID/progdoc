const express = require('express');

const router = express.Router();

const rolController = require('../../controllers/rol_controller');
const personaYProfesorController = require('../../controllers/personaYProfesor_controller');

const enumsPD = require('../../enumsPD');

// GET personal
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
  rolController.comprobarRols,
  personaYProfesorController.getPersonasPagination
);

// POST personal
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
  personaYProfesorController.anadirPersonaAndProfesor
);

// PUT personal
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
  personaYProfesorController.updatePersonaAndProfesor
);

// DELETE personal
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
  personaYProfesorController.deletePersonaAndProfesor
);

module.exports = router;
