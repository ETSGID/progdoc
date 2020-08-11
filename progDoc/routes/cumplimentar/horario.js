const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const horarioController = require('../../controllers/horario_controller');
const rolController = require('../../controllers/rol_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

// GET horarios programacion docente
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
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  horarioController.getHorario
);

// POST horarios programacion docente
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
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  horarioController.guardarHorarios,
  horarioController.reenviar
);

// POST nota horario programacion docente
router.post(
  '/nota',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  horarioController.guardarNota
);

// UPDATE nota horario programacion docente
router.put(
  '/nota/:id',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  horarioController.updateNota
);

// DELETE nota horario programacion docente
router.delete(
  '/nota/:id',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  horarioController.eliminarNota
);

// POST estado tribunales programacion docente
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
          condicion: ['estadoHorarios'],
          resultado: estados.estadoHorario.abierto
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
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  horarioController.aprobarHorarios
);

module.exports = router;
