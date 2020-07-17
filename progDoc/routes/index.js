/* global DEV, PRUEBAS */
const express = require('express');

const router = express.Router();

const asignacionYTribunalController = require('../controllers/asignacionYTribunal_controller');
const abrirProgDocController = require('../controllers/abrirProgDoc_controller');
const abrirProgDoc2Controller = require('../controllers/abrirProgDoc2_controller');
const progDocController = require('../controllers/progDoc_controller');
const planController = require('../controllers/plan_controller');
const horarioController = require('../controllers/horario_controller');
const grupoController = require('../controllers/grupo_controller');
const rolController = require('../controllers/rol_controller');
const estadoController = require('../controllers/estado_controller');
const pdfController = require('../controllers/pdf_controller');
const acronimoController = require('../controllers/acronimo_controller');
const examenController = require('../controllers/examen_controller');
const calendarioController = require('../controllers/calendario_controller');
const gestionPlanController = require('../controllers/gestionPlan_controller');
const aulaController = require('../controllers/aula_controller');
const actividadParcialController = require('../controllers/actividadParcial_controller');
const personaYProfesorController = require('../controllers/personaYProfesor_controller');
const historialController = require('../controllers/historial_controller');
const jqueryFileTreeController = require('../controllers/jqueryFileTree_controller');

const estados = require('../estados');
const enumsPD = require('../enumsPD');

router.all('*', (req, res, next) => {
  // actualizo la sesion el planID y el departamento seleccionado
  let { planID } = req.query;
  if (!planID) {
    planID = req.session.planID;
  }
  if (!planID) {
    planID = '09TT';
  }
  let { departamentoID } = req.query;
  if (!departamentoID) {
    departamentoID = req.session.departamentoID;
  }
  req.session.planID = planID;
  req.session.departamentoID = departamentoID;
  // roles que pueden hacer todo son admin y subdirector de posgrado
  res.locals.rols = [];
  if (DEV === 'true' || PRUEBAS === 'true') {
    res.locals.rols.push({
      rol: enumsPD.rols.Admin,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: []
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.SubdirectorPosgrado,
    PlanEstudioCodigo: null,
    DepartamentoCodigo: null,
    tipo: enumsPD.permisions.cumplimentar,
    condiciones: []
  });
  next();
});

router.all('*', rolController.comprobarRolYPersona);

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get('/', rolController.getRolsPersonaView);

// ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get(
  '/Cumplimentar',
  (req, res, next) => {
    req.session.menu = [];
    req.session.menu.push('drop_ProgDoc');
    req.session.menu.push('element_ProgDocCumplimentar');
    req.session.menuBar = enumsPD.menuBar.cumplimentar;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);
router.get(
  '/Consultar',
  (req, res, next) => {
    req.session.menu = [];
    req.session.menu.push('drop_ProgDoc');
    req.session.menu.push('element_ProgDocConsultar');
    req.session.menuBar = enumsPD.menuBar.consultar;
    next();
  },
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);
router.get(
  '/Historial',
  (req, res, next) => {
    req.session.menu = [];
    req.session.menu.push('drop_ProgDoc');
    req.session.menu.push('element_ProgDocHistorial');
    req.session.menuBar = enumsPD.menuBar.historial;
    next();
  },
  planController.getPlanes,
  historialController.getHistorial
);
// ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get(
  '/Gestion',
  (req, res, next) => {
    req.session.menu = [];
    req.session.menu.push('drop_ProgDoc');
    req.session.menu.push('element_ProgDocGestion');
    req.session.menuBar = enumsPD.menuBar.gestion;
    next();
  },
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
  abrirProgDoc2Controller.gestionProgDoc
);

router.get(
  '/consultar/estado',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);
router.get(
  '/estado',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);

