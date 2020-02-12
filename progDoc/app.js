const express = require('express');
const normalize = require('normalize-path');
const path = require('path');
const cookieParser = require('cookie-parser');
const partials = require('express-partials');
const morgan = require('morgan');


// context path para la aplicacion en el servidor
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const contextPath = normalize(process.env.CONTEXT);
exports.contextPath = contextPath;
const local = process.env.DEV;
exports.local = local;
const pathPDF = normalize(process.env.PATH_PDF);
exports.pathPDF = pathPDF;


// cas autentication
const CASAuthentication = require('cas-authentication');
// Create a new instance of CASAuthentication.
const service = process.env.SERVICE;
const casUrl = process.env.CAS;

const cas = new CASAuthentication({
  cas_url: casUrl,
  // local o despliegue
  service_url: service,
  cas_version: '3.0',
  session_info: 'user',
  destroy_session: true, // me borra la sesión al hacer el logout
});


// instanciacion
const app = express();
// rutas requeridas
const router = require('./routes/index');
const routerApi = require('./routes/api');
// database
const models = require('./models');
// cron activities
require('./controllers/cron_controller');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// solo te imprime las peticiones incorrectas
app.use(morgan('combined', {
  skip(req, res) { return res.statusCode < 400; },
}));
app.use(partials());


// app.use(morgan('dev'));
// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(path.join(contextPath, 'pdfs'), express.static(path.join(pathPDF, 'pdfs')));
app.use(path.join(contextPath, 'archivos'), express.static(path.join(__dirname, 'public')));
app.use(contextPath, express.static(path.join(__dirname, 'public')));


// Configuracion de la session para almacenarla en BBDD usando Sequelize.
const sessionStore = new SequelizeStore({
  db: models.sequelizeSession,
  table: 'Session',
  // The interval at which to cleanup expired sessions in milliseconds. (15 minutes)
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 1 * 60 * 60 * 1000, // The maximum age (in milliseconds) of a valid session. (6 hours)
});
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: true,
}));


// autologout

// Rutas que no empiezan por /api/
app.use(path.join(contextPath, 'api'), routerApi);
// exit del cas el primero para que no entre en bucle. El cas es el encargado de eliminar la sesión
app.get(path.join(contextPath, 'logout'), cas.logout);


if (process.env.DEV === 'true') {
  /**
   * modelo dev. No pasa por el cas
   * Está preparado para usar el servidor de desarrollo de react
  */
  app.use((req, res, next) => {
    if (!req.session.user) req.session.user = {};
    req.session.user.employeetype = ['F', 'A'];
    req.session.user.mail = 'ejemplo@upm.es';
    req.session.user.uid = 'ejemplo';
    req.session.user.cn = 'FERNANDO FERNANDEZ FERNANDEZ';
    req.session.user.givenname = 'FERNANDO';
    res.locals.session = req.session;
    next();
  });
} else {
  app.use(cas.bounce, (req, res, next) => {
    next();
  });
}

app.use(async (req, res, next) => {
  // Hacer visible req.session en las vistas
  res.locals.session = req.session;
  res.locals.contextPath = contextPath;
  res.locals.pruebas = process.env.PRUEBAS === 'true' ? 'pruebas' : 'portal';
  // estado y existe se usan para temas de permisos al renderizar las vistas.
  // Antes de comprobar nada se ponen a null
  res.locals.estado = null;
  res.locals.existe = null;
  // solo la primera vez
  if (!req.session.user.noFirst) {
    try {
      const pers = await models.Persona.findOne({
        attributes: ['identificador'],
        where: {
          email: req.session.user.mail,
        },
      });
      if (pers) {
        req.session.user.PersonaId = pers.identificador;
      } else {
        req.session.user.PersonaId = null;
      }
      req.session.user.noFirst = true;
      // para que no haya problemas de que cosas no se han iniciado en la sesión
      req.session.save(() => {
        res.redirect(contextPath);
      });
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  } else if (!req.session.user.rols) {
    // probar roles de otras personas
    // req.session.user.mail = "correo@upm.es"
    try {
      req.session.user.rols = await models.Rol.findAll({
        attributes: ['rol', 'PlanEstudioCodigo', 'DepartamentoCodigo'],
        where: {
          PersonaId: req.session.user.PersonaId,
        },
        raw: true,
      });
      next();
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  } else {
    next();
  }
});


// router para contexto
app.use(contextPath, router);


// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.DEV === 'true' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    contextPath,
    layout: false,
  });
});


module.exports = app;
