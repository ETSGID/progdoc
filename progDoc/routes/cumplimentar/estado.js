const express = require('express');

const router = express.Router();

const progDocController = require('../../controllers/progDoc_controller');
const planController = require('../../controllers/plan_controller');
const estadoController = require('../../controllers/estado_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.cumplimentar.submenu.estado.nombre;
  next();
});

// GET estado programacion docente
router.get(
  '/',
  planController.getPlanes,
  progDocController.getProgramacionDocente,
  estadoController.getEstado
);

module.exports = router;
