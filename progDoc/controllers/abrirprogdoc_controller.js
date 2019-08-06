let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
const axios = require('axios');
let estados = require('../estados');
let funciones = require('../funciones');
let menuProgDocController = require('../controllers/menuProgDoc_controller')
let enumsPD = require('../enumsPD');
const moment = require('moment')



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
    //en cambioAsignaturas2 solo guardas el codigo de la asignatura y los cambios que hay
    let cambioAsignaturas2 = [];
    let desapareceAsignaturas = [];
    let asignacions = [];
    let examens = [];

    let gruposToAnadir = [];
    let franjasToAnadir = [];
    let relacionGrupos = [];
    let apiAsignaturas = [];
    let wherePdsAnteriores;
    //las dos programaciones anteriores que se toman como referencia
    let pdId1 = "no programacion"
    let pdId2 = "no programacion"

    res.locals.departamentosResponsables = [];
    let planBBDD = res.locals.planEstudios.find(function (obj) { return obj.codigo === plan; });

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

            return menuProgDocController.getProgramacionDocentesAnteriores(plan, tipoPD, ano, null, null)
        })
        .then((pdis) => {
            pds = pdis;
            wherePdsAnteriores = {};
            wherePdsAnteriores['$or'] = [];
            //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
            for (let i = 0; i < pds.length; i++) {
                wherePdsAnteriores['$or'].push({ ProgramacionDocenteIdentificador: pds[i].identificador })

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
                where: wherePdsAnteriores,
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.AsignacionProfesor,
                    //left join
                    required: false
                }
            ],
                raw: true

            })
                .each(function (asignBBDD) {
                    let cursoCambio = false;
                    //cambio de tipo es de optativa a otro tipo o al revés de momento no se utiliza
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
                        asignBBDD.creditos = funciones.convertCommaToPointDecimal(apiAsignatura['credects']);
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
                            if (apiAsignatura["codigo_tipo_asignatura"] === "P" && (planBBDD["nombreCompleto"].toUpperCase().includes("MASTER") || planBBDD["nombreCompleto"].toUpperCase().includes("MÁSTER"))){
                                asignBBDD.DepartamentoResponsable = "TFM"
                            }
                            else if(apiAsignatura["codigo_tipo_asignatura"] === "P" && planBBDD["nombreCompleto"].toUpperCase().includes("GRADO")){
                                asignBBDD.DepartamentoResponsable = "TFG"
                            }else{
                                asignBBDD.DepartamentoResponsable = null;
                                hasDepartamento = false; //no lo uso pq las practicas si que la quiero y no tiene departamento
                            }
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
                        //si  cambio el curso o el semestre se pone el estado S: los profesores se asignan por grupo, no comun
                        As.estado = asignBBDD.estado;
                        if (!cursoCambio && !semestreCambio  && hasCurso && hasSemestre) {
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
                        } else if (cursoCambio || semestreCambio) {
                            if (tipoPD === "I" || (tipoPD === '1S' && asignBBDD.semestre !== '2S') || (tipoPD === '2S' && asignBBDD.semestre !== '1S')) {
                                // Ahora mismo si una asignatura cambia en algo lo unico que sigue es el tribunal. Los profesores se añaden a todos los grupos. Los examenes si solo cambia el grupo no el semestre
                                //El horario no sigue.
                                cambioAsignaturas.push(As);
                                cambioAsignaturas2.push({codigo: As.codigo, cursoCambio: cursoCambio, semestreCambio:semestreCambio, tipoCambio: tipoCambio})
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
                        
                    } //asignatura que cambia de cuatrimestre (aunque cambie de 1S a I o 2S a I) o curso meto los profesores en todos los grupos y sin repetir y no meto horarios
                    else if (apiAsignaturas[asignBBDD.codigo] && cambioAsignatura) {
                        //necesito As para obtener la info actualizada de curso, tipo y semestre
                        let As = cambioAsignaturas.find(function (obj){return obj.codigo === asignBBDD.codigo;})
                        if (asignBBDD["AsignacionProfesors.ProfesorId"]) {
                            for (let i = 0; i < relacionGrupos.length; i++) {
                                if (relacionGrupos[i].curso === Number(As.curso)) {
                                    let asignacion = {};
                                    //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                                    asignacion.AsignaturaId = asignBBDD.codigo + "_a"; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                                    asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']      
                                    asignacion.GrupoId = relacionGrupos[i].identificadorNuevo; 
                                    // no meto profesores repetidos
                                    let asigExistente = asignacions.find(function (obj) { return (obj.GrupoId === asignacion.GrupoId && obj.AsignaturaId === asignacion.AsignaturaId && obj.ProfesorId === asignacion.ProfesorId) });
                                    if (!asigExistente) {
                                        asignacions.push(asignacion);
                                    }
                                }


                            }

                        }
                    }
                    //asignatura que desaparece, no hace nada. Es pq una asignatura que desaparece puede tener muchas asignaciones
                    else {
                    }
                })
        })
        //ahora debo comprobar que asignaturas son nuevas de api upm
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
                if (apiDepartamentos.length === 0) {
                    if (apiAsignEncontrada["codigo_tipo_asignatura"] === "P" && (planBBDD["nombreCompleto"].toUpperCase().includes("MASTER") || planBBDD["nombreCompleto"].toUpperCase().includes("MÁSTER"))) {
                        depResponsable = "TFM"
                    }
                    else if (apiAsignEncontrada["codigo_tipo_asignatura"] === "P" && planBBDD["nombreCompleto"].toUpperCase().includes("GRADO")) {
                        depResponsable = "TFG"
                    } else {
                        depResponsable = null;
                    }
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
                    //por defecto los profesores se asignan por grupo
                    nuevaAsign.estado = "S";
                    nuevaAsign.creditos = funciones.convertCommaToPointDecimal(apiAsignEncontrada['credects']);
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
            //copio los examenes de asignaturas que no han cambiado en el año siguiente en el mismo dia desplazando los findes
            //anteriorFecha se necesita para ver si se reinicia el offset en funcion addYear2
            let anteriorFecha;
            let offsetFinde = 0;
            return models.Asignatura.findAll({
                where: wherePdsAnteriores,
                include: [{
                    model: models.Examen,
                    //left join
                    required: true
                }
                ],
                order: [
                    //el orden es muy importante para llamar a addYear2 y debe ser ascendente
                    [Sequelize.literal('"Examens"."fecha"'), 'ASC'],
                ],
                raw: true

            })
                .each(function (ex) {
                    //los examenes se copian en las asignaturas que son viejas o que cambian de año no de semestre
                    let asignaturaConExamen = viejasAsignaturas.find(function (obj) { return obj.codigo === ex.codigo; }) || cambioAsignaturas2.find(function (obj) { return (obj.codigo === ex.codigo && !obj.semestreCambio )});
                    if (asignaturaConExamen) {
                        let nuevoExamen = {};
                        if (moment(funciones.formatFecha(ex['Examens.fecha']), 'DD/MM/YYYY').isValid()) {
                            //pongo el _a pq sino en el while de abajo podría quedarseme hasta el infinito
                            nuevoExamen.AsignaturaIdentificador = ex.codigo + "_a"; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                            [nuevoExamen.fecha, offsetFinde] = funciones.addYear2(ex['Examens.fecha'], anteriorFecha, offsetFinde)
                            nuevoExamen.periodo = ex['Examens.periodo'];
                            nuevoExamen.horaInicio = ex['Examens.horaInicio']
                            nuevoExamen.duracion = ex['Examens.duracion']
                            anteriorFecha = ex['Examens.fecha']
                            let cuadraExamen = false;
                            switch (tipoPD) {
                                case "1S":
                                    if (nuevoExamen.periodo === enumsPD.periodoPD.S1_E || nuevoExamen.periodo === enumsPD.periodoPD.S1_O) cuadraExamen = true;
                                    break;
                                case "2S":
                                    if (nuevoExamen.periodo === enumsPD.periodoPD.S2_E || nuevoExamen.periodo === enumsPD.periodoPD.S2_O) cuadraExamen = true;
                                    break;
                                case "I":
                                    cuadraExamen = true;
                                    break;
                                default:
                                    break;
                            }
                            if (cuadraExamen) examens.push(nuevoExamen)
                        }
                    }
                })
            }).then(() => {

            return models.Asignatura.findAll({
                attributes: ["identificador", "codigo", "DepartamentoResponsable"],
                where: {
                    //de la nueva pd
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
                    while (examens.find(function (obj) { return obj.AsignaturaIdentificador === asignaturaNueva.codigo + "_a"; })) {
                        let examenToActualizar = examens.find(function (obj) { return obj.AsignaturaIdentificador === asignaturaNueva.codigo + "_a"; })
                        examenToActualizar.AsignaturaIdentificador = asignaturaNueva.identificador;
                    }
                })
        })
        //hay que incluir las notas que no se asocian a ninguna asignatura sino a grupo
        .then(() => {
            let gruposBBDDIds = relacionGrupos.map(function (g) {
                return g.identificadorViejo;
            });
            return models.AsignacionProfesor.findAll({
                where: {
                    AsignaturaId: { [op.eq]: null },
                    GrupoId: { [op.in]: gruposBBDDIds },
                    Nota: { [op.ne]: null }
                },
                raw: true
            }).each(function (nota) {
                let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === nota.GrupoId; });
                if (idGrupo) {
                    let asignacion = {}
                    asignacion.AsignaturaId = null;
                    asignacion.GrupoId = idGrupo.identificadorNuevo;
                    asignacion.Nota = nota.Nota
                    asignacions.push(asignacion);
                }
            })
        })
        .then(() => {
            cont = 0;
            return models.AsignacionProfesor.bulkCreate(
                asignacions
            )

        }).then(() => {
            cont = 0;
            return models.Examen.bulkCreate(
                examens
            )

        })
        .then(() => {
            let periodo = '';
            switch (tipoPD) {
                case "1S":
                    periodo = '1S%'
                    break;
                case "2S":
                    periodo = '2S%'
                    break;
                case "I":
                    periodo = '%%'
                    break;
                default:
                    break;
            }
            //debo castear a text el enum para usar like
            return models.sequelize.query(query = 'SELECT  f."horaInicio", f."duracion", f."curso", f."periodo" FROM public."FranjaExamens" f WHERE (f."ProgramacionDocenteId" = :pdId1 or f."ProgramacionDocenteId" = :pdId2) and f."periodo"::text LIKE :periodo',
                { replacements: { pdId1: pdId1, pdId2: pdId2, periodo: periodo } },
            )
            .then(function (franjas) {
               franjas[0].forEach(function (franja) {
               let franjaExamen = {}
               franjaExamen.horaInicio = franja.horaInicio
               franjaExamen.duracion = franja.duracion
               franjaExamen.curso = franja.curso
               franjaExamen.periodo = franja.periodo
               franjaExamen.ProgramacionDocenteId = res.locals.identificador
               franjasToAnadir.push(franjaExamen)
               })
                return models.FranjaExamen.bulkCreate(
                    franjasToAnadir
                )
            })
        })
        .then(() => {
            if ((viejasAsignaturas.length === 0 && nuevasAsignaturas.length === 0 && cambioAsignaturas.length === 0)) {
                let err = new Error('Error en la información de Universitas XXI, ahora mismo no puede abrir esta programación docente');
                throw err
            }
            else if ((res.locals.departamentosResponsables.length === 0)) {
                let err = new Error('Error, no hay departamentos responsables asignados a esta titulación. Puede deberse a un error en API UPM o que este plan no necesite planificación');
                throw err
            }
            else { next() }
        })
        .catch(function (error) {
            console.log("Error:", error);
            return models.sequelize.query(query = `DELETE FROM public."ProgramacionDocentes" p  WHERE p."identificador" = :pdId1; 
            DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
            DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
            DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
            DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
            DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;`,
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
 
//crea el rol si no existe ya no se usa pq se hacen dinámicamente en gestion roles
function directoresDepartamento(departamento) {

    return models.Rol.findOrCreate(
        {
            where: { DepartamentoCodigo: departamento, rol: 'DirectorDepartamento' },
            defaults: { DepartamentoCodigo: departamento, PlanEstudioCodigo: null, rol: 'DirectorDepartamento' }
        }).then((user, created) => {

        })

}

//crea el rol si no existe no se usa pq se hacen dinámicamente en gestion roles
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
    //al abrir copia solo son asignaturas viejas no comprueba nada de la api.
    let viejasAsignaturas = [];
    let asignacions = [];
    let examens = [];
    let gruposToAnadir = [];
    let relacionGrupos = [];
    let franjasToAnadir = [];
    res.locals.departamentosResponsables = [];

    return models.ProgramacionDocente.findOne({
        attributes: ["identificador", "semestre", "estadoProfesores", "reabierto"],
        where: {
            identificador: pdIDanterior
        },
        raw: true
    })
        .then(function (pd) {
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
                    nuevoExamen.horaInicio = ex['Examens.horaInicio']
                    nuevoExamen.duracion = ex['Examens.duracion']
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
        //hay que incluir las notas que no se asocian a ninguna asignatura sino a grupo
        .then(()=>{
            let gruposBBDDIds = relacionGrupos.map(function (g) {
                return g.identificadorViejo;
            });
            return models.AsignacionProfesor.findAll({
                where: {
                    AsignaturaId: { [op.eq]: null },
                    GrupoId: { [op.in]: gruposBBDDIds },
                    Nota: { [op.ne]: null }
                },
                raw: true
            }).each(function (nota) {
                let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === nota.GrupoId; });
                if (idGrupo) {
                let asignacion = {}
                asignacion.AsignaturaId = null;
                asignacion.GrupoId = idGrupo.identificadorNuevo;
                asignacion.Nota = nota.Nota
                asignacions.push(asignacion);
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
            return models.FranjaExamen.findAll({
                where: {
                    ProgramacionDocenteId: pdIDanterior
                },
                raw: true

            })
                .each(function (franja) {
                    let franjaExamen = {}
                    franjaExamen.horaInicio = franja.horaInicio
                    franjaExamen.duracion = franja.duracion
                    franjaExamen.curso = franja.curso
                    franjaExamen.periodo = franja.periodo
                    franjaExamen.ProgramacionDocenteId = res.locals.identificador
                    franjasToAnadir.push(franjaExamen)
                })
                .then(function () {
                    return models.FranjaExamen.bulkCreate(
                        franjasToAnadir
                    )
                })

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
            DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
            DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;`,
                { replacements: { pdId1: res.locals.identificador } },
            ).then(() => {
                next(error);
            }).catch(function (err) {
                next(err);
            })
        });

}

exports.responsablesDocentes = responsablesDocentes;
exports.directoresDepartamento = directoresDepartamento;
exports.coordinadorTitulacion = coordinadorTitulacion;



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
     delete FROM public."FranjaExamens" f
    WHERE f."ProgramacionDocenteId" is null
    */
