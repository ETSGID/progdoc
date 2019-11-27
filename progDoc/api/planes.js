let planController = require('../controllers/plan_controller') 

// GET planes de una PD
exports.getPlanesPD = async function (req, res, next) {
    let resp = {}
    let respError
    try {
        let plans = await planController.getPlanesFunction(true);
        plans.forEach(function (p, index) {
            resp[p['codigo']] = p
        })
        if (respError) res.json(respError)
        else res.json(resp)
    }
    catch (error) {
        console.log('API error: ' + error.message);
        next(error);
    }
}