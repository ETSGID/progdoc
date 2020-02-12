const planController = require('../controllers/plan_controller');

// GET planes de una PD
exports.getPlanesPD = async function (req, res, next) {
  const resp = {};
  let respError;
  try {
    const plans = await planController.getPlanesFunction(true);
    plans.forEach((p) => {
      resp[p.codigo] = p;
    });
    if (respError) {
      res.status(404);
      res.json(respError);
    } else res.json(resp);
  } catch (error) {
    console.log(`API error: ${error.message}`);
    next(error);
  }
};
