const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const gestionPlanController = require('../../controllers/gestionPlan_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

// GET plan
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
  gestionPlanController.getGestionPlanes
);

// POST actualizar plan api upm
router.post(
  '/actualizarPlanApiUPM',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.incidencia
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.listo
        }
      ]
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  gestionPlanController.updateAsignaturasApiUpm,
  gestionPlanController.getGestionPlanes
);

// POST estado programacion docente plan
router.post(
  '/estado',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.incidencia
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.listo
        }
      ]
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  gestionPlanController.updateEstadoProgDoc
);

module.exports = router;
