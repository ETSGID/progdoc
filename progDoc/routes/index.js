let express = require('express');
let app = require('../app')
let router = express.Router();
let Sequelize = require('sequelize');
let models = require('../models');

let asignacionYTribunalController = require('../controllers/asignacionYTribunal_controller');
let abrirProgDocController = require('../controllers/abrirProgDoc_controller');
let abrirProgDoc2Controller = require('../controllers/abrirProgDoc2_controller')
let progDocController = require('../controllers/progDoc_controller')
let planController = require('../controllers/plan_controller')
let asignaturaController = require('../controllers/asignatura_controller')
let horarioController = require('../controllers/horario_controller')
let grupoController = require('../controllers/grupo_controller')
let rolController = require('../controllers/rol_controller')
let estadoController = require("../controllers/estado_controller")
let pdfController = require('../controllers/pdf_controller')
let acronimoController = require('../controllers/acronimo_controller')
let examenController = require('../controllers/examen_controller')
let calendarioController = require('../controllers/calendario_controller')
let gestionPlanController = require('../controllers/gestionPlan_controller')
let aulaController = require('../controllers/aula_controller')
let actividadParcialController = require('../controllers/actividadParcial_controller')
let personaYProfesorController = require('../controllers/personaYProfesor_controller')
let historialController = require('../controllers/historial_controller')

let estados = require('../estados');
let enumsPD = require('../enumsPD');




router.all('*', function (req, res, next) {
  //actualizo la sesion el planID y el departamento seleccionado
  let planID = req.query.planID;
  if (!planID) {
    planID = req.session.planID
  }
  if (!planID) {
    planID = "09TT"
  }
  let departamentoID = req.query.departamentoID;
  if (!departamentoID) {
    departamentoID = req.session.departamentoID
  }
  req.session.planID = planID
  req.session.departamentoID = departamentoID
  //roles que pueden hacer todo son admin y subdirector de posgrado
  res.locals.rols = [];
  if (process.env.DEV === 'true') {
    res.locals.rols.push({ rol: enumsPD.rols.Admin, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  }
  res.locals.rols.push({ rol: enumsPD.rols.SubdirectorPosgrado, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
})



router.all('*', rolController.comprobarRolYPersona);

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get('/', function (req, res) {
  res.render('index');
});

//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Cumplimentar', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocCumplimentar")
  next()
}, planController.getPlanes, progDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/Consultar', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocConsultar")
  next()
}, planController.getPlanes, progDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/Historial', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocHistorial")
  next()
}, planController.getPlanes, historialController.getHistorial);
//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Gestion', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocGestion")
  next()
}, function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDoc2Controller.gestionProgDoc);

router.get('/consultar/estado', planController.getPlanes, progDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/estado', planController.getPlanes, progDocController.getProgramacionDocente, estadoController.getEstado);

router.get("/respDoc/tribunales", progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.getTribunales);

router.get("/consultar/tribunales", planController.getPlanes, progDocController.getProgramacionDocente, asignacionYTribunalController.getTribunales);
router.get("/consultar/PDF", planController.getPlanes, progDocController.getProgramacionDocente, calendarioController.anoDeTrabajoPDF, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendarioPDF, pdfController.generarPDF);
router.get("/cumplimentar/PDF", planController.getPlanes, progDocController.getProgramacionDocente, calendarioController.anoDeTrabajoPDF, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendarioPDF, pdfController.generarPDF);
router.get("/respDoc/editAsignacion", progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProfesores', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.editAsignacion);
router.get("/respDoc/editAsignacion/cambioModo", progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, asignacionYTribunalController.changeModeAsignacion);

router.post("/respDoc/aprobarAsignacion", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.aprobarAsignacion);

router.post("/respDoc/guardarAsignacion", progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.guardarAsignacion);

router.post("/respDoc/aprobarTribunales", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.guardarTribunales, asignacionYTribunalController.aprobarTribunales);

router.post("/respDoc/guardarTribunales", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.guardarTribunales, asignacionYTribunalController.reenviar);

router.get("/respDoc/profesores", progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  if (req.session.departamentoID === "TFG" || req.session.departamentoID === "TFM") {
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
    res.locals.rols.push({
      rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
        [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
    });
  }
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  })
  next();
}, planController.getPlanes, rolController.comprobarRols, asignacionYTribunalController.getAsignaciones);

