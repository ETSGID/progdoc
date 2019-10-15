let models = require('../models');
let Sequelize = require('sequelize');
let progDocController = require('../controllers/progDoc_controller')
let personaYProfesorController = require('../controllers/personaYProfesor_controller')
const op = Sequelize.Op;

// GET /profesor/docencia/:profesorCorreo/:anoAcademico(\\d+)/:semestre
//profesorCorreo es el correo del profesor
//anoAcademico 201819
//semestre 1S 2S no permite I
exports.getProfesorAsignaturas = async function (req, res, next) {
    let planes = [];
    let planesCompletos = []
    let profesor = null;
    let pds = []
    let resp = {};
    let respError
    let semestreAsignatura = ["I", "A", "1S-2S"];
    switch (req.params.semestre) {
        case "1S":
            semestreAsignatura.push("1S");
            break;
        case "2S":
            semestreAsignatura.push("2S");
            break;
        default:
            respError = { error: "Semestre incorrecto" }
            break;
    }
    try {
        profesor = await personaYProfesorController.getProfesorCorreo(req.params.profesorCorreo)
        if (!profesor) {
            respError = { error: "Profesor no encontrado" }
        }
        if (!respError) {
            let plans = await models.PlanEstudio.findAll({
                attributes: ["codigo", 'nombreCompleto', 'nombre'],
                raw: true
            })
            plans.forEach(function (p, index) {
                planes.push(p['codigo'])
                planesCompletos.push(p)
            })
            let progDocentes = await progDocController.getAllProgramacionDocentes(planes, req.params.semestre, req.params.anoAcademico)
            for (plan in progDocentes) {
                progDocentes[plan].forEach(function (pd, index) {
                    pds.push(pd["identificador"])
                })
            }
            let asignaciones = await models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: {
                        [op.or]: pds
                    },
                    semestre: {
                        [op.or]: semestreAsignatura
                    },
                    anoAcademico: req.params.anoAcademico
                },
                attributes: ['codigo', 'acronimo', 'nombre', 'ProgramacionDocenteIdentificador'],
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    attributes: [],
                    model: models.AsignacionProfesor,
                    where: {
                        ProfesorId: profesor.identificador
                    },//inner join
                    required: true
                }],
                raw: true

            })
            asignaciones.forEach(function (asign) {
                let planId = asign['ProgramacionDocenteIdentificador'].split("_")[1]
                if (!resp[planId]) {
                    resp[planId] = {}
                    let infoPlan = planesCompletos.find(function (obj) { return obj.codigo === planId })
                    resp[planId]['codigo'] = infoPlan['codigo']
                    resp[planId]['nombre'] = infoPlan['nombreCompleto']
                    resp[planId]['acronimo'] = infoPlan['nombre']
                    resp[planId]['asignaturas'] = []
                }
                let asignatura = resp[planId]['asignaturas'].find(function (obj) { return obj.codigo === asign.codigo })
                if (!asignatura) {
                    delete asign['ProgramacionDocenteIdentificador']
                    resp[planId]['asignaturas'].push(asign)
                }
            })
            res.json(resp)
        } else {
            res.json(respError);
        }
    }
    catch (error) {
        console.log('API error: ' + error.message);
        next(error);
    }
}