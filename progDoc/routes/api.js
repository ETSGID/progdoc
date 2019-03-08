let express = require('express');
let router = express.Router();
let asignaturasApi = require('../api/asignaturas');
let profesorApi = require('../api/profesor');

router.all('*', function (req,res,next){
    next();
})
router.get('/asignaturas/:progDocID',
    asignaturasApi.getAsignaturasPD)

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignatura',
    asignaturasApi.getGruposAsignatura)

router.get('/profesor/docencia/:profesorCorreo/:anoAcademico(\\d+)/:semestre',
    profesorApi.getProfesorAsignaturas)

module.exports = router;