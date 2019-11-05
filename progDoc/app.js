let express = require('express');
const normalize = require('normalize-path');
let path = require('path');
let cookieParser = require('cookie-parser');
let partials = require('express-partials');
let morgan = require('morgan');


//context path para la aplicacion en el servidor
let session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
const contextPath = normalize(process.env.CONTEXT);
exports.contextPath = contextPath;
const local = process.env.DEV;
exports.local = local;
const pathPDF = normalize(process.env.PATH_PDF);
exports.pathPDF = pathPDF;


//cas autentication
let CASAuthentication = require('cas-authentication');
// Create a new instance of CASAuthentication.
let service = process.env.SERVICE;
let cas_url = process.env.CAS;

let cas = new CASAuthentication({
  cas_url: cas_url,
  //local o despliegue
  service_url: service,
  cas_version: '3.0',
  session_info: 'user',
  destroy_session: true//me borra la sesión al hacer el logout
});



//instanciacion 
let app = express();
//rutas requeridas
let router = require('./routes/index')
let routerApi = require('./routes/api')
let models = require('./models');
let funciones = require('./funciones')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//solo te imprime las peticiones incorrectas
app.use(morgan('combined', {
  skip: function (req, res) { return res.statusCode < 400 }
}))
app.use(partials());


//app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(path.join(contextPath, 'pdfs'), express.static(path.join(pathPDF, 'pdfs')));
app.use(path.join(contextPath, 'archivos'), express.static(path.join(__dirname, 'public')));
app.use(contextPath, express.static(path.join(__dirname, 'public')));





// Configuracion de la session para almacenarla en BBDD usando Sequelize.
let sessionStore = new SequelizeStore({
  db: models.sequelizeSession,
  table: 'Session',
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds. (15 minutes)
  expiration: 1 * 60 * 60 * 1000  // The maximum age (in milliseconds) of a valid session. (6 hours)
});
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: true
}));


// autologout

// Rutas que no empiezan por /api/
app.use(path.join(contextPath, 'api'), routerApi);
//exit del cas el primero para que no entre en bucle. El cas es el encargado de eliminar la sesión
app.get(path.join(contextPath, 'logout'), cas.logout);




// Helper dinamico:
app.use(cas.bounce, async function (req, res, next) {
  // Hacer visible req.session en las vistas
  res.locals.session = req.session;
  res.locals.contextPath = contextPath;
  res.locals.pruebas = process.env.PRUEBAS === 'true' ? "pruebas" : "portal";
  //solo la primera vez
  if (!req.session.user.noFirst) {
    try {
      let pers = await models.Persona.findOne({
        attributes: ["identificador"],
        where: {
          email: req.session.user.mail
        }
      })
      if (pers) {
        req.session.user.PersonaId = pers.identificador;
      } else {
        req.session.user.PersonaId = null;
      }
      req.session.user.noFirst = true;
      //para que no haya problemas de que cosas no se han iniciado en la sesión
      req.session.save(function () {
        res.redirect(contextPath);
      })
    }
    catch (error) {
      console.log("Error:", error);
      next(error);
    }
  }
  else if (!req.session.user.rols) {
    //probar roles de otras personas
    // req.session.user.mail = "correo@upm.es"
    try {
      req.session.user.rols = await models.Rol.findAll({
        attributes: ["rol", "PlanEstudioCodigo", "DepartamentoCodigo"],
        where: {
          PersonaId: req.session.user.PersonaId
        },
        raw: true
      })
      next();
    }
    catch (error) {
      console.log("Error:", error);
      next(error);
    }
  } else {
    next();
  }
});


//router para contexto
app.use(contextPath, router);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.DEV === 'true' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    contextPath: contextPath,
    layout: false
  });
});

module.exports = app;