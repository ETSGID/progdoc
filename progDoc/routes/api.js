let express = require('express');
let router = express.Router();
let asignaturasApi = require('../api/asignaturas');

router.all('*', function (req,res,next){
    next();
})
router.get('/asignaturas/:progDocID',
    asignaturasApi.getAsignaturasPD)

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignatura',
    asignaturasApi.getGruposAsignatura)


module.exports = router;