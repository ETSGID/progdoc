const express = require('express');

const router = express.Router();

const planController = require('../../controllers/plan_controller');
const historialController = require('../../controllers/historial_controller');
const jqueryFileTreeController = require('../../controllers/jqueryFileTree_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.menu = [];
  req.session.menu.push('drop_ProgDoc');
  req.session.menu.push('element_ProgDocHistorial');
  req.session.menuBar = enumsPD.menuBar.historial;
  next();
});

// GET historial
router.get('/', planController.getPlanes, historialController.getHistorial);

// GET pdfs jqueryFileTree library
router.post(
  '/pdfs',
  planController.getPlanes,
  jqueryFileTreeController.getDirList
);

module.exports = router;
