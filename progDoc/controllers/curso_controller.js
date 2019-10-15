let models = require('../models');


//te devuelve todos los cursos que existen
exports.getCursos = async function (pdID) {
    if (pdID) {
        let cursos = []
        try {
            let curs = await models.sequelize.query(query = 'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
                { replacements: { pdID: pdID } }
            )
            curs[0].forEach(function (c) {
                cursos.push(c.curso)
            })
            return cursos
        }
        catch (error) {
            //se propaga el error lo captura el middleware
            throw error;
        }
    } else {
        return null;
    }
}