const models = require('../models');

// te devuelve todos los cursos que existen
exports.getCursos = async pdID => {
  if (pdID) {
    const cursos = [];
    // eslint-disable-next-line no-useless-catch
    try {
      const curs = await models.sequelize.query(
        `SELECT distinct  "curso" FROM public."Asignaturas" a  
        WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;`,
        { replacements: { pdID } }
      );
      curs[0].forEach(c => {
        cursos.push(c.curso);
      });
      return cursos;
    } catch (error) {
      // se propaga el error lo captura el middleware
      throw error;
    }
  } else {
    return null;
  }
};
