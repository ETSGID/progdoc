const app = require('../app');


// Si se supera el tiempo de inactividad indicado por esta variable,
// sin que el usuario solicite nuevas paginas, entonces se cerrara
// la sesion del usuario.
// El valor esta en milisegundos.
// 60 minutos
// Ahora se hace desde el store de la bbdd de sesiones
const maxSesionTime = 60 * 60 * 1000;


//
// Middleware usado para destruir la sesion del usuario si se ha
// excedido el tiempo de inactividad.
//
exports.deleteExpiredUserSession = function (req, res, next) {
  if (req.session.user.expires < Date.now()) { // Caduco
    // la sesión la elimina el cas
    req.session.save(() => {
      res.redirect(`${app.contextPath}/logout`);
    });
  } else { // No caduco. Restaurar la hora de expiracion.
    req.session.user.expires = Date.now() + maxSesionTime;
    next();
  }
};
