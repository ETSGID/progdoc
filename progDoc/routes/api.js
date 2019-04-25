let express = require('express');
let router = express.Router();
let asignaturasApi = require('../api/asignaturas');
let profesorApi = require('../api/profesor');
let menuProgDocController = require('../controllers/menuProgDoc_controller')

router.all('*', function (req,res,next){
    next();
})
router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:curso',
    asignaturasApi.getAsignaturasPD)

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre',
    asignaturasApi.getAsignaturasPD)

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignatura/imparticion',
    asignaturasApi.getGruposAsignatura)

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignaturas/horarios',
    asignaturasApi.getAsignaturasHorario)


router.get('/profesor/docencia/:profesorCorreo/:anoAcademico(\\d+)/:semestre',
    profesorApi.getProfesorAsignaturas)

router.all('*', function (req, res, next) {
    res.json({"error":"Ruta no disponible en la api"})
})
module.exports = router;