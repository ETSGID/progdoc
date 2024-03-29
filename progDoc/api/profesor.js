const Sequelize = require('sequelize');
const models = require('../models');
const progDocController = require('../controllers/progDoc_controller');
const planController = require('../controllers/plan_controller');
const personaYProfesorController = require('../controllers/personaYProfesor_controller');

const op = Sequelize.Op;

// GET /profesor/docencia/:profesorCorreo/:anoAcademico(\\d+)/:semestre
// profesorCorreo es el correo del profesor
// anoAcademico 201819
// semestre 1S 2S no permite I
exports.getProfesorAsignaturas = async (req, res, next) => {
  const planes = [];
  const planesCompletos = [];
  let profesor = null;
  const pds = [];
  const resp = {};
  let respError;
  const semestreAsignatura = ['I', 'A', '1S-2S'];
  switch (req.params.semestre) {
    case '1S':
      semestreAsignatura.push('1S');
      break;
    case '2S':
      semestreAsignatura.push('2S');
      break;
    default:
      respError = { error: 'Semestre incorrecto' };
      break;
  }
  try {
    profesor = await personaYProfesorController.getPersonCorreo(
      true,
      req.params.profesorCorreo
    );
    if (!profesor) {
      respError = { error: 'Profesor no encontrado' };
    }
    if (!respError) {
      const plans = await planController.getPlanesFunction(true);
      plans.forEach(p => {
        planes.push(p.codigo);
        planesCompletos.push(p);
      });
      const progDocentes = await progDocController.getAllProgramacionDocentes(
        planes,
        req.params.semestre,
        req.params.anoAcademico
      );
      for (const plan in progDocentes) {
        if (Object.prototype.hasOwnProperty.call(progDocentes, plan)) {
          progDocentes[plan].forEach(pd => {
            pds.push(pd.identificador);
          });
        }
      }
      const asignaciones = await models.Asignatura.findAll({
        where: {
          acronimo: { [op.ne]: null },
          ProgramacionDocenteIdentificador: {
            [op.or]: pds
          },
          semestre: {
            [op.or]: semestreAsignatura
          },
          anoAcademico: req.params.anoAcademico
        },
        attributes: [
          'codigo',
          'acronimo',
          'nombre',
          'ProgramacionDocenteIdentificador'
        ],
        include: [
          {
            // incluye las asignaciones de profesores y los horarios.
            attributes: [],
            model: models.AsignacionProfesor,
            where: {
              ProfesorId: profesor.identificador
            }, // inner join
            required: true
          }
        ],
        raw: true
      });
      asignaciones.forEach(asign => {
        const planId = asign.ProgramacionDocenteIdentificador.split('_')[1];
        if (!resp[planId]) {
          resp[planId] = {};
          const infoPlan = planesCompletos.find(obj => obj.codigo === planId);
          resp[planId].codigo = infoPlan.codigo;
          resp[planId].nombre = infoPlan.nombreCompleto;
          resp[planId].acronimo = infoPlan.nombre;
          resp[planId].asignaturas = [];
        }
        const asignatura = resp[planId].asignaturas.find(
          obj => obj.codigo === asign.codigo
        );
        if (!asignatura) {
          // eslint-disable-next-line no-param-reassign
          delete asign.ProgramacionDocenteIdentificador;
          resp[planId].asignaturas.push(asign);
        }
      });
      res.json(resp);
    } else {
      res.status(404);
      res.json(respError);
    }
  } catch (error) {
    console.error(`API error: ${error.message}`);
    next(error);
  }
};
