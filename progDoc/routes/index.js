let express = require('express');
let app = require('../app')
let router = express.Router();
let Sequelize = require('sequelize');
let models = require('../models');
let respController = require('../controllers/respDep_controller');
let permisosControllerProgDoc = require('../controllers/permisos_controllerProgDoc');
let jefeController = require('../controllers/abrirprogdoc_controller');
let gestionController = require('../controllers/JE_controller')
let menuProgDocController = require('../controllers/menuProgDoc_controller')
let coordinadorController = require('../controllers/coordinador_controller')
let gruposController = require('../controllers/grupos_controller')
let gestionRoles = require('../controllers/gestion_controller')
let estadoController = require("../controllers/estado_controller")
let infopdfprogdocController = require('../controllers/infopdfprogdoc_controller')
let historialController = require('../controllers/historial_controller')
let acronimosController = require('../controllers/acronimos_controller')
let estados = require('../estados');
let enumsPD = require('../enumsPD');



router.all('*', function(req,res,next){
  //roles que pueden hacer todo son admin y subdirector de posgrado
  res.locals.rols = [];
  if (process.env.DEV === 'true') {
    res.locals.rols.push({ rol: enumsPD.rols.Admin, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  }
  res.locals.rols.push({ rol: enumsPD.rols.SubdirectorPosgrado, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
})



router.all('*', permisosControllerProgDoc.comprobarRolYPersona);

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get('/', function (req, res) {
  res.render('index',
    {
      contextPath: app.contextPath
    });
});

//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Cumplimentar', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocCumplimentar")
  next()
}, menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/Consultar', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocConsultar")
   next()
}, menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/Historial', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocHistorial")
  next()
}, menuProgDocController.getPlanes, historialController.getPDsWithPdf, menuProgDocController.getHistorial);
//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Gestion',   function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocGestion")
  next()
}, function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
  }, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, gestionController.gestionProgDoc);

router.get('/consultar/estado', menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/estado', menuProgDocController.getPlanes,menuProgDocController.getProgramacionDocente, estadoController.getEstado);

router.get("/respDoc/tribunales", menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
    [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({ rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
    [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
   });
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
    [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }] 
  });
  next();
}, menuProgDocController.getPlanes,permisosControllerProgDoc.comprobarRols, respController.getTribunales);

router.get("/consultar/tribunales", menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, respController.getTribunales);
router.get("/consultar/PDF", menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, infopdfprogdocController.generarPDF);
 
router.get("/respDoc/editAsignacion", menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, menuProgDocController.getGrupos, respController.editAsignacion);

router.post("/respDoc/aprobarAsignacion", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols,respController.aprobarAsignacion);

router.post("/respDoc/guardarAsignacion", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, menuProgDocController.anadirProfesor,respController.guardarAsignacion);

router.post("/respDoc/aprobarTribunales", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols,menuProgDocController.anadirProfesor,respController.guardarTribunales, respController.aprobarTribunales);

router.post("/respDoc/guardarTribunales", function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols,menuProgDocController.anadirProfesor,respController.guardarTribunales, respController.reenviar);

router.get("/respDoc/profesores", menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.ResponsableDocente, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.DirectorDepartamento, PlanEstudioCodigo: null, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  })
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, menuProgDocController.getGrupos, respController.getAsignaciones);

router.get("/consultar/profesores", menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, menuProgDocController.getGrupos, respController.getAsignaciones);

router.get('/coordinador/horarios', menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, menuProgDocController.getGrupos, coordinadorController.getHorario);


router.get('/coordinador/examenes', menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, coordinadorController.getExamenes);
router.get('/consultar/examenes', menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, coordinadorController.getExamenes);

router.get('/consultar/horarios', menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, menuProgDocController.getGrupos, coordinadorController.getHorario);
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
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarHorarios, coordinadorController.reenviar);

router.post('/coordinador/guardarExamenes', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarExamenes, coordinadorController.reenviarExamenes);

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
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarHorarios, coordinadorController.aprobarHorarios);

router.post('/coordiandor/aprobarExamenes', function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.CoordinadorTitulacion, PlanEstudioCodigo: req.session.planID, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarExamenes, coordinadorController.aprobarExamenes);

router.get('/consultar/grupos', menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, gruposController.getGrupos);

router.get('/gestionGrupos/getGrupos',function (req, res, next) {
  res.locals.rols.push({
    rol: enumsPD.rols.SecretarioTitulacion, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();

}, menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente,permisosControllerProgDoc.comprobarRols, gruposController.getGrupos)


router.post('/gestionGrupos/guardarGruposJE',function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({
    rol: enumsPD.rols.SecretarioTitulacion, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, gruposController.EliminarGruposJE, gruposController.ActualizarGruposJE, gruposController.AnadirGruposJE )

router.get("/AbrirCerrar", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, gestionController.gestionProgDoc);

router.post("/abrirProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, jefeController.abrirNuevaProgDoc, gestionController.abrirProgDoc);

router.post("/cerrarProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, gestionController.cerrarProgDoc, infopdfprogdocController.generarPDF, gestionController.cerrarProgDoc2);

router.post("/abrirIncidenciaProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, jefeController.abrirCopiaProgDoc, gestionController.abrirIncidenciaProgDoc);

router.post("/reabrirProgDoc", function (req, res, next) {
  //es el unico caso en el que debo hacer esto aqui pq no está guardada en sesión y lo necesito para los permisos
  req.session.pdID = req.body.pdIdentificador.split("-")[1];
  res.locals.rols.push({
    rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null,  condiciones:
      [{ condicion: 'reabierto', resultado: 0 }]});
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, jefeController.abrirCopiaProgDoc, gestionController.reabrirProgDoc);

router.post("/cerrarIncidenciaProgDoc", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, gestionController.cerrarIncidenciaProgDoc, infopdfprogdocController.generarPDF, gestionController.cerrarProgDoc2);


//gestionRoles
router.get("/gestionRoles", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols,  menuProgDocController.anadirUnaPersona, gestionRoles.getRoles,menuProgDocController.getProgramacionDocente, gruposController.getGrupos);
//ruta para guardar

router.post("/gestionRoles/guardarRoles", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, gestionRoles.guardarRoles, gestionRoles.redir);
      //atento añadir la ruta del controlador para guardar 

router.get("/gestion/acronimos", function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, menuProgDocController.getPlanes, menuProgDocController.getProgramacionDocente, permisosControllerProgDoc.comprobarRols, menuProgDocController.getAsignaturasProgDoc, menuProgDocController.getAllDepartamentos, acronimosController.getAcronimos);

router.post('/gestionAcronimos/guardarAcronimosJE', function (req, res, next) {
  res.locals.rols.push({ rol: enumsPD.rols.JefeEstudios, PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  next();
}, menuProgDocController.getPlanes, permisosControllerProgDoc.comprobarRols, acronimosController.actualizarAcronimos)

module.exports = router;


