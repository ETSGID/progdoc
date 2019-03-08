let models = require('../models');
let Sequelize = require('sequelize');
let menuProgDocController = require('../controllers/menuProgDoc_controller')
const op = Sequelize.Op;

// GET /profesor/docencia/:profesorCorreo/:anoAcademico(\\d+)/:semestre
//profesorCorreo es el correo del profesor
//anoAcademico 201819
//semestre 1S 2S no permite I
exports.getProfesorAsignaturas = function (req, res, next) {
    let semestreGrupo = '%%'
    let planes = [];
    let planesCompletos = []
    let profesor = null;
    let pds=[]
    let respuesta = {};
    let semestreAsignatura=["I","A","1S-2S"];
    switch (req.params.semestre) {
        case "1S":
            semestreAsignatura.push("1S");
            break;
        case "2S":
            semestreAsignatura.push("2S");
            break;
        default:
            respuesta = { error: "Semestre incorrecto" }
            break;
    }
    return menuProgDocController.getProfesorCorreo(req.params.profesorCorreo)
        .then((prof) => {
            profesor = prof
            if(!profesor){
                respuesta = { error: "Profesor no encontrado"}
            }
            if (!('error' in respuesta)){
                return models.PlanEstudio.findAll({
                    attributes: ["codigo",'nombreCompleto','nombre'],
                    raw: true
                })
                    .then((plans) => {
                        plans.forEach(function (p, index) {
                            planes.push(p['codigo'])
                            planesCompletos.push(p)
                        })
                        return menuProgDocController.getAllProgramacionDocentes(planes, req.params.semestre, req.params.anoAcademico)
                    }).then((progDocentes) => {
                        for (plan in progDocentes) {
                            progDocentes[plan].forEach(function (pd, index) {
                                pds.push(pd["identificador"])
                            })
                        }
                        return models.Asignatura.findAll({
                            where: {
                                ProgramacionDocenteIdentificador: {
                                    [op.or]: pds
                                },
                                semestre: {
                                    [op.or]: semestreAsignatura
                                },
                                anoAcademico: req.params.anoAcademico

                            },
                            attributes: ['codigo', 'acronimo', 'nombre','ProgramacionDocenteIdentificador'],
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
                    }).then((asignaciones) => {
                        asignaciones.forEach(function(asign,index){
                            let planId=asign['ProgramacionDocenteIdentificador'].split("_")[1]
                            console.log(asign)
                            if (!respuesta[planId]){
                                respuesta[planId]={}
                                let infoPlan = planesCompletos.find(function(obj){ return obj.codigo === planId})
                                respuesta[planId]['codigo'] = infoPlan['codigo']
                                respuesta[planId]['nombre'] = infoPlan['nombreCompleto']
                                respuesta[planId]['acronimo'] = infoPlan['nombre']
                                respuesta[planId]['asignaturas'] = []
                            }
                            let asignatura= respuesta[planId]['asignaturas'].find(function(obj){return obj.codigo === asign.codigo})
                            if(!asignatura){
                                delete asign['ProgramacionDocenteIdentificador']
                                respuesta[planId]['asignaturas'].push(asign)
                                
                            }
                        })
                        res.json(respuesta)
                    })
                    
            }else{
                res.json(respuesta);
            }

        })
       
        .catch(function (error) {
            console.log('API error: ' + error.message);
            next(error);
        });
}