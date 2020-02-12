const express = require('express');

const router = express.Router();
const asignaturasApi = require('../api/asignaturas');
const profesorApi = require('../api/profesor');
const planesApi = require('../api/planes');

router.all('*', (req, res, next) => {
  next();
});

router.get('/planes',
  planesApi.getPlanesPD);

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:curso',
  asignaturasApi.getAsignaturasPD);

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre',
  asignaturasApi.getAsignaturasPD);

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignatura/imparticion',
  asignaturasApi.getGruposAsignatura);

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignaturas/horarios',
  asignaturasApi.getAsignaturasHorario);

router.get('/asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignaturas/examenes',
  asignaturasApi.getAsignaturasExamen);

router.get('/profesor/docencia/:profesorCorreo/:anoAcademico(\\d+)/:semestre',
  profesorApi.getProfesorAsignaturas);

router.all('*', (req, res) => {
  res.status(404);
  res.json({ error: 'Ruta no disponible en la api' });
});
module.exports = router;
