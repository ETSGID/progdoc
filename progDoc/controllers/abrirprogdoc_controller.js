let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
const axios = require('axios');
let estados = require('../estados');
let funciones = require('../funciones');
let menuProgDocController = require('../controllers/menuProgDoc_controller')


exports.abrirNuevaProgDoc = function (req, res, next) {
    let tipoPD = req.body.semestre;
    let plan = req.body.plan;
    let ano = req.body.anoAcademico;
    let cont = 0;
    //PD_09TT_201718_1S_v1;

    //la version puede cambiar la sacamos del pd anterior
    res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v1'
    let pds = [];
    let nuevaPd = {};
    //las nuevas asignaturas son o nuevas o que cambian de semestre o de curso o de itinerario o que cambian de obligatoria a optativa o al revés
    let nuevasAsignaturas = [];
    let viejasAsignaturas = [];
    let cambioAsignaturas = [];
    let desapareceAsignaturas = [];
    let asignacions = [];

    let gruposToAnadir = [];
    let relacionGrupos = [];
    let apiAsignaturas = [];
    let whereAsignaturas;

    res.locals.departamentosResponsables = [];
    let promisesRoles = [];

    axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/plan.json/" + plan + "/asignaturas?anio=" + ano)
        .then(function (response) {
            apiAsignaturas = response.data;
            /*En api upm
            T: Basica
            B: Obligatoria
            O: Optativa
            P: Trabajo de fin de titulacion, tiene curso pero no departamento responsable
            Las practicas son optativas y no tienen depart responsable. pero si curso
            Las asignaturas de intercambio son como las practicas
            Las asignaturas que no se imparten no vienen con curso asignado ni tipo
            */


            /*
            si la pd es semestral buscas la anterior semestral de ese mismo semestre o anual. Pero la más reciente de ambas
            si la pd es anual buscas la anterior anual o las dos anteriores semestrales, lo que sea más reciente.
            Se supone que no puede ocurrir 1S, I, 2S o I, 2S. De todas formas con el orderby se queda con la I primero así que no habrían problemas
            ya que con la I se pueden hacer todos los casos
            También es importante la forma de la clave ppal de la pd ya que ordenamos en funcion de ello.
            */

            return menuProgDocController.getProgramacionDocentesAnteriores(plan, tipoPD, ano, null)
        })
        .then((pdis) => {
            pds = pdis;
            whereAsignaturas = {};
            whereAsignaturas['$or'] = [];

            //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
            for (let i = 0; i < pds.length; i++) {
                whereAsignaturas['$or'].push({ ProgramacionDocenteIdentificador: pds[i].identificador })
                let ident = pds[i].identificador.split("_");
                if (ident[0] === 'PD' && ident[1] === plan && ident[2] === ano && ident[3] === tipoPD) {
                    let vers = Number(ident[4].split("v")[1]) + 1;
                    res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v' + vers;
                }
            }
            nuevaPd.identificador = res.locals.identificador;
            nuevaPd.version = Number(res.locals.identificador.split("_")[4].split("v")[1]);
            nuevaPd.anoAcademico = ano;
            nuevaPd.semestre = tipoPD;
            nuevaPd.estadoProGDoc = -1;
            nuevaPd.fechaProgDoc = new Date();
            nuevaPd.PlanEstudioId = plan;
            if (nuevaPd.version > 1 && pd[0]) {
                //si la version es mayor que 1 debe haber una progdoc en la bbdd pero lo compruebo de todas formas
                nuevaPd.reabierto = pd[0].reabierto
            } else {
                nuevaPd.reabierto = 0;
            }
            let pdToAnadir = models.ProgramacionDocente.build(
                nuevaPd
            )
            return pdToAnadir.save()
        })
        .then(() => { // Notice: There are no arguments here, as of right now you'll have to...
            //se supone que los grupos terminan en .1 o .2 aunque sean para optativas. Si tal definir un grupo de optativas con un flag.
            let pdId1 = "no programacion"
            let pdId2 = "no programacion"
            let cursoGrupo = '%%';
            pds[0] ? pdId1 = pds[0].identificador : pdId1 = pdId1;
            pds[1] ? pdId2 = pds[1].identificador : pdId2 = pdId2;

            switch (tipoPD) {
                case "1S":
                    cursoGrupo = '%.1'
                    break;
                case "2S":
                    cursoGrupo = '%.2'
                    break;
                case "I":
                    cursoGrupo = '%%'
                    break;
                default:
                    break;
            }
            return models.sequelize.query(query = 'SELECT distinct  "nombre", g."grupoId", "curso", "capacidad", "aula", "nombreItinerario", "idioma" FROM public."Grupos" g  WHERE (g."ProgramacionDocenteId" = :pdId1 or g."ProgramacionDocenteId" = :pdId2) and g."nombre" LIKE :cursoGrupo  ORDER BY g."nombre" ASC ',
                { replacements: { pdId1: pdId1, pdId2: pdId2, cursoGrupo: cursoGrupo } },
            )
        })
        .then(grupos => {
            grupos[0].forEach(function (g) {
                let newGrupo = {};
                newGrupo.nombre = g.nombre;
                newGrupo.capacidad = g.capacidad;
                newGrupo.curso = g.curso;
                newGrupo.aula = g.aula;
                newGrupo.idioma = g.idioma;
                newGrupo.ProgramacionDocenteId = res.locals.identificador;
                newGrupo.ItinerarioIdentificador = g.ItinerarioIdentificador;
                newGrupo.nombreItinerario = g.nombreItinerario;
                gruposToAnadir.push(newGrupo)
                relacionGrupos.push({ nombre: g.nombre, identificadorViejo: g.grupoId, curso: g.curso })


            })

            return models.Grupo.bulkCreate(
                gruposToAnadir
            )
        })
        .then(() => {
            return models.Grupo.findAll({
                attributes: ["grupoId", "nombre", "curso"],
                where: {
                    ProgramacionDocenteId: res.locals.identificador
                },
                raw: true
            })
                .each(function (grupoNuevo) {
                    if (cont === 0) {
                        cont = 1;
                    }

                    let grupoToActualizar = relacionGrupos.find(function (obj) { return obj.nombre+"_"+obj.curso === grupoNuevo.nombre+"_"+grupoNuevo.curso; });
                    grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
                })
        })
        .then(() => {
            cont = 0;
            return models.Asignatura.findAll({
                where: whereAsignaturas,
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.AsignacionProfesor,
                    //left join
                    required: false
                }],
                raw: true

            })
                .each(function (asignBBDD) {
                    if (cont === 0) {
                        cont = 1;
                    }
                    let cursoCambio = false;
                    //cambio de tipo es de optativa a otro tipo o al revés
                    let tipoCambio = false;
                    //cambio de semestre
                    let semestreCambio = false;
                    let hasCurso = true;
                    let hasDepartamento = true;
                    let hasSemestre = true;

                    let nuevaAsignatura = nuevasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                    let viejaAsignatura = viejasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                    let cambioAsignatura = cambioAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });


                    //asignatura que está en la api pero es la primera vez que la metemos con su primera asignación
                    if (apiAsignaturas[asignBBDD.codigo] && !nuevaAsignatura && !viejaAsignatura && !cambioAsignatura) {
                        apiAsignatura = apiAsignaturas[asignBBDD.codigo]
                        asignBBDD.anoAcademico = ano;
                        asignBBDD.nombre = apiAsignatura["nombre"]
                        apiAsignatura["nombre_ingles"] === "" ? asignBBDD.nombreIngles = asignBBDD.nombreIngles : asignBBDD.nombreIngles = apiAsignatura["nombre_ingles"];
                        asignBBDD.creditos = apiAsignatura['credects'];
                        let tipo = asignBBDD.tipo;
                        switch (apiAsignatura["codigo_tipo_asignatura"]) {
                            case "T":
                                tipo === 'opt' ? tipoCambio = true : tipoCambio = false;
                                asignBBDD.tipo = 'bas';
                                break;
                            case "B":
                                tipo === 'opt' ? tipoCambio = true : tipoCambio = false;
                                asignBBDD.tipo = 'obl';
                                break;
                            case "O":
                                tipo !== 'opt' ? tipoCambio = true : tipoCambio = false;
                                asignBBDD.tipo = 'opt';
                                break;
                            case "P":
                                asignBBDD.tipo = 'obl';
                                break;
                            default:
                                //hay un tipo E que a veces se usa para prácticas
                                asignBBDD.tipo = null;
                                break;
                        }
                        let apiDepartamentos = apiAsignatura['departamentos']
                        if (apiDepartamentos.length === 0) {
                            asignBBDD.DepartamentoResponsable = null;
                            hasDepartamento = false; //no lo uso pq tft si que la quiero y no tiene departamento
                        }
                        apiDepartamentos.forEach(function (element, index) {
                            if (element["responsable"] === "S" || element["responsable"] === "") {
                                asignBBDD.DepartamentoResponsable = element["codigo_departamento"]
                            }
                        });
                        let curso = asignBBDD.curso
                        if (apiAsignatura['curso'] === "") {
                            hasCurso = false;
                        } else {
                            curso === apiAsignatura["curso"] ? cursoCambio = false : cursoCambio = true;
                            asignBBDD.curso = apiAsignatura["curso"];
                        }
                        let semestre = asignBBDD.semestre
                        let imparticion = apiAsignatura["imparticion"];
                        if (imparticion['1S'] && imparticion['2S']) {
                            semestre === "1S-2S" ? semestreCambio = false : semestreCambio = true;
                            asignBBDD.semestre = "1S-2S"
                        } else if (imparticion['1S']) {
                            semestre === "1S" ? semestreCambio = false : semestreCambio = true;
                            asignBBDD.semestre = "1S"
                        } else if (imparticion['2S']) {
                            semestre === "2S" ? semestreCambio = false : semestreCambio = true;
                            asignBBDD.semestre = "2S"
                        } else if (imparticion['I']) {
                            semestre === "I" ? semestreCambio = false : semestreCambio = true;
                            asignBBDD.semestre = "I"
                        } else if (imparticion['A']) {
                            semestre === "A" ? semestreCambio = false : semestreCambio = true;
                            asignBBDD.semestre = "A"
                        } else {
                            asignBBDD.semestre = "";
                            hasSemestre = false;
                        }
                        let As = {}
                        As.anoAcademico = asignBBDD.anoAcademico;
                        As.codigo = asignBBDD.codigo;
                        As.nombre = asignBBDD.nombre;
                        As.nombreIngles = asignBBDD.nombreIngles;
                        As.acronimo = asignBBDD.acronimo;
                        As.curso = asignBBDD.curso;
                        As.semestre = asignBBDD.semestre;
                        As.estado = asignBBDD.estado;
                        As.tipo = asignBBDD.tipo;
                        As.creditos = asignBBDD.creditos;
                        As.cupo = asignBBDD.cupo;
                        As.fechaInicio = asignBBDD.fechaInicio;
                        As.fechaFin = asignBBDD.fechaFin;
                        As.DepartamentoResponsable = asignBBDD.DepartamentoResponsable;
                        As.CoordinadorAsignatura = asignBBDD.CoordinadorAsignatura;
                        As.ProgramacionDocenteIdentificador = res.locals.identificador;
                        As.ItinerarioIdentificador = asignBBDD.ItinerarioIdentificador;
                        As.PresidenteTribunalAsignatura = asignBBDD.PresidenteTribunalAsignatura;
                        As.VocalTribunalAsignatura = asignBBDD.VocalTribunalAsignatura;
                        As.SecretarioTribunalAsignatura = asignBBDD.SecretarioTribunalAsignatura;
                        As.SuplenteTribunalAsignatura = asignBBDD.SuplenteTribunalAsignatura;

                        if (!cursoCambio && !semestreCambio && !tipoCambio && hasCurso && hasSemestre) {
                            //no puedo meter asignaturas del primer semestre en el segundo cuando consulto una I para rellenar una 1S
                            if (tipoPD === "I" || (tipoPD === '1S' && asignBBDD.semestre !== '2S') || (tipoPD === '2S' && asignBBDD.semestre !== '1S')) {
                                //las asignaciones con profesor y horario a null las creo abajo no aqui
                                if (asignBBDD["AsignacionProfesors.ProfesorId"] || asignBBDD["AsignacionProfesors.Dia"] || asignBBDD["AsignacionProfesors.Nota"]) {
                                    let asignacion = {};
                                    let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === asignBBDD['AsignacionProfesors.GrupoId']; });
                                    if (idGrupo) {
                                        //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                                        asignacion.AsignaturaId = asignBBDD.codigo + "_a"; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                                        asignacion.GrupoId = idGrupo.identificadorNuevo;
                                        asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                                        asignacion.Dia = asignBBDD['AsignacionProfesors.Dia']
                                        asignacion.Nota = asignBBDD['AsignacionProfesors.Nota']
                                        asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio']
                                        asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion']
                                        asignacions.push(asignacion);
                                    }

                                }

                                viejasAsignaturas.push(As)
                            }

                        } else if (!hasCurso || !hasSemestre) {
                            desapareceAsignaturas.push(As);
                        } else if (cursoCambio || semestreCambio || tipoCambio) {
                            if (tipoPD === "I" || (tipoPD === '1S' && asignBBDD.semestre !== '2S') || (tipoPD === '2S' && asignBBDD.semestre !== '1S')) {
                                // Ahora mismo si una asignatura cambia en algo lo unico que sigue es el tribunal el horario y los profesores no siguen

                                cambioAsignaturas.push(As);
                            }

                        }


                    }//asignación nueva en una asignatura que ya meti
                    else if (apiAsignaturas[asignBBDD.codigo] && viejaAsignatura) {
                        if (asignBBDD["AsignacionProfesors.ProfesorId"] || asignBBDD["AsignacionProfesors.Dia"] || asignBBDD["AsignacionProfesors.Nota"]) {
                            //la asignacion es de profesor o horario
                            let asignacion = {};
                            let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === asignBBDD['AsignacionProfesors.GrupoId']; });
                            if (idGrupo) {
                                //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                                asignacion.AsignaturaId = asignBBDD.codigo + "_a"; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                                asignacion.GrupoId = idGrupo.identificadorNuevo;
                                asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                                asignacion.Dia = asignBBDD['AsignacionProfesors.Dia']
                                asignacion.Nota = asignBBDD['AsignacionProfesors.Nota']
                                asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio']
                                asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion']
                                asignacions.push(asignacion);
                            }

                        }
                    } //asignatura que cambia de cuatrimestre o curso o tipo solo meto los profesores en el primer grupo y sin repetirh y no meto horarios
                    else if (apiAsignaturas[asignBBDD.codigo] && cambioAsignatura) {
                        if (asignBBDD["AsignacionProfesors.ProfesorId"]) {
                            let asignacion = {};
                            //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                            asignacion.AsignaturaId = asignBBDD.codigo + "_a"; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                            asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                            for (let i = 0; i < relacionGrupos.length; i++) {
                                if (relacionGrupos[i].curso === Number(asignBBDD.curso)) {
                                    asignacion.GrupoId = relacionGrupos[i].identificadorNuevo;
                                    // no meto profesores repetidos
                                    let asigEsxitente = asignacions.find(function (obj) { return (obj.GrupoId === asignacion.GrupoId && obj.AsignaturaId === asignacion.AsignaturaId && obj.ProfesorId === asignacion.ProfesorId) });
                                    if (!asigEsxitente) {
                                        asignacions.push(asignacion);
                                    }
                                    break;
                                }


                            }

                        }
                    }
                    //asignatura que desaparece, no hace nada. Es pq una asignatura que desaparece puede tener muchas asignaciones
                    else {
                    }

                    //ahora debo comprobar que asignaturas son nuevas de api upm
                })
        })

        .then(function (asignaturasBBDD) {
            cont = 0

            for (let apiCodigo in apiAsignaturas) {
                let apiAsignEncontrada = apiAsignaturas[apiCodigo];
                let asignExisteBBDD = asignaturasBBDD.find(function (obj) { return obj.codigo === apiAsignEncontrada.codigo; });
                let semestre = ""
                let imparticion = apiAsignEncontrada["imparticion"];
                if (imparticion['1S'] && imparticion['2S']) {
                    semestre = "1S-2S"
                } else if (imparticion['1S']) {
                    semestre = "1S"
                } else if (imparticion['2S']) {
                    semestre = "2S"
                } else if (imparticion['I']) {
                    semestre = "I"
                } else if (imparticion['A']) {
                    semestre = "A"
                } else {
                    semestre = "";
                }
                let apiDepartamentos = apiAsignEncontrada['departamentos']
                let depResponsable = null
                if (apiDepartamentos.lenth === 0) {
                    depResponsable = null;
                }
                apiDepartamentos.forEach(function (element, index) {
                    if (element["responsable"] === "S" || element["responsable"] === "") {
                        depResponsable = element["codigo_departamento"]
                    }
                });
                // nueva asignatura a anadir. Es una asignatura si tiene curso, semestre y departamentoResponsable ¿? duda y solo cojo las asignaturas que interesan
                if (!asignExisteBBDD && apiAsignEncontrada['curso'] !== "" && semestre !== "" && (tipoPD === "I" || (tipoPD === '1S' && semestre !== '2S') || (tipoPD === '2S' && semestre !== '1S'))) {
                    let nuevaAsign = {};
                    nuevaAsign.anoAcademico = ano;
                    nuevaAsign.codigo = apiAsignEncontrada.codigo;
                    nuevaAsign.nombre = apiAsignEncontrada.nombre;
                    nuevaAsign.nombreIngles = apiAsignEncontrada["nombre_ingles"];
                    nuevaAsign.curso = apiAsignEncontrada['curso'];
                    nuevaAsign.semestre = semestre;
                    nuevaAsign.DepartamentoResponsable = depResponsable;
                    nuevaAsign.estado = "S";
                    nuevaAsign.creditos = apiAsignEncontrada['credects'];
                    nuevaAsign.ProgramacionDocenteIdentificador = res.locals.identificador;
                    switch (apiAsignEncontrada["codigo_tipo_asignatura"]) {
                        case "T":
                            nuevaAsign.tipo = 'bas';
                            break;
                        case "B":
                            nuevaAsign.tipo = 'obl';
                            break;
                        case "O":
                            nuevaAsign.tipo = 'opt';
                            break;
                        case "P":
                            nuevaAsign.tipo = 'obl';
                            break;
                        default:
                            //hay un tipo E que a veces se usa para prácticas
                            nuevaAsign.tipo = null;
                            break;
                    }
                    nuevasAsignaturas.push(nuevaAsign);
                }
            }
            let asignaturasToAnadir = [];
            asignaturasToAnadir = asignaturasToAnadir.concat(nuevasAsignaturas);
            asignaturasToAnadir = asignaturasToAnadir.concat(viejasAsignaturas);
            asignaturasToAnadir = asignaturasToAnadir.concat(cambioAsignaturas);
            return models.Asignatura.bulkCreate(
                asignaturasToAnadir
            )
        })
        .then(() => {

            return models.Asignatura.findAll({
                attributes: ["identificador", "codigo", "DepartamentoResponsable"],
                where: {
                    ProgramacionDocenteIdentificador: res.locals.identificador
                },
                raw: true
            })
                .each(function (asignaturaNueva) {
                    if (cont === 0) {
                        cont = 1;
                    }
                    //veo todos los departamentos responsables para actualizar la pd en estado tribunales y estado 
                    let index = res.locals.departamentosResponsables.indexOf(asignaturaNueva.DepartamentoResponsable)
                    if (index < 0 && asignaturaNueva.DepartamentoResponsable) {

                        res.locals.departamentosResponsables.push(asignaturaNueva.DepartamentoResponsable)
                    }
                    //actualizo los identificadores de la asignatura que antes los dejé con el código de la vieja
                    //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                    while (asignacions.find(function (obj) { return obj.AsignaturaId === asignaturaNueva.codigo + "_a"; })) {
                        let asignacionToActualizar = asignacions.find(function (obj) { return obj.AsignaturaId === asignaturaNueva.codigo + "_a"; })
                        asignacionToActualizar.AsignaturaId = asignaturaNueva.identificador;
                    }
                })
        })

        .then(() => {
            cont = 0;
            return models.AsignacionProfesor.bulkCreate(
                asignacions
            )

        })
        .then(() => {
            let pd = res.locals.identificador.split("_")[1];
            //aqui es donde tienes que meter el metodo adyacente que te comprueba si esta el director de departamento no creado o no
            promisesRoles.push(coordinadorTitulacion(pd));
            res.locals.departamentosResponsables.forEach(function (dep) {
                //aqui es donde tienes que meter el metodo adyacente que te comprueba si esta el responsableDocente creado o no
                promisesRoles.push(responsablesDocentes(dep, pd));
                //aqui es donde tienes que meter el metodo adyacente que te comprueba si esta el director de departamento no creado o no
                promisesRoles.push(directoresDepartamento(dep));


            });
            return Promise.all(promisesRoles);
        })
        .then(() => {
            next();
        })
        .catch(function (error) {
            console.log("Error:", error);
            return models.sequelize.query(query = `DELETE FROM public."ProgramacionDocentes" p  WHERE p."identificador" = :pdId1; 
            DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
            DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
            DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
            DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;`,
                { replacements: { pdId1: res.locals.identificador } },
            ).then(() => {
                next(error);
            }).catch(function (err) {
                next(err);
            })
        });

}
function responsablesDocentes(departamento, pd) {

    return models.Rol.findOrCreate(
        {
            where: { DepartamentoCodigo: departamento, PlanEstudioCodigo: pd, rol: 'ResponsableDocente' },
            defaults: { DepartamentoCodigo: departamento, PlanEstudioCodigo: pd, rol: 'ResponsableDocente' }
        }).then((user, created) => {

        })
}
function directoresDepartamento(departamento) {

    return models.Rol.findOrCreate(
        {
            where: { DepartamentoCodigo: departamento, rol: 'DirectorDepartamento' },
            defaults: { DepartamentoCodigo: departamento, PlanEstudioCodigo: null, rol: 'DirectorDepartamento' }
        }).then((user, created) => {

        })

}
function coordinadorTitulacion(pd) {

    return models.Rol.findOrCreate(
        {
            where: { PlanEstudioCodigo: pd, rol: 'CoordinadorTitulacion' },
            defaults: { DepartamentoCodigo: null, PlanEstudioCodigo: pd, rol: 'CoordinadorTitulacion' }
        }).then((user, created) => {

        })

}

