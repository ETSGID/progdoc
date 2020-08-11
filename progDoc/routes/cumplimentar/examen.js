const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const examenController = require('../../controllers/examen_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

// GET examenes programacion docente
router.get(
  '/',
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoExamenes'],
          resultado: estados.estadoExamen.abierto
        },
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  examenController.getFranjas,
  examenController.getExamenes,
  examenController.getExamenesView
);

// GET franjas examenes programacion docente
router.get(
  '/franjas',
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoExamenes'],
          resultado: estados.estadoExamen.abierto
        },
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

    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  examenController.getFranjas,
  examenController.getFranjasView
);

// POST examenes programacion docente
router.post(
  '/',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoExamenes'],
          resultado: estados.estadoExamen.abierto
        },
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
  examenController.guardarExamenes,
  examenController.getExamenes,
  examenController.generateCsvExamens,
  examenController.reenviarExamenesAjax
);

// POST examenes programacion docente
router.post(
  '/franjas',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoExamenes'],
          resultado: estados.estadoExamen.abierto
        },
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
  examenController.guardarFranjasExamenes
);

// POST estado examenes programacion docente
router.post(
  '/estado',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoExamenes'],
          resultado: estados.estadoExamen.abierto
        },
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  examenController.aprobarExamenes,
  examenController.getExamenes,
  examenController.generateCsvExamens,
  examenController.reenviarExamenes
);

module.exports = router;