router.get("/consultar/profesores", planController.getPlanes, progDocController.getProgramacionDocente, asignacionYTribunalController.getAsignaciones);

router.get('/coordinador/horarios', progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, horarioController.getHorario);


router.get('/coordinador/examenes', progDocController.getProgramacionDocente, function (req, res, next) {

  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, examenController.getFranjas, examenController.getExamenes, examenController.getExamenesView);
router.get('/consultar/examenes', planController.getPlanes, progDocController.getProgramacionDocente, examenController.getFranjas, examenController.getExamenes, examenController.getExamenesView);

router.get('/coordinador/franjasexamenes', progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });

  next();
}, planController.getPlanes, rolController.comprobarRols, examenController.getFranjas, examenController.getFranjasView);


router.get('/consultar/horarios', planController.getPlanes, progDocController.getProgramacionDocente, horarioController.getHorario);
router.post('/coordinador/guardarHorarios', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, horarioController.guardarHorarios, horarioController.reenviar);
router.post('/coordinador/crearHorariosNota', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, horarioController.guardarNota);

router.post('/coordinador/actualizarHorariosNota', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, horarioController.updateNota);
router.post('/coordinador/eliminarHorariosNota', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, horarioController.eliminarNota);

router.post('/coordinador/guardarExamenes', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.listo }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, examenController.guardarExamenes, examenController.getExamenes, examenController.generateCsvExamens, examenController.reenviarExamenes);

router.post('/coordinador/guardarFranjasExamenes', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.listo }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, examenController.guardarFranjasExamenes);

router.post('/coordiandor/aprobarHorarios', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, horarioController.guardarHorarios, horarioController.aprobarHorarios);

router.post('/coordiandor/aprobarExamenes', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, examenController.guardarExamenes, examenController.aprobarExamenes, examenController.getExamenes, examenController.generateCsvExamens, examenController.reenviarExamenes);

router.get('/consultar/grupos', planController.getPlanes, progDocController.getProgramacionDocente, grupoController.getGrupos);

router.get('/gestionGrupos/getGrupos', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();

}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, grupoController.getGrupos)


router.post('/gestionGrupos/guardarGruposJE', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, grupoController.EliminarGruposJE, grupoController.ActualizarGruposJE, grupoController.AnadirGruposJE)

router.post('/anadirProfesor', personaYProfesorController.anadirProfesor)

router.get("/AbrirCerrar", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDoc2Controller.gestionProgDoc);

