const express = require('express');

const router = express.Router();

const asignacionYTribunalController = require('../../controllers/asignacionYTribunal_controller');
const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');

const estados = require('../../estados');
const enumsPD = require('../../enumsPD');

// GET profesores programacion docente
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
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.abierto
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
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.aprobadoResponsable
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.aprobadoResponsable
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
  asignacionYTribunalController.getAsignaciones
);

// GET profesores asignatura programacion docente
router.get(
  '/asignatura',
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.ResponsableDocente,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.abierto
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
  asignacionYTribunalController.editAsignacion
);

// POST profesores programacion docente
router.post(
  '/asignatura',
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.ResponsableDocente,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.aprobadoResponsable
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
  asignacionYTribunalController.guardarAsignacion
);

// POST estado profesores programacion docente
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
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.abierto
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
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.aprobadoResponsable
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.aprobadoResponsable
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
  asignacionYTribunalController.aprobarAsignacion
);

// POST modo asignatura profesores programacion docente
router.post(
  '/asignatura/modo',
  progDocController.getProgramacionDocente,
  (req, res, next) => {
    res.locals.rols.push({
      rol: enumsPD.rols.ResponsableDocente,
      PlanEstudioCodigo: req.session.planID,
      DepartamentoCodigo: req.session.departamentoID,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['estadoProfesores', req.session.departamentoID],
          resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.abierto
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
            condicion: ['estadoProfesores', req.session.departamentoID],
            resultado: estados.estadoProfesor.aprobadoResponsable
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
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  asignacionYTribunalController.changeModeAsignacion
);

module.exports = router;
