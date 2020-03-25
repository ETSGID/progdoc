const Sequelize = require('sequelize');
const models = require('../models');

const op = Sequelize.Op;
const progDocController = require('../controllers/progDoc_controller');
const enumsPD = require('../enumsPD');

// GET asignaturas de una PD
// donde progDocID es el identificador de la progDoc en la bbdd
// se debe pasar como parámetros el plan, semestre, anoAcademico, y curso (opcional)
// sino se pasa curso se devuelven todos los cursos,
// lo mismo si no se pasa semestre o si el semestre es I
exports.getAsignaturasPD = async function(req, res, next) {
  let pdID1 = 'no programacion';
  let pdID2 = 'no programacion';
  const filtro = {};
  const semestreAsignatura = ['I', 'A', '1S-2S'];
  let resp = {};
  let respError;
  switch (req.params.semestre) {
    case '1S':
      semestreAsignatura.push('1S');
      break;
    case '2S':
      semestreAsignatura.push('2S');
      break;
    case 'I':
      break;
    default:
      respError = { error: 'Semestre incorrecto' };
      break;
  }
  if (req.params.semestre && req.params.semestre !== 'I')
    filtro.semestre = { [op.or]: semestreAsignatura };
  if (req.params.curso) filtro.curso = req.params.curso;
  try {
    const pdis = await progDocController.getProgramacionDocentesAnteriores(
      req.params.plan,
      req.params.semestre,
      req.params.anoAcademico,
      null,
      null
    );
    // debo comprobar el año ya que getProgramacionDocnetesAnteriores te da la ultima cerrada
    // o anteriores
    switch (pdis.length) {
      case 1:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        break;
      case 2:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        if (
          progDocController.getAnoPd(pdis[1].identificador) ===
          req.params.anoAcademico
        ) {
          pdID2 = pdis[1].identificador;
        }
        break;
      default:
        break;
    }
    filtro.ProgramacionDocenteIdentificador = {
      [op.or]: [pdID1, pdID2]
    };
    const asign = await models.Asignatura.findAll({
      where: filtro,
      attributes: [
        'codigo',
        'nombre',
        'acronimo',
        'nombreIngles',
        'creditos',
        'acronimo',
        'curso',
        'semestre',
        'tipo',
        'DepartamentoResponsable'
      ],
      order: [
        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
        [Sequelize.literal('"Asignatura"."codigo"'), 'ASC']
      ],
      raw: true
    });
    resp = asign;
    if (respError) {
      res.status(404);
      res.json(respError);
    } else res.json(resp);
  } catch (error) {
    console.log(`API error: ${error.message}`);
    next(error);
  }
};

