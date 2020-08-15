const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const rolController = require('../../controllers/rol_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.gestion.submenu.rol;
  next();
});

// GET roles
router.get(
  '/',
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

// POST roles
router.post(
  '/',
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

module.exports = router;
