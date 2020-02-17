
/* global PATH_PDF, CONTEXT, DEV, PRUEBAS */
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const partials = require('express-partials');
const morgan = require('morgan');


const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);


// cas autentication
const CASAuthentication = require('cas-authentication');
// Create a new instance of CASAuthentication.
const service = process.env.SERVICE || 'http://localhost:3000';
const casUrl = process.env.CAS || 'https://repo.etsit.upm.es/cas-upm';

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


// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(path.join(CONTEXT, 'pdfs'), express.static(path.join(PATH_PDF, 'pdfs')));
app.use(path.join(CONTEXT, 'archivos'), express.static(path.join(__dirname, 'public')));
app.use(CONTEXT, express.static(path.join(__dirname, 'public')));


// Configuracion de la session para almacenarla en BBDD usando Sequelize.
const sessionStore = new SequelizeStore({
  db: models.sequelizeSession,
  table: 'Session',
  // The interval at which to cleanup expired sessions in milliseconds. (15 minutes)
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 1 * 60 * 60 * 1000, // The maximum age (in milliseconds) of a valid session. (6 hours)
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'Secreto_para_las_sesiones',
  store: sessionStore,
  resave: false,
  saveUninitialized: true,
}));


// autologout

// Rutas que no empiezan por /api/
app.use(path.join(CONTEXT, 'api'), routerApi);
// exit del cas el primero para que no entre en bucle. El cas es el encargado de eliminar la sesión
app.get(path.join(CONTEXT, 'logout'), cas.logout);


if (DEV === 'true') {
  // solo imprime las peticiones incorrectas
  app.use(morgan('dev', {
    skip(req, res) { return res.statusCode < 400; },
  }));
  app.use(partials());
  /**
   * modelo dev. No pasa por el cas
   * Está preparado para usar el servidor de desarrollo de react
  */
  app.use((req, res, next) => {
    if (!req.session.user) req.session.user = {};
    // employeetype puede ser un string o un array pq luego se convierte a array
    req.session.user.employeetype = process.env.USER_ROLS || ['F', 'A'];
    req.session.user.mail = PRUEBAS;
    req.session.user.uid = 'ejemplo';
    req.session.user.cn = 'FERNANDO FERNANDEZ FERNANDEZ';
    req.session.user.givenname = 'FERNANDO';
    res.locals.session = req.session;
    next();
  });
} else {
  // solo te imprime las peticiones incorrectas
  app.use(morgan('combined', {
    skip(req, res) { return res.statusCode < 400; },
  }));
  app.use(partials());
  app.use(cas.bounce, (req, res, next) => {
    next();
  });
}

app.use(async (req, res, next) => {
  // Hacer visible req.session en las vistas
  res.locals.session = req.session;
  res.locals.CONTEXT = CONTEXT;
  res.locals.pruebas = PRUEBAS === 'true' ? 'pruebas' : 'portal';
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
        res.redirect(CONTEXT);
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
app.use(CONTEXT, router);


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
  res.locals.error = DEV === 'true' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    CONTEXT,
    layout: false,
  });
});


module.exports = app;
