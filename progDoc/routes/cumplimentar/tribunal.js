const express = require('express');

const router = express.Router();

const asignacionYTribunalController = require('../../controllers/asignacionYTribunal_controller');
const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.cumplimentar.submenu.tribunal;
  next();
});

// GET tribunales programacion docente
router.get(
  '/',
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.ResponsableDocente,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.abierto
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.DirectorDepartamento,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.aprobadoResponsable
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    if (
      req.session.departamentoID === 'TFG' ||
      req.session.departamentoID === 'TFM'
    ) {
      res.locals.rols.push({
        rol: enumsPD.rols.CoordinadorTitulacion,
        PlanEstudioCodigo: req.session.planID,
        DepartamentoCodigo: null,
        tipo: enumsPD.permisions.cumplimentar,
        condiciones: [
          {
            condicion: ['estadoTribunales', req.session.departamentoID],
            resultado: estados.estadoTribunal.abierto
          },
          {
            condicion: ['estadoProGDoc'],
            resultado: estados.estadoProgDoc.abierto
          }
        ]
      });
      res.locals.rols.push({
        rol: enumsPD.rols.CoordinadorTitulacion,
        PlanEstudioCodigo: req.session.planID,
        DepartamentoCodigo: null,
        tipo: enumsPD.permisions.cumplimentar,
        condiciones: [
          {
            condicion: ['estadoTribunales', req.session.departamentoID],
            resultado: estados.estadoTribunal.aprobadoResponsable
          },
          {
            condicion: ['estadoProGDoc'],
            resultado: estados.estadoProgDoc.abierto
          }
        ]
      });
    }
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
  asignacionYTribunalController.getTribunales
);

// POST tribunales programacion docente
router.post(
  '/',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.ResponsableDocente,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.abierto
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.DirectorDepartamento,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.aprobadoResponsable
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    if (
      req.session.departamentoID === 'TFG' ||
      req.session.departamentoID === 'TFM'
    ) {
      res.locals.rols.push({
        rol: enumsPD.rols.CoordinadorTitulacion,
        PlanEstudioCodigo: req.session.planID,
        DepartamentoCodigo: null,
        tipo: enumsPD.permisions.cumplimentar,
        condiciones: [
          {
            condicion: ['estadoTribunales', req.session.departamentoID],
            resultado: estados.estadoTribunal.abierto
          },
          {
            condicion: ['estadoProGDoc'],
            resultado: estados.estadoProgDoc.abierto
          }
        ]
      });
      res.locals.rols.push({
        rol: enumsPD.rols.CoordinadorTitulacion,
        PlanEstudioCodigo: req.session.planID,
        DepartamentoCodigo: null,
        tipo: enumsPD.permisions.cumplimentar,
        condiciones: [
          {
            condicion: ['estadoTribunales', req.session.departamentoID],
            resultado: estados.estadoTribunal.aprobadoResponsable
          },
          {
            condicion: ['estadoProGDoc'],
            resultado: estados.estadoProgDoc.abierto
          }
        ]
      });
    }
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
  asignacionYTribunalController.guardarTribunales,
  asignacionYTribunalController.reenviar
);

// POST estado tribunales programacion docente
router.post(
  '/estado',
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.ResponsableDocente,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.abierto
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.DirectorDepartamento,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoTribunales', req.session.departamentoID],
          resultado: estados.estadoTribunal.aprobadoResponsable
        },
        {
          condicion: ['estadoProGDoc'],
          resultado: estados.estadoProgDoc.abierto
        }
      ]
    });
    if (
      req.session.departamentoID === 'TFG' ||
      req.session.departamentoID === 'TFM'
    ) {
      res.locals.rols.push({
        rol: enumsPD.rols.CoordinadorTitulacion,
        PlanEstudioCodigo: req.session.planID,
        DepartamentoCodigo: null,
        tipo: enumsPD.permisions.cumplimentar,
        condiciones: [
          {
            condicion: ['estadoTribunales', req.session.departamentoID],
            resultado: estados.estadoTribunal.abierto
          },
          {
            condicion: ['estadoProGDoc'],
            resultado: estados.estadoProgDoc.abierto
          }
        ]
      });
      res.locals.rols.push({
        rol: enumsPD.rols.CoordinadorTitulacion,
        PlanEstudioCodigo: req.session.planID,
        DepartamentoCodigo: null,
        tipo: enumsPD.permisions.cumplimentar,
        condiciones: [
          {
            condicion: ['estadoTribunales', req.session.departamentoID],
            resultado: estados.estadoTribunal.aprobadoResponsable
          },
          {
            condicion: ['estadoProGDoc'],
            resultado: estados.estadoProgDoc.abierto
          }
        ]
      });
    }
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
  asignacionYTribunalController.guardarTribunales,
  asignacionYTribunalController.aprobarTribunales
);

module.exports = router;