router.post("/abrirProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDocController.abrirNuevaProgDoc, abrirProgDoc2Controller.abrirProgDoc);

router.post("/cerrarProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDoc2Controller.cerrarProgDoc, calendarioController.anoDeTrabajoPDF, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendarioPDF, pdfController.generarPDF, abrirProgDoc2Controller.cerrarProgDoc2);

router.post("/abrirIncidenciaProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDocController.abrirCopiaProgDoc, abrirProgDoc2Controller.abrirIncidenciaProgDoc);

router.post("/reabrirProgDoc", function (req, res, next) {
  //es el unico caso en el que debo hacer esto aqui pq no está guardada en sesión y lo necesito para los permisos
  req.session.pdID = req.body.pdIdentificador.split("-")[1];
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'reabierto', resultado: 0 }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDocController.abrirCopiaProgDoc, abrirProgDoc2Controller.reabrirProgDoc);

router.post("/cerrarIncidenciaProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, abrirProgDoc2Controller.cerrarIncidenciaProgDoc, calendarioController.anoDeTrabajoPDF, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendarioPDF, pdfController.generarPDF, examenController.getExamenes, examenController.generateCsvExamens, abrirProgDoc2Controller.cerrarProgDoc2);

//consultarRoles
router.get("/consultar/roles", planController.getPlanes, progDocController.getProgramacionDocente, rolController.getRoles)
//gestionRoles
router.get("/gestionRoles", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, rolController.getRoles);
//ruta para guardar

router.post("/gestionRoles/guardarRoles", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, rolController.guardarRoles, rolController.redir);
//atento añadir la ruta del controlador para guardar 

router.get("/gestion/acronimos", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, acronimoController.getAcronimos);

router.post('/gestionAcronimos/guardarAcronimosJE', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, acronimoController.actualizarAcronimos)

//gestion de plan
router.get("/gestion/planes", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, gestionPlanController.getGestionPlanes);

router.post("/gestion/actualizarPlanApi", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.listo }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, gestionPlanController.updateAsignaturasApiUpm, gestionPlanController.getGestionPlanes);
router.post("/gestion/cambiarEstadoProgDoc", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.listo }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, gestionPlanController.updateEstadoProgDoc);


router.get('/gestion/calendario', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, calendarioController.anoDeTrabajo, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendario)

router.post('/gestion/calendario/eventoGeneral', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, calendarioController.postEventoGeneral)

router.delete('/gestion/calendario/eventoGeneral', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, calendarioController.deleteEventoGeneral);

router.post('/gestion/calendario/aprobarGeneral', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, calendarioController.aprobarGeneral);

router.post('/gestion/calendario/copiarEventos', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, calendarioController.copiarEventos);

router.get('/cumplimentar/calendario', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      []
  });

  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, calendarioController.anoDeTrabajo, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendarioPlan)

router.delete('/cumplimentar/calendario/eventoGeneral', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      []
  });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, calendarioController.deleteEventoPlan);

router.post('/cumplimentar/calendario/eventoGeneral', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      []
  });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, calendarioController.postEventoPlan);

router.get('/consultar/calendario', planController.getPlanes, progDocController.getProgramacionDocente, calendarioController.anoDeTrabajo, calendarioController.eventosPlanDiccionario, calendarioController.eventosDiccionario, calendarioController.getCalendarioPlanConsultar);

router.post('/cumplimentar/calendario/eventoEditablePlan', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, progDocController.getProgramacionDocente, rolController.comprobarRols, calendarioController.editablePlan);

//-----Aulas-----//
router.get('/gestion/aulas', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, aulaController.getAulas)
router.get('/gestion/aulas', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, aulaController.getAulas)

router.post('/gestion/aulas/generarPdf', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, planController.getPlanes, rolController.comprobarRols, aulaController.getAulas)


//-----Actividades parciales-----//
router.get('/consultar/actividades', planController.getPlanes, progDocController.getProgramacionDocente, actividadParcialController.getActividadParcial);
router.get('/cumplimentar/actividades', planController.getPlanes, progDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
},
  rolController.comprobarRols, actividadParcialController.getActividadParcial);
router.post('/coordiandor/aprobarActividades', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.aprobarActividades);

router.post('/coordinador/crearActividad', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.guardarActividad);

router.post('/coordinador/actualizarActividad', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.updateActividad);
router.post('/coordinador/eliminarActividad', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.eliminarActividad);

router.post('/coordiandor/crearConjuntoActividadParcial', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.crearConjuntoActividadParcial);

router.post('/coordiandor/actualizarConjuntoActividadParcial', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.actualizarConjuntoActividadParcial);

router.post('/coordiandor/eliminarConjuntoActividadParcial', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoCalendario', resultado: estados.estadoCalendario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, planController.getPlanes, rolController.comprobarRols, actividadParcialController.eliminarConjuntoActividadParcial);

module.exports = router;