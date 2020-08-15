const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');
const actividadParcialController = require('../../controllers/actividadParcial_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.cumplimentar.submenu.actividad;
  next();
});

// GET actividades
router.get(
  '/',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  rolController.comprobarRols,
  actividadParcialController.getActividadParcial
);

// POST estado actividades programacion docente
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
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.aprobarActividades
);

// POST actividad actividades programacion docente
router.post(
  '/actividad',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.guardarActividad
);

// UPDATE actividad actividades programacion docente
router.put(
  '/actividad/:id',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.updateActividad
);

// DELETE actividad actividades programacion docente
router.delete(
  '/actividad/:id',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.eliminarActividad
);

// POST conjunto actividad actividades programacion docente
router.post(
  '/conjuntoActividadParcial',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.crearConjuntoActividadParcial
);

// POST update conjunto actividad actividades programacion docente
router.post(
  '/conjuntoActividadParcial/:id',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.actualizarConjuntoActividadParcial
);

// DELETE conjunto actividad actividades programacion docente
router.delete(
  '/conjuntoActividadParcial/:id',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoCalendario'],
          resultado: estados.estadoCalendario.abierto
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
  actividadParcialController.eliminarConjuntoActividadParcial
);

module.exports = router;
