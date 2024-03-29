const Sequelize = require('sequelize');

const op = Sequelize.Op;
const models = require('../models');

// recuperar las asignaturas de una progdoc
exports.getAsignaturasProgDoc = async (pdID, filter) => {
  if (pdID) {
    // eslint-disable-next-line no-useless-catch
    try {
      const filtro = filter || {};
      filtro.ProgramacionDocenteIdentificador = pdID;
      const asign = await models.Asignatura.findAll({
        where: filtro,
        attributes: [
          'identificador',
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
      return asign;
    } catch (error) {
      // se propaga el error lo captura el middleware
      throw error;
    }
  } else {
    return null;
  }
};

// se pasa el tipoPD (1S, 2S o I) y el semestre de asignatura (1S, 1S-2S, A ...)
// devuelve si para semestre1 debaría estar en la PD (true) y lo mismo con semestre2
exports.getSemestresAsignaturainPD = (tipoPD, semestre) => {
  let s1;
  let s2;
  switch (tipoPD) {
    case '1S':
      s1 =
        semestre === '1S' ||
        semestre === '1S-2S' ||
        semestre === 'A' ||
        semestre === 'I';
      s2 = false;
      break;
    case '2S':
      s1 = false;
      s2 =
        semestre === '2S' ||
        semestre === '1S-2S' ||
        semestre === 'A' ||
        semestre === 'I';
      break;
    default:
      s1 =
        semestre === '1S' ||
        semestre === '1S-2S' ||
        semestre === 'A' ||
        semestre === 'I';
      s2 =
        semestre === '2S' ||
        semestre === '1S-2S' ||
        semestre === 'A' ||
        semestre === 'I';
      break;
  }
  return [s1, s2];
};

// recuperar las asignaturas de una progdoc
exports.getCoordinadoresAsignaturasProgDoc = async pdID => {
  if (pdID) {
    // eslint-disable-next-line no-useless-catch
    try {
      const asign = await models.Asignatura.findAll({
        where: {
          ProgramacionDocenteIdentificador: pdID,
          acronimo: {
            [op.ne]: null
          }
        },
        attributes: [
          'codigo',
          'nombre',
          'acronimo',
          'curso',
          'semestre',
          'tipo',
          'DepartamentoResponsable',
          'CoordinadorAsignatura'
        ],
        order: [
          [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
          [Sequelize.literal('"Asignatura"."codigo"'), 'ASC']
        ],
        raw: true,
        include: [
          {
            model: models.Profesor,
            as: 'Coordinador',
            // left join
            required: false,
            include: [
              {
                model: models.Persona,
                // left join
                required: false
              }
            ]
          }
        ]
      });
      return asign;
    } catch (error) {
      // se propaga el error lo captura el middleware
      throw error;
    }
  } else {
    return null;
  }
};
