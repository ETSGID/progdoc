let models = require('../models');
let Sequelize = require('sequelize');
let menuProgDocController = require('../controllers/menuProgDoc_controller')

// GET /progdoc/api/asignaturas/:progDocID
//donde progDocID es el identificador de la progDoc en la bbdd
exports.getAsignaturasPD = function (req, res, next) {
    return models.Asignatura.findAll({
        where: {
            ProgramacionDocenteIdentificador: req.params.progDocID,
        },
        attributes: ['codigo', 'nombre', 'acronimo', 'nombreIngles', 'creditos',
            'acronimo', 'curso', 'semestre', 'tipo', 'DepartamentoResponsable'],
        order: [
            [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
            [Sequelize.literal('"Asignatura"."codigo"'), 'ASC'],
        ],
        raw: true
    }).then(function (asign) {

        res.json(asign);

    })
        .catch(function (error) {
            console.log('API error: ' + error.message);
            next(error);
        });
};


// GET /asignaturas/:plan/:anoAcademico(\\d+)/:semestre/:codigoAsignatura
// plan es codigo del plan
//anoAcademico 201819
//semestre 1S 2S I
//codigoAsignatura es codigo de la asignatura
exports.getGruposAsignatura = function (req, res, next) {
    let semestreGrupo = '%%'
    let pdID1 = null;
    let pdID2 = null;
    return menuProgDocController.getProgramacionDocentesAnteriores(req.params.plan, req.params.semestre, req.params.anoAcademico, null)
        .then((pdis) => {
            switch (pdis.length) {
                case 1:
                    pdID1 = pdis[0].identificador;
                    break;
                case 2:
                    pdID1 = pdis[0].identificador;
                    pdID1 = pdis[1].identificador;
                    break;
                default:
                    break;
            }

            switch (req.params.semestre) {
                case "1S":
                    semestreGrupo = '.1'
                    break;
                case "2S":
                    semestreGrupo = '.2'
                    break;
                case "I":
                    semestreGrupo = '.'
                    break;
                case "A":
                    semestreGrupo = '.'
                    break;
                default:
                    break;
            }

            return models.sequelize.query(query = `SELECT distinct a.codigo, a.nombre as "nombreAsignatura", a.acronimo, g.nombre, g."nombreItinerario", g.aula, g.capacidad, a."anoAcademico"
  FROM public."Asignaturas" as a
  left join public."AsignacionProfesors" as s on a.identificador = s."AsignaturaId"
  inner join public."Grupos" as g on s."GrupoId" = g."grupoId"
  where a."ProgramacionDocenteIdentificador" in (:pdID1, :pdID2)
  and a.codigo = :codigo
  order by a.codigo, g.nombre`,
                { replacements: { pdID1: pdID1, pdID2: pdID2, semestre: semestreGrupo, codigo: req.params.codigoAsignatura } },
            )
        })
        .then(grupos => {
            let asignatura = {};
            asignatura.nombre = "";
            asignatura.codigo = "";
            asignatura.grupos = [];
            grupos[0].forEach(function (gr) {
                if (gr.anoAcademico === req.params.anoAcademico) {
                    asignatura.nombre = grupos[0][0].nombreAsignatura;
                    asignatura.codigo = grupos[0][0].codigo;
                    asignatura.acronimo = grupos[0][0].acronimo;
                    if (gr.nombre.includes(semestreGrupo)) {
                        asignatura.grupos.push({ nombre: gr.nombre, aula: gr.aula, capacidad: gr.capacidad })
                    }
                }
            })
            res.json(asignatura);
        })
        .catch(function (error) {
            console.log('API error: ' + error.message);
            next(error);
        });
}