router.get(
  '/respDoc/tribunales',
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

router.get(
  '/consultar/tribunales',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  asignacionYTribunalController.getTribunales
);
router.get(
  '/consultar/PDF',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF
);
router.get(
  '/cumplimentar/PDF',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF
);
router.get(
  '/respDoc/editAsignacion',
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
            resultado: estados.estadoTribunal.abierto
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
router.get(
  '/respDoc/editAsignacion/cambioModo',
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
            condicion: ['estadoProfesores', req.session.departamentoID],
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
  progDocController.getProgramacionDocente,
  rolController.comprobarRols,
  asignacionYTribunalController.changeModeAsignacion
);

router.post(
  '/respDoc/aprobarAsignacion',
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
            condicion: ['estadoProfesores', req.session.departamentoID],
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
  asignacionYTribunalController.aprobarAsignacion
);

router.post(
  '/respDoc/guardarAsignacion',
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
            condicion: ['estadoProfesores', req.session.departamentoID],
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
  asignacionYTribunalController.guardarAsignacion
);

router.post(
  '/respDoc/aprobarTribunales',
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

router.post(
  '/respDoc/guardarTribunales',
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

router.get(
  '/respDoc/profesores',
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
            condicion: ['estadoProfesores', req.session.departamentoID],
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
  asignacionYTribunalController.getAsignaciones
);

router.get(
  '/consultar/profesores',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  asignacionYTribunalController.getAsignaciones
);

router.get(
  '/coordinador/horarios',
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

router.get(
  '/coordinador/examenes',
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
router.get(
  '/consultar/examenes',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  examenController.getFranjas,
  examenController.getExamenes,
  examenController.getExamenesView
);

router.get(
  '/coordinador/franjasexamenes',
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

router.get(
  '/consultar/horarios',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  horarioController.getHorario
);
router.post(
  '/coordinador/guardarHorarios',
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
router.post(
  '/coordinador/crearHorariosNota',
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

router.post(
  '/coordinador/actualizarHorariosNota',
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
router.post(
  '/coordinador/eliminarHorariosNota',
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

router.post(
  '/coordinador/guardarExamenes',
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

router.post(
  '/coordinador/guardarFranjasExamenes',
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

router.post(
  '/coordiandor/aprobarHorarios',
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

router.post(
  '/coordiandor/aprobarExamenes',
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

router.get(
  '/consultar/grupos',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  grupoController.getGrupos
);

router.get(
  '/gestionGrupos/getGrupos',
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

router.post(
  '/gestionGrupos/guardarGruposJE',
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

router.get(
  '/Personal',
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

router.post('/anadirProfesor', personaYProfesorController.anadirProfesor);

router.post(
  '/personaAndProfesor',
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

router.put(
  '/personaAndProfesor/:id',
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

router.delete(
  '/personaAndProfesor/:id',
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

router.get(
  '/AbrirCerrar',
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
  abrirProgDoc2Controller.gestionProgDoc
);

router.post(
  '/abrirProgDoc',
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
  abrirProgDocController.abrirNuevaProgDoc,
  abrirProgDoc2Controller.abrirProgDoc
);

router.post(
  '/cerrarProgDoc',
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
  abrirProgDoc2Controller.cerrarProgDoc,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF,
  abrirProgDoc2Controller.cerrarProgDoc2
);

router.post(
  '/abrirIncidenciaProgDoc',
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
  abrirProgDocController.abrirCopiaProgDoc,
  abrirProgDoc2Controller.abrirIncidenciaProgDoc
);

router.post(
  '/reabrirProgDoc',
  (req, res, next) => {
    // es el unico caso en el que debo hacer esto aqui pq no está guardada en sesión
    // y lo necesito para los permisos
    // eslint-disable-next-line prefer-destructuring
    req.session.pdID = req.body.pdIdentificador.split('-')[1];
    res.locals.rols.push({
      rol: enumsPD.rols.JefeEstudios,
      PlanEstudioCodigo: null,
      DepartamentoCodigo: null,
      tipo: enumsPD.permisions.cumplimentar,
      condiciones: [
        {
          condicion: ['reabierto'],
          resultado: 0
        }
      ]
    });
    next();
  },
  planController.getPlanes,
  rolController.comprobarRols,
  abrirProgDocController.abrirCopiaProgDoc,
  abrirProgDoc2Controller.reabrirProgDoc
);

router.post(
  '/cerrarIncidenciaProgDoc',
  (req, res, next) => {
    req.definitivo = true;
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
  abrirProgDoc2Controller.cerrarIncidenciaProgDoc,
  calendarioController.anoDeTrabajoPDF,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPDF,
  pdfController.generarPDF,
  examenController.getExamenes,
  examenController.generateCsvExamens,
  asignacionYTribunalController.generateCsvCoordinadoresRouter,
  abrirProgDoc2Controller.cerrarProgDoc2
);

// consultarRoles
router.get(
  '/consultar/roles',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  rolController.getRoles
);
// gestionRoles
router.get(
  '/gestionRoles',
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
  rolController.getRoles
);
// ruta para guardar

router.post(
  '/gestionRoles/guardarRoles',
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
  rolController.guardarRoles,
  rolController.redir
);
// atento añadir la ruta del controlador para guardar

router.get(
  '/gestion/acronimos',
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
  acronimoController.getAcronimos
);

router.post(
  '/gestionAcronimos/guardarAcronimosJE',
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
  acronimoController.actualizarAcronimos
);

// gestion de plan
router.get(
  '/gestion/planes',
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

router.post(
  '/gestion/actualizarPlanApi',
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
router.post(
  '/gestion/cambiarEstadoProgDoc',
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

router.get(
  '/gestion/calendario',
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

router.post(
  '/gestion/calendario/eventoGeneral',
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

router.delete(
  '/gestion/calendario/eventoGeneral',
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

router.post(
  '/gestion/calendario/trasladarGeneral',
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

router.post(
  '/gestion/calendario/copiarEventos',
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

router.get(
  '/cumplimentar/calendario',
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

router.delete(
  '/cumplimentar/calendario/eventoGeneral',
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

router.post(
  '/cumplimentar/calendario/eventoGeneral',
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

router.get(
  '/consultar/calendario',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  calendarioController.anoDeTrabajo,
  calendarioController.eventosPlanDiccionario,
  calendarioController.eventosDiccionario,
  calendarioController.getCalendarioPlanConsultar
);

router.post(
  '/cumplimentar/calendario/eventoEditablePlan',
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

// -----Aulas-----//

router.get(
  '/consultar/aulas',
  planController.getPlanes,
  aulaController.getAulas
);

router.get(
  '/gestion/aulas',
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
  aulaController.getAulas
);
router.get(
  '/gestion/aulas',
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
  aulaController.getAulas
);

router.post(
  '/gestion/aulas/generarPdf',
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
  aulaController.getAulas
);

// -----Actividades parciales-----//
router.get(
  '/consultar/actividades',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  actividadParcialController.getActividadParcial
);
router.get(
  '/cumplimentar/actividades',
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
router.post(
  '/coordiandor/aprobarActividades',
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

router.post(
  '/coordinador/crearActividad',
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

router.post(
  '/coordinador/actualizarActividad',
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
router.post(
  '/coordinador/eliminarActividad',
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

router.post(
  '/coordiandor/crearConjuntoActividadParcial',
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

router.post(
  '/coordiandor/actualizarConjuntoActividadParcial',
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

router.post(
  '/coordiandor/eliminarConjuntoActividadParcial',
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

router.post(
  '/pdfs',
  planController.getPlanes,
  jqueryFileTreeController.getDirList
);

module.exports = router;