//para abrir incidencia o reabierto
exports.abrirCopiaProgDoc = function (req, res, next) {
    let pdIDanterior = req.body.pdIdentificador.split("-")[1];
    let tipoPD = pdIDanterior.split("_")[3]
    let plan = pdIDanterior.split("_")[1]
    let ano = pdIDanterior.split("_")[2]
    let version = Number(pdIDanterior.split("_")[4].split("v")[1]) + 1
    let cont = 0;
    //PD_09TT_201718_1S_v1
    res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v' + version
    let pds = [];
    let nuevaPd = {};
    let s1 = false;
    let s2 = false;
    let I = false;
    //las nuevas asignaturas son o nuevas o que cambian de semestre o de curso o de itinerario o que cambian de obligatoria a optativa o al revés
    let viejasAsignaturas = [];
    let asignacions = [];
    let examens = [];
    let gruposToAnadir = [];
    let relacionGrupos = [];
    let whereAsignaturas;
    res.locals.departamentosResponsables = [];

    return models.ProgramacionDocente.findOne({
        attributes: ["identificador", "semestre", "estadoProfesores", "reabierto"],
        where: {
            identificador: pdIDanterior
        },
        raw: true
    })
        .then(function (pd) {

            whereAsignaturas = {};
            whereAsignaturas['$or'] = [];

            //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
            nuevaPd.identificador = res.locals.identificador;
            nuevaPd.version = Number(res.locals.identificador.split("_")[4].split("v")[1]);
            nuevaPd.anoAcademico = ano;
            nuevaPd.semestre = tipoPD;
            nuevaPd.estadoProGDoc = -1;
            nuevaPd.fechaProgDoc = new Date();
            nuevaPd.PlanEstudioId = plan;
            if (nuevaPd.version > 1 && pd) {
                //si la version es mayor que 1 debe haber una progdoc en la bbdd pero lo compruebo de todas formas
                nuevaPd.reabierto = pd.reabierto
            } else {
                nuevaPd.reabierto = 0;
            }
            let pdToAnadir = models.ProgramacionDocente.build(
                nuevaPd
            )
            return pdToAnadir.save()
        })
        .then(() => { // Notice: There are no arguments here, as of right now you'll have to...
            //se supone que los grupos terminan en .1 o .2 aunque sean para optativas. Si tal definir un grupo de optativas con un flag.
            return models.Grupo.findAll({
                attributes: ["nombre", "capacidad", "curso", "aula", "idioma", "grupoId", "nombreItinerario"],
                where: {
                    ProgramacionDocenteId: pdIDanterior
                },
                raw: true
            })
        })
        .then(grupos => {
            grupos.forEach(function (g) {
                let newGrupo = {};
                newGrupo.nombre = g.nombre;
                newGrupo.capacidad = g.capacidad;
                newGrupo.curso = g.curso;
                newGrupo.aula = g.aula;
                newGrupo.idioma = g.idioma;
                newGrupo.ProgramacionDocenteId = res.locals.identificador;
                newGrupo.ItinerarioIdentificador = g.ItinerarioIdentificador;
                newGrupo.nombreItinerario = g.nombreItinerario;
                gruposToAnadir.push(newGrupo)
                relacionGrupos.push({ nombre: g.nombre, identificadorViejo: g.grupoId, curso: g.curso })
            })

            return models.Grupo.bulkCreate(
                gruposToAnadir
            )
        })
        .then(() => {
            return models.Grupo.findAll({
                attributes: ["grupoId", "nombre", "curso"],
                where: {
                    ProgramacionDocenteId: res.locals.identificador,
                },
                raw: true
            })
                .each(function (grupoNuevo) {
                    if (cont === 0) {
                        cont = 1;
                    }

                    let grupoToActualizar = relacionGrupos.find(function (obj) { return obj.nombre+"_"+obj.curso === grupoNuevo.nombre+"_"+grupoNuevo.curso; });
                    grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
                })
        })
        .then(() => {
            cont = 0;
            return models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdIDanterior
                },
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.AsignacionProfesor,
                    //left join
                    required: false
                }],
                raw: true

            })
                .each(function (asignBBDD) {
                    if (cont === 0) {
                        cont = 1;
                    }

                    let viejaAsignatura = viejasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                    //asignatura que está en la api pero es la primera vez que la metemos con su primera asignación
                    if (!viejaAsignatura) {
                        let As = {}
                        As.anoAcademico = asignBBDD.anoAcademico;
                        As.codigo = asignBBDD.codigo;
                        As.nombre = asignBBDD.nombre;
                        As.nombreIngles = asignBBDD.nombreIngles;
                        As.acronimo = asignBBDD.acronimo;
                        As.curso = asignBBDD.curso;
                        As.semestre = asignBBDD.semestre;
                        As.estado = asignBBDD.estado;
                        As.tipo = asignBBDD.tipo;
                        As.creditos = asignBBDD.creditos;
                        As.cupo = asignBBDD.cupo;
                        As.fechaInicio = asignBBDD.fechaInicio;
                        As.fechaFin = asignBBDD.fechaFin;
                        As.DepartamentoResponsable = asignBBDD.DepartamentoResponsable;
                        As.CoordinadorAsignatura = asignBBDD.CoordinadorAsignatura;
                        As.ProgramacionDocenteIdentificador = res.locals.identificador;
                        As.ItinerarioIdentificador = asignBBDD.ItinerarioIdentificador;
                        As.PresidenteTribunalAsignatura = asignBBDD.PresidenteTribunalAsignatura;
                        As.VocalTribunalAsignatura = asignBBDD.VocalTribunalAsignatura;
                        As.SecretarioTribunalAsignatura = asignBBDD.SecretarioTribunalAsignatura;
                        As.SuplenteTribunalAsignatura = asignBBDD.SuplenteTribunalAsignatura;
                        viejasAsignaturas.push(As)
                    }//asignación nueva en una asignatura que ya meti

                    if (asignBBDD["AsignacionProfesors.ProfesorId"] || asignBBDD["AsignacionProfesors.Dia"] || asignBBDD["AsignacionProfesors.Nota"]) {
                        //la asignacion es de profesor o horario
                        let asignacion = {};
                        let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === asignBBDD['AsignacionProfesors.GrupoId']; });
                        if (idGrupo) {
                            //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                            //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                            asignacion.AsignaturaId = asignBBDD.codigo + "_a";
                            asignacion.GrupoId = idGrupo.identificadorNuevo;
                            asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                            asignacion.Dia = asignBBDD['AsignacionProfesors.Dia']
                            asignacion.Nota = asignBBDD['AsignacionProfesors.Nota']
                            asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio']
                            asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion']
                            asignacions.push(asignacion);
                        }

                    }

                })
        })

        .then(function (asignaturasBBDD) {
            cont = 0

            let asignaturasToAnadir = [];
            asignaturasToAnadir = asignaturasToAnadir.concat(viejasAsignaturas);
            return models.Asignatura.bulkCreate(
                asignaturasToAnadir
            )
        })

        .then(() => {
            return models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdIDanterior
                },
                attributes: ['codigo'],
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.Examen,
                    //inner join
                    required: true
                }],
                raw: true

            })
                .each(function (ex) {
                    let nuevoExamen = {};
                    nuevoExamen.fecha = ex['Examens.fecha'];
                    nuevoExamen.periodo = ex['Examens.periodo'];
                    //hago el truco de antes
                    nuevoExamen.AsignaturaIdentificador = ex['codigo'] + "_a"
                    examens.push(nuevoExamen)

                })
        })
        .then(() => {
            return models.Asignatura.findAll({
                attributes: ["identificador", "codigo", "DepartamentoResponsable"],
                where: {
                    ProgramacionDocenteIdentificador: res.locals.identificador
                },
                raw: true
            })
                .each(function (asignaturaNueva) {
                    if (cont === 0) {

                        cont = 1;
                    }
                    //veo todos los departamentos responsables para actualizar la pd en estado tribunales y estado 
                    let index = res.locals.departamentosResponsables.indexOf(asignaturaNueva.DepartamentoResponsable)
                    if (index < 0 && asignaturaNueva.DepartamentoResponsable) {
                        res.locals.departamentosResponsables.push(asignaturaNueva.DepartamentoResponsable)
                    }
                    //actualizo los identificadores de la asignatura que antes los dejé con el código de la vieja
                    //el truco de la _a es para que no se me quede nunca enganchado
                    while (asignacions.find(function (obj) { return obj.AsignaturaId === asignaturaNueva.codigo + "_a"; })) {
                        let asignacionToActualizar = asignacions.find(function (obj) { return obj.AsignaturaId === asignaturaNueva.codigo + "_a"; })
                        asignacionToActualizar.AsignaturaId = asignaturaNueva.identificador;
                    }
                    //actualizo los identificadores de la asignatura que antes los dejé con el código de la vieja
                    //el truco de la _a es para que no se me quede nunca enganchado
                    while (examens.find(function (obj) { return obj.AsignaturaIdentificador === asignaturaNueva.codigo + "_a"; })) {
                        let examenToActualizar = examens.find(function (obj) { return obj.AsignaturaIdentificador === asignaturaNueva.codigo + "_a"; })
                        examenToActualizar.AsignaturaIdentificador = asignaturaNueva.identificador;
                    }
                })
        })

        .then(() => {
            cont = 0;
            return models.AsignacionProfesor.bulkCreate(
                asignacions
            )
        })
        .then(() => {
            cont = 0;
            return models.Examen.bulkCreate(
                examens
            )
        })
        .then(() => {
            next();
        }).then(() => {
        })
        .catch(function (error) {
            console.log("Error:", error);
            return models.sequelize.query(query = `DELETE FROM public."ProgramacionDocentes" p  WHERE p."identificador" = :pdId1; 
            DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
            DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
            DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
            DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;`,
                { replacements: { pdId1: res.locals.identificador } },
            ).then(() => {
                next(error);
            }).catch(function (err) {
                next(err);
            })
        });

}


    /* es decir si una asignatura cambia de semestre o curso o itinerario se trata como una nueva. 
    Si cambia de obligatoria a optatvia se meterá en el grupo de optativa sin copiar profesores
    si cambia de optativa a obligatoria se meterá con los grupos del curso sin profesores
    */

    /*
       
    /*if del get, si está le metes todo, ves si cambia de curso, si no hay curso es que no se da 
    si cambia de curso o de tipo, o de semestre la metes en los grupos que le corresponda
    si no coges los de la programación pasada y los metes con un bulk create
    debes copiar el tribunal de la asignatura si el código no cambia
    */
    /* despues el horario te lo descargas tal cual y las filas que tengan la asignatura y la asignatura tenga el grupo las copias
    sino no.
     */

    /*
    DELETE FROM public."ProgramacionDocentes"
WHERE identificador = 'PD_09AR_201819_I_v2';
    delete  FROM public."Grupos"
WHERE "ProgramacionDocenteId" is null;
	delete  FROM public."Asignaturas"
WHERE "ProgramacionDocenteIdentificador" is null;
	delete  FROM public."AsignacionProfesors"
WHERE "GrupoId" is null;
    delete FROM public."Examens" e 
    WHERE e."AsignaturaIdentificador" is null;
    */
