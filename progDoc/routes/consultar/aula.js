const express = require('express');

const router = express.Router();

const planController = require('../../controllers/plan_controller');
const aulaController = require('../../controllers/aula_controller');

const enumsPD = require('../../enumsPD');

router.all('*', (req, res, next) => {
  req.session.submenu = enumsPD.menuBar.gestion.submenu.aula;
  next();
});
// GET aulas
router.get('/', planController.getPlanes, aulaController.getAulas);

// POST pdf aulas
router.post('/pdf', planController.getPlanes, aulaController.getAulas);

module.exports = router;