// GET horarios asignaturas de una PD
// donde progDocID es el identificador de la progDoc en la bbdd
// se debe pasar como parámetros el plan, semestre, anoAcademico, y codigo asignaturas
// separadas por comas
exports.getAsignaturasHorario = async function(req, res, next) {
  let pdID1 = 'no programacion';
  let pdID2 = 'no programacion';
  const filtro = {};
  const semestreAsignatura = ['I', 'A', '1S-2S'];
  const asignaturas = req.params.codigoAsignaturas.split(',');
  filtro.codigo = { [op.or]: asignaturas };
  const resp = {};
  let respError;
  switch (req.params.semestre) {
    case '1S':
      semestreAsignatura.push('1S');
      break;
    case '2S':
      semestreAsignatura.push('2S');
      break;
    case 'I':
      break;
    default:
      respError = { error: 'Semestre incorrecto' };
      break;
  }

  if (req.params.semestre && req.params.semestre !== 'I')
    filtro.semestre = { [op.or]: semestreAsignatura };
  try {
    const pdis = await progDocController.getProgramacionDocentesAnteriores(
      req.params.plan,
      req.params.semestre,
      req.params.anoAcademico,
      null,
      null
    );
    // debo comprobar el año ya que getProgramacionDocnetesAnteriores te da
    // la última cerrada o anteriores
    switch (pdis.length) {
      case 1:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        break;
      case 2:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        if (
          progDocController.getAnoPd(pdis[1].identificador) ===
          req.params.anoAcademico
        ) {
          pdID2 = pdis[1].identificador;
        }
        break;
      default:
        break;
    }
    filtro.ProgramacionDocenteIdentificador = {
      [op.or]: [pdID1, pdID2]
    };
    const asigns = await models.Asignatura.findAll({
      where: filtro,
      attributes: [
        'codigo',
        'nombre',
        'acronimo',
        'nombreIngles',
        'creditos',
        'acronimo',
        'curso',
        'semestre',
        'tipo',
        'DepartamentoResponsable'
      ],
      order: [
        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
        [Sequelize.literal('"Asignatura"."codigo"'), 'ASC']
      ],
      raw: true,
      include: [
        {
          // left join
          model: models.AsignacionProfesor,
          where: {
            ProfesorId: null // cojo las que no son de asignacion de profesores
          },
          required: false,
          attributes: [
            'Dia',
            'HoraInicio',
            'Duracion',
            'Nota',
            'GrupoId',
            'identificador'
          ],
          include: [
            {
              model: models.Grupo,
              attributes: ['nombre']
            }
          ]
        }
      ]
    });
    asigns.forEach(asign => {
      let as = null;
      let grupo = null;
      if (!resp[asign.codigo]) {
        const asignNueva = {};
        asignNueva.codigo = asign.codigo;
        asignNueva.nombre = asign.nombre;
        asignNueva.acronimo = asign.acronimo;
        asignNueva.creditos = asign.creditos;
        asignNueva.curso = asign.curso;
        asignNueva.semestre = asign.semestre;
        asignNueva.nombreIngles = asign.nombreIngles;
        asignNueva.grupos = {};
        resp[asign.codigo] = asignNueva;
      }
      as = resp[asign.codigo];
      if (asign['AsignacionProfesors.Grupo.nombre']) {
        if (!as.grupos[asign['AsignacionProfesors.Grupo.nombre']])
          as.grupos[asign['AsignacionProfesors.Grupo.nombre']] = {
            horario: [],
            nota: []
          };
        grupo = as.grupos[asign['AsignacionProfesors.Grupo.nombre']];
        if (asign['AsignacionProfesors.Dia'])
          grupo.horario.push({
            dia: asign['AsignacionProfesors.Dia'],
            hora: asign['AsignacionProfesors.HoraInicio'],
            duracion: asign['AsignacionProfesors.Duracion']
          });
        if (asign['AsignacionProfesors.Nota'])
          grupo.nota.push(asign['AsignacionProfesors.Nota']);
      }
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

// GET examenes de asignaturas de una PD
// donde progDocID es el identificador de la progDoc en la bbdd
// se debe pasar como parámetros el plan, semestre, anoAcademico, y codigo asignaturas
// separadas por comas
exports.getAsignaturasExamen = async function(req, res, next) {
  let pdID1 = 'no programacion';
  let pdID2 = 'no programacion';
  const filtro = {};
  const semestreAsignatura = ['I', 'A', '1S-2S'];
  const asignaturas = req.params.codigoAsignaturas.split(',');
  const periodosExamen = [];
  filtro.codigo = { [op.or]: asignaturas };
  const resp = {};
  let respError;
  switch (req.params.semestre) {
    case '1S':
      semestreAsignatura.push('1S');
      periodosExamen.push(enumsPD.periodoPD.S1_O);
      periodosExamen.push(enumsPD.periodoPD.S1_E);
      break;
    case '2S':
      semestreAsignatura.push('2S');
      periodosExamen.push(enumsPD.periodoPD.S2_O);
      periodosExamen.push(enumsPD.periodoPD.S2_E);
      break;
    case 'I':
      periodosExamen.push(enumsPD.periodoPD.S1_O);
      periodosExamen.push(enumsPD.periodoPD.S1_E);
      periodosExamen.push(enumsPD.periodoPD.S2_O);
      periodosExamen.push(enumsPD.periodoPD.S2_E);
      break;
    default:
      respError = { error: 'Semestre incorrecto' };
      break;
  }
  if (req.params.semestre && req.params.semestre !== 'I')
    filtro.semestre = { [op.or]: semestreAsignatura };
  try {
    const pdis = await progDocController.getProgramacionDocentesAnteriores(
      req.params.plan,
      req.params.semestre,
      req.params.anoAcademico,
      null,
      null
    );
    // debo comprobar el año ya que getProgramacionDocnetesAnteriores te da
    // la ultima cerrada o anteriores
    switch (pdis.length) {
      case 1:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        break;
      case 2:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        if (
          progDocController.getAnoPd(pdis[1].identificador) ===
          req.params.anoAcademico
        ) {
          pdID2 = pdis[1].identificador;
        }
        break;
      default:
        break;
    }
    filtro.ProgramacionDocenteIdentificador = {
      [op.or]: [pdID1, pdID2]
    };
    const asigns = await models.Asignatura.findAll({
      where: filtro,
      attributes: [
        'codigo',
        'nombre',
        'acronimo',
        'nombreIngles',
        'creditos',
        'acronimo',
        'curso',
        'semestre',
        'tipo',
        'DepartamentoResponsable'
      ],
      order: [
        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
        [Sequelize.literal('"Asignatura"."codigo"'), 'ASC']
      ],
      raw: true,
      include: [
        {
          // left join
          model: models.Examen,
          required: false,
          attributes: ['fecha', 'horaInicio', 'duracion', 'periodo']
        }
      ]
    });
    asigns.forEach(asign => {
      let as = null;
      if (!resp[asign.codigo]) {
        const asignNueva = {};
        asignNueva.codigo = asign.codigo;
        asignNueva.nombre = asign.nombre;
        asignNueva.acronimo = asign.acronimo;
        asignNueva.creditos = asign.creditos;
        asignNueva.curso = asign.curso;
        asignNueva.semestre = asign.semestre;
        asignNueva.nombreIngles = asign.nombreIngles;
        asignNueva.examenesPeriodos = {};
        resp[asign.codigo] = asignNueva;
      }
      as = resp[asign.codigo];
      if (
        asign['Examens.periodo'] &&
        periodosExamen.includes(asign['Examens.periodo'])
      ) {
        if (!as.examenesPeriodos[asign['Examens.periodo']])
          as.examenesPeriodos[asign['Examens.periodo']] = { examenes: [] };
        const examenesPeriodos = as.examenesPeriodos[asign['Examens.periodo']];
        examenesPeriodos.examenes.push({
          fecha: asign['Examens.fecha'],
          hora: asign['Examens.horaInicio'],
          duracion: asign['Examens.duracion']
        });
      }
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

// GET /asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignatura/imparticion
// plan es codigo del plan
// anoAcademico 201819
// semestre 1S 2S I
// codigoAsignatura es codigo de la asignatura
// devuelve los profesores que dan una asignatura
exports.getGruposAsignatura = async function(req, res, next) {
  let semestreGrupo = '%%';
  let pdID1 = 'no programacion';
  let pdID2 = 'no programacion';
  let resp = {};
  let respError;
  try {
    const pdis = await progDocController.getProgramacionDocentesAnteriores(
      req.params.plan,
      req.params.semestre,
      req.params.anoAcademico,
      null,
      null
    );
    switch (pdis.length) {
      // debo comprobar el año ya que getProgramacionDocnetesAnteriores te da
      // la ultima cerrada o anteriores
      case 1:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        break;
      case 2:
        if (
          progDocController.getAnoPd(pdis[0].identificador) ===
          req.params.anoAcademico
        ) {
          pdID1 = pdis[0].identificador;
        }
        if (
          progDocController.getAnoPd(pdis[1].identificador) ===
          req.params.anoAcademico
        ) {
          pdID2 = pdis[1].identificador;
        }
        break;
      default:
        break;
    }
    switch (req.params.semestre) {
      case '1S':
        semestreGrupo = '.1';
        break;
      case '2S':
        semestreGrupo = '.2';
        break;
      case 'I':
        semestreGrupo = '.';
        break;
      default:
        respError = { error: 'Semestre incorrecto' };
        break;
    }

    const grupos = await models.sequelize.query(
      `SELECT distinct 
      a.identificador, a.codigo, a.nombre as "nombreAsignatura", 
      a.acronimo, g.nombre, g."nombreItinerario", g.aula, g.capacidad, 
      g."nombreItinerario", a."anoAcademico"
      FROM public."Asignaturas" as a
      left join public."AsignacionProfesors" as s on a.identificador = s."AsignaturaId"
      inner join public."Grupos" as g on s."GrupoId" = g."grupoId"
      where a."ProgramacionDocenteIdentificador" in (:pdID1, :pdID2)
      and a.codigo = :codigo
      and (s."Dia" IS NOT NULL or s."Nota" IS NOT NULL)
      order by a.codigo, g.nombre`,
      {
        replacements: {
          pdID1,
          pdID2,
          semestre: semestreGrupo,
          codigo: req.params.codigoAsignatura
        }
      }
    );
    const asignatura = {};
    asignatura.nombre = '';
    asignatura.codigo = '';
    asignatura.grupos = [];
    grupos[0].forEach(gr => {
      if (gr.anoAcademico === req.params.anoAcademico) {
        asignatura.nombre = grupos[0][0].nombreAsignatura;
        asignatura.codigo = grupos[0][0].codigo;
        asignatura.acronimo = grupos[0][0].acronimo;
        if (gr.nombre.includes(semestreGrupo)) {
          asignatura.grupos.push({
            nombre: gr.nombre,
            aula: gr.aula,
            capacidad: gr.capacidad,
            itinerario: gr.nombreItinerario
          });
        }
      }
    });
    resp = asignatura;
    if (respError) {
      res.status(404);
      res.json(respError);
    } else res.json(resp);
  } catch (error) {
    console.log(`API error: ${error.message}`);
    next(error);
  }
};
