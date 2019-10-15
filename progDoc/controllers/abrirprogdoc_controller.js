let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let funciones = require('../funciones');
let progDocController = require('./progDoc_controller')
let actividadParcialController = require('./actividadParcial_controller')
let apiUpmController = require('./apiUpm_controller');
let enumsPD = require('../enumsPD');
const moment = require('moment')

exports.abrirNuevaProgDoc = async function (req, res, next) {
    try {
        let tipoPD = req.body.semestre;
        let plan = req.body.plan;
        let ano = req.body.anoAcademico;
        //PD_09TT_201718_1S_v1;
        //la version puede cambiar la sacamos del pd anterior
        res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v1'
        //las pds anteriores
        let pds;
        let pdsId = [];
        let nuevaPd = {};
        //las nuevas asignaturas son o nuevas o que cambian de semestre o de curso o de itinerario o que cambian de obligatoria a optativa o al revés
        let nuevasAsignaturas = [];
        let viejasAsignaturas = [];
        //va a contener la relacion de los ids de las asignaturas viejas con los de las nuevas a través del codigo
        let viejasAsignaturas2 = [];
        let cambioAsignaturas = [];
        //en cambioAsignaturas2 solo guardas el codigo de la asignatura y los cambios que hay
        let cambioAsignaturas2 = [];
        let desapareceAsignaturas = [];
        let asignacions = [];
        let examens = [];
        let conjuntoActividadesParcial;
        let conjuntoActividadesParcGrToAnadir = [];
        let gruposToAnadir = [];
        let franjasToAnadir = [];
        let relacionGrupos = [];
        let promisesActividades = [];
        let apiAsignaturas = [];
        //las dos programaciones anteriores que se toman como referencia
        let pdId1 = "no programacion"
        let pdId2 = "no programacion"
        res.locals.departamentosResponsables = [];
        let planBBDD = res.locals.planEstudios.find(function (obj) { return obj.codigo === plan; });
        let response = await apiUpmController.getAsignaturasApiUpm(plan, ano);
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
        pds = await progDocController.getProgramacionDocentesAnteriores(plan, tipoPD, ano, null, null)
        //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
        for (pdi of pds) {
            pdsId.push(pdi.identificador)
            if (progDocController.getPlanPd(pdi.identificador) === plan && progDocController.getAnoPd(pdi.identificador) === ano
                && progDocController.getTipoPd(pdi.identificador) === tipoPD) {
                let vers = progDocController.getVersionPdNumber(pdi.identificador) + 1;
                res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v' + vers;
            }
        }
        nuevaPd.identificador = res.locals.identificador;
        nuevaPd.version = progDocController.getVersionPdNumber(res.locals.identificador)
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
        await pdToAnadir.save()
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
        let grupos = await models.sequelize.query(query = 'SELECT distinct  "nombre", g."grupoId", "curso", "capacidad", "aula", "nombreItinerario", "idioma" FROM public."Grupos" g  WHERE (g."ProgramacionDocenteId" = :pdId1 or g."ProgramacionDocenteId" = :pdId2) and g."nombre" LIKE :cursoGrupo  ORDER BY g."nombre" ASC ',
            { replacements: { pdId1: pdId1, pdId2: pdId2, cursoGrupo: cursoGrupo } },
        )
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

        await models.Grupo.bulkCreate(
            gruposToAnadir
        )
        let gruposNuevos = await models.Grupo.findAll({
            attributes: ["grupoId", "nombre", "curso"],
            where: {
                ProgramacionDocenteId: res.locals.identificador
            },
            raw: true
        })
        gruposNuevos.forEach(function (grupoNuevo) {
            let grupoToActualizar = relacionGrupos.find(function (obj) { return obj.nombre + "_" + obj.curso === grupoNuevo.nombre + "_" + grupoNuevo.curso; });
            grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
        })
        let asignsBBDD = await models.Asignatura.findAll({
            where: {
                ProgramacionDocenteIdentificador: {
                    [op.in]: pdsId
                }
            },
            include: [{
                //incluye las asignaciones de profesores y los horarios.
                model: models.AsignacionProfesor,
                //left join
                required: false
            }
            ],
            raw: true

        })
        asignsBBDD.forEach(function (asignBBDD) {
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
                    if (apiAsignatura["codigo_tipo_asignatura"] === "P" && (planBBDD["nombreCompleto"].toUpperCase().includes("MASTER") || planBBDD["nombreCompleto"].toUpperCase().includes("MÁSTER"))) {
                        asignBBDD.DepartamentoResponsable = "TFM"
                    }
                    else if (apiAsignatura["codigo_tipo_asignatura"] === "P" && planBBDD["nombreCompleto"].toUpperCase().includes("GRADO")) {
                        asignBBDD.DepartamentoResponsable = "TFG"
                    } else {
                        asignBBDD.DepartamentoResponsable = null;
                        hasDepartamento = false; //no lo uso pq las practicas si que la quiero y no tiene departamento
                    }
                }
                apiDepartamentos.forEach(function (element) {
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
                if (!cursoCambio && !semestreCambio && hasCurso && hasSemestre) {
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
                        viejasAsignaturas2.push({ codigo: As.codigo, idAnterior: asignBBDD.identificador })
                    }

                } else if (!hasCurso || !hasSemestre) {
                    desapareceAsignaturas.push(As);
                } else if (cursoCambio || semestreCambio) {
                    if (tipoPD === "I" || (tipoPD === '1S' && asignBBDD.semestre !== '2S') || (tipoPD === '2S' && asignBBDD.semestre !== '1S')) {
                        // Ahora mismo si una asignatura cambia en algo lo unico que sigue es el tribunal. Los profesores se añaden a todos los grupos. Los examenes si solo cambia el grupo no el semestre
                        //El horario no sigue.
                        cambioAsignaturas.push(As);
                        cambioAsignaturas2.push({ codigo: As.codigo, cursoCambio: cursoCambio, semestreCambio: semestreCambio, tipoCambio: tipoCambio, idAnterior: asignBBDD.identificador })
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
                let As = cambioAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; })
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
        //ahora debo comprobar que asignaturas son nuevas de api upm
        for (let apiCodigo in apiAsignaturas) {
            let apiAsignEncontrada = apiAsignaturas[apiCodigo];
            let asignExisteBBDD = asignsBBDD.find(function (obj) { return obj.codigo === apiAsignEncontrada.codigo; });
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
                //por defecto los profesores se asignan por grupo común si es una nueva asignatuar
                nuevaAsign.estado = "N";
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
        await models.Asignatura.bulkCreate(
            asignaturasToAnadir
        )
        //copio los examenes de asignaturas que no han cambiado en el año siguiente en el mismo dia desplazando los findes
        //anteriorFecha se necesita para ver si se reinicia el offset en funcion addYear2
        let anteriorFecha;
        let offsetFinde = 0;
        let exs = await models.Asignatura.findAll({
            where: {
                ProgramacionDocenteIdentificador: {
                    [op.in]: pdsId
                }
            },
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
        exs.forEach(function (ex) {
            //los examenes se copian en las asignaturas que son viejas o que cambian de año no de semestre
            let asignaturaConExamen = viejasAsignaturas.find(function (obj) { return obj.codigo === ex.codigo; }) || cambioAsignaturas2.find(function (obj) { return (obj.codigo === ex.codigo && !obj.semestreCambio) });
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
        let asignaturasNuevas = await models.Asignatura.findAll({
            attributes: ["identificador", "codigo", "DepartamentoResponsable"],
            where: {
                //de la nueva pd
                ProgramacionDocenteIdentificador: res.locals.identificador
            },
            raw: true
        })
        asignaturasNuevas.forEach(function (asignaturaNueva) {
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
            //hago el mapeo de ids en la bbddd
            let viejaAsignatura2 = viejasAsignaturas2.find(function (obj) { return obj.codigo === asignaturaNueva.codigo })
            if (viejaAsignatura2) viejaAsignatura2.idNuevo = asignaturaNueva.identificador
            let cambioAsignatura2 = cambioAsignaturas2.find(function (obj) { return obj.codigo === asignaturaNueva.codigo })
            if (cambioAsignatura2) cambioAsignatura2.idNuevo = asignaturaNueva.identificador
        })
        //hay que incluir las notas que no se asocian a ninguna asignatura sino a grupo
        let gruposBBDDIds = relacionGrupos.map(function (g) {
            return g.identificadorViejo;
        });
        let notas = await models.AsignacionProfesor.findAll({
            where: {
                AsignaturaId: { [op.eq]: null },
                GrupoId: { [op.in]: gruposBBDDIds },
                Nota: { [op.ne]: null }
            },
            raw: true
        })
        notas.forEach(function (nota) {
            let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === nota.GrupoId; });
            if (idGrupo) {
                let asignacion = {}
                asignacion.AsignaturaId = null;
                asignacion.GrupoId = idGrupo.identificadorNuevo;
                asignacion.Nota = nota.Nota
                asignacions.push(asignacion);
            }
        })
        await models.AsignacionProfesor.bulkCreate(
            asignacions
        )
        await models.Examen.bulkCreate(
            examens
        )
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
        let franjas = await models.sequelize.query(query = 'SELECT  f."horaInicio", f."duracion", f."curso", f."periodo" FROM public."FranjaExamens" f WHERE (f."ProgramacionDocenteId" = :pdId1 or f."ProgramacionDocenteId" = :pdId2) and f."periodo"::text LIKE :periodo',
            { replacements: { pdId1: pdId1, pdId2: pdId2, periodo: periodo } },
        )
        franjas[0].forEach(function (franja) {
            let franjaExamen = {}
            franjaExamen.horaInicio = franja.horaInicio
            franjaExamen.duracion = franja.duracion
            franjaExamen.curso = franja.curso
            franjaExamen.periodo = franja.periodo
            franjaExamen.ProgramacionDocenteId = res.locals.identificador
            franjasToAnadir.push(franjaExamen)
        })
        await models.FranjaExamen.bulkCreate(
            franjasToAnadir
        )
        //hay que añadir las actividades parciales
        conjuntoActividadesParcial = await actividadParcialController.getAllActividadParcial(pdsId)
        switch (tipoPD) {
            case "1S":
                conjuntoActividadesParcial = conjuntoActividadesParcial.filter(function (element) {
                    return element.semestre === '1S';
                });
                break;
            case "2S":
                conjuntoActividadesParcial = conjuntoActividadesParcial.filter(function (element) {
                    return element.semestre === '2S';
                });
                break;
            case "I":
                conjuntoActividadesParcial = conjuntoActividadesParcial.filter(function (element) {
                    return element.semestre === '1S' || element.semestre === '2S';
                });
                break;
            default:
                break;
        }
        conjuntoActividadesParcial.forEach(function (c) {
            let newConjuntoActividadParcial = {};
            newConjuntoActividadParcial.notaInicial = c.notaInicial;
            newConjuntoActividadParcial.curso = c.curso;
            newConjuntoActividadParcial.semestre = c.semestre;
            newConjuntoActividadParcial.fechaInicio = funciones.addYear(funciones.formatFecha2(c.fechaInicio))
            newConjuntoActividadParcial.fechaFin = funciones.addYear(funciones.formatFecha2(c.fechaFin))
            newConjuntoActividadParcial.ProgramacionDocenteId = nuevaPd.identificador;
            newConjuntoActividadParcial.ActividadParcials = [];
            c.actividades.forEach(function (actParcial) {
                //las actividades se copian en las asignaturas que son viejas, si cambian de curso o semestre no.
                //tambien se copian las que no eran asociadas a ninguna asignatura
                let asignaturaConActividad = viejasAsignaturas2.find(function (obj) { return obj.idAnterior === actParcial.asignaturaId; })
                if (!actParcial.asignaturaId || asignaturaConActividad) {
                    let newActividad = {}
                    newActividad.horaInicio = actParcial.horaInicio
                    newActividad.duracion = actParcial.duracion
                    newActividad.descripcion = actParcial.descripcion
                    newActividad.fecha = funciones.addYear(funciones.formatFecha2(actParcial.fecha))
                    newActividad.tipo = actParcial.tipo
                    newActividad.AsignaturaId = asignaturaConActividad ? asignaturaConActividad.idNuevo : null
                    newConjuntoActividadParcial.ActividadParcials.push(newActividad);
                }
            })
            promisesActividades.push(models.ConjuntoActividadParcial.create(
                newConjuntoActividadParcial,
                {
                    include: [
                        models.ActividadParcial
                    ]
                },
            ))
        })
        let conjuntoActividadesParcialAnadidas = await Promise.all(promisesActividades)
        //ahora hay que añadir los grupos a los conjuntoActividadParcial creadas
        conjuntoActividadesParcialAnadidas.forEach(function (conjuntoActividadParcialAnadida, index) {
            conjuntoActividadesParcial[index].grupos.forEach((g) => {
                let group = relacionGrupos.find((obj) => { return obj.identificadorViejo === g.identificador })
                if (group) conjuntoActividadesParcGrToAnadir.push(
                    { ConjuntoParcialId: conjuntoActividadParcialAnadida.identificador, GrupoId: group.identificadorNuevo })
            })
        })
        await models.ConjuntoActividadParcialGrupo.bulkCreate(
            conjuntoActividadesParcGrToAnadir
        )
        if ((viejasAsignaturas.length === 0 && nuevasAsignaturas.length === 0 && cambioAsignaturas.length === 0)) {
            let err = new Error('Error en la información de Universitas XXI, ahora mismo no puede abrir esta programación docente');
            throw err
        }
        else if ((res.locals.departamentosResponsables.length === 0)) {
            let err = new Error('Error, no hay departamentos responsables asignados a esta titulación. Puede deberse a un error en API UPM o que este plan no necesite planificación');
            throw err
        }
        else { next() }
    }
    catch (error) {
        try {
            console.log("Error:", error);
            await models.sequelize.query(query = `DELETE FROM public."ProgramacionDocentes" p  WHERE p."identificador" = :pdId1; 
            DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
            DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
            DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
            DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
            DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;
            DELETE FROM public."ConjuntoActividadParcials" c WHERE c."ProgramacionDocenteId" is null;
            DELETE FROM public."ActividadParcials" act WHERE act."ConjuntoActividadParcialId" is null;`,
                { replacements: { pdId1: res.locals.identificador } },
            )
            next(error);
        }
        catch (err) {
            next(err);
        }
    }
}
 
//para abrir incidencia o reabierto
exports.abrirCopiaProgDoc = async function (req, res, next) {
    let pdIDanterior = req.body.pdIdentificador.split("-")[1];
    let tipoPD = progDocController.getTipoPd(pdIDanterior);
    let plan = progDocController.getPlanPd(pdIDanterior)
    let ano = progDocController.getAnoPd(pdIDanterior)
    let version = progDocController.getVersionPdNumber(pdIDanterior) + 1
    //PD_09TT_201718_1S_v1
    res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v' + version
    let nuevaPd = {};
    //al abrir copia solo son asignaturas viejas no comprueba nada de la api.
    let viejasAsignaturas = [];
    //va a contener la relacion de los ids de las asignaturas viejas con los de las nuevas a través del codigo
    let viejasAsignaturas2 = [];
    let asignacions = [];
    let examens = [];
    let gruposToAnadir = [];
    let relacionGrupos = [];
    let franjasToAnadir = [];
    let conjuntoActividadesParcial;
    let conjuntoActividadesParcGrToAnadir = [];
    let promisesActividades = [];
    res.locals.departamentosResponsables = [];
    try {
        let pd = await models.ProgramacionDocente.findOne({
            attributes: ["identificador", "semestre", "estadoProfesores", "reabierto"],
            where: {
                identificador: pdIDanterior
            },
            raw: true
        })
        //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
        nuevaPd.identificador = res.locals.identificador;
        nuevaPd.version = progDocController.getVersionPdNumber(res.locals.identificador)
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
        await pdToAnadir.save()
        //se supone que los grupos terminan en .1 o .2 aunque sean para optativas. Si tal definir un grupo de optativas con un flag.
        let grupos = await models.Grupo.findAll({
            attributes: ["nombre", "capacidad", "curso", "aula", "idioma", "grupoId", "nombreItinerario"],
            where: {
                ProgramacionDocenteId: pdIDanterior
            },
            raw: true
        })
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
        await models.Grupo.bulkCreate(
            gruposToAnadir
        )
        let gruposNuevos = await models.Grupo.findAll({
            attributes: ["grupoId", "nombre", "curso"],
            where: {
                ProgramacionDocenteId: res.locals.identificador,
            },
            raw: true
        })
        gruposNuevos.forEach(function (grupoNuevo) {
            let grupoToActualizar = relacionGrupos.find(function (obj) { return obj.nombre + "_" + obj.curso === grupoNuevo.nombre + "_" + grupoNuevo.curso; });
            grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
        })
        let asignsBBDD = await models.Asignatura.findAll({
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
        asignsBBDD.forEach(function (asignBBDD) {
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
                viejasAsignaturas2.push({ codigo: As.codigo, idAnterior: asignBBDD.identificador })
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
        let asignaturasToAnadir = [];
        asignaturasToAnadir = asignaturasToAnadir.concat(viejasAsignaturas);
        await models.Asignatura.bulkCreate(
            asignaturasToAnadir
        )
        let exs = await models.Asignatura.findAll({
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
        exs.forEach(function (ex) {
            let nuevoExamen = {};
            nuevoExamen.fecha = ex['Examens.fecha'];
            nuevoExamen.periodo = ex['Examens.periodo'];
            nuevoExamen.horaInicio = ex['Examens.horaInicio']
            nuevoExamen.duracion = ex['Examens.duracion']
            //hago el truco de antes
            nuevoExamen.AsignaturaIdentificador = ex['codigo'] + "_a"
            examens.push(nuevoExamen)
        })
        let asignaturasNuevas = await models.Asignatura.findAll({
            attributes: ["identificador", "codigo", "DepartamentoResponsable"],
            where: {
                ProgramacionDocenteIdentificador: res.locals.identificador
            },
            raw: true
        })
        asignaturasNuevas.forEach(function (asignaturaNueva) {
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
            //hago el mapeo de ids en la bbddd
            let viejaAsignatura2 = viejasAsignaturas2.find(function (obj) { return obj.codigo === asignaturaNueva.codigo })
            if (viejaAsignatura2) viejaAsignatura2.idNuevo = asignaturaNueva.identificador
        })
        //hay que incluir las notas que no se asocian a ninguna asignatura sino a grupo
        let gruposBBDDIds = relacionGrupos.map(function (g) {
            return g.identificadorViejo;
        });
        let notas = await models.AsignacionProfesor.findAll({
            where: {
                AsignaturaId: { [op.eq]: null },
                GrupoId: { [op.in]: gruposBBDDIds },
                Nota: { [op.ne]: null }
            },
            raw: true
        })
        notas.forEach(function (nota) {
            let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === nota.GrupoId; });
            if (idGrupo) {
                let asignacion = {}
                asignacion.AsignaturaId = null;
                asignacion.GrupoId = idGrupo.identificadorNuevo;
                asignacion.Nota = nota.Nota
                asignacions.push(asignacion);
            }
        })
        await models.AsignacionProfesor.bulkCreate(
            asignacions
        )
        await models.Examen.bulkCreate(
            examens
        )
        let franjas = await models.FranjaExamen.findAll({
            where: {
                ProgramacionDocenteId: pdIDanterior
            },
            raw: true

        })
        franjas.forEach(function (franja) {
            let franjaExamen = {}
            franjaExamen.horaInicio = franja.horaInicio
            franjaExamen.duracion = franja.duracion
            franjaExamen.curso = franja.curso
            franjaExamen.periodo = franja.periodo
            franjaExamen.ProgramacionDocenteId = res.locals.identificador
            franjasToAnadir.push(franjaExamen)
        })
        await models.FranjaExamen.bulkCreate(
            franjasToAnadir
        )
        //hay que añadir las actividades parciales
        conjuntoActividadesParcial = await actividadParcialController.getAllActividadParcial([pdIDanterior])
        switch (tipoPD) {
            case "1S":
                conjuntoActividadesParcial = conjuntoActividadesParcial.filter(function (element) {
                    return element.semestre === '1S';
                });
                break;
            case "2S":
                conjuntoActividadesParcial = conjuntoActividadesParcial.filter(function (element) {
                    return element.semestre === '2S';
                });
                break;
            case "I":
                conjuntoActividadesParcial = conjuntoActividadesParcial.filter(function (element) {
                    return element.semestre === '1S' || element.semestre === '2S';
                });
                break;
            default:
                break;
        }
        conjuntoActividadesParcial.forEach(function (c) {
            let newConjuntoActividadParcial = {};
            newConjuntoActividadParcial.notaInicial = c.notaInicial;
            newConjuntoActividadParcial.curso = c.curso;
            newConjuntoActividadParcial.semestre = c.semestre;
            newConjuntoActividadParcial.fechaInicio = funciones.addYear(funciones.formatFecha2(c.fechaInicio))
            newConjuntoActividadParcial.fechaFin = funciones.addYear(funciones.formatFecha2(c.fechaFin))
            newConjuntoActividadParcial.ProgramacionDocenteId = nuevaPd.identificador;
            newConjuntoActividadParcial.ActividadParcials = [];
            c.actividades.forEach(function (actParcial) {
                //las actividades se copian en las asignaturas que son viejas, si cambian de curso o semestre no.
                //tambien se copian las que no eran asociadas a ninguna asignatura
                let asignaturaConActividad = viejasAsignaturas2.find(function (obj) { return obj.idAnterior === actParcial.asignaturaId; })
                if (!actParcial.asignaturaId || asignaturaConActividad) {
                    let newActividad = {}
                    newActividad.horaInicio = actParcial.horaInicio
                    newActividad.duracion = actParcial.duracion
                    newActividad.descripcion = actParcial.descripcion
                    newActividad.fecha = funciones.addYear(funciones.formatFecha2(actParcial.fecha))
                    newActividad.tipo = actParcial.tipo
                    newActividad.AsignaturaId = asignaturaConActividad ? asignaturaConActividad.idNuevo : null
                    newConjuntoActividadParcial.ActividadParcials.push(newActividad);
                }
            })
            promisesActividades.push(models.ConjuntoActividadParcial.create(
                newConjuntoActividadParcial,
                {
                    include: [
                        models.ActividadParcial
                    ]
                },
            ))
        })
        let conjuntoActividadesParcialAnadidas = await Promise.all(promisesActividades)
        //ahora hay que añadir los grupos a los conjuntoActividadParcial creadas
        conjuntoActividadesParcialAnadidas.forEach(function (conjuntoActividadParcialAnadida, index) {
            conjuntoActividadesParcial[index].grupos.forEach((g) => {
                let group = relacionGrupos.find((obj) => { return obj.identificadorViejo === g.identificador })
                if (group) conjuntoActividadesParcGrToAnadir.push(
                    { ConjuntoParcialId: conjuntoActividadParcialAnadida.identificador, GrupoId: group.identificadorNuevo })
            })
        })
        await models.ConjuntoActividadParcialGrupo.bulkCreate(
            conjuntoActividadesParcGrToAnadir
        )
        next();
    }
    catch (error) {
        try {
            console.log("Error:", error);
            await models.sequelize.query(query = `DELETE FROM public."ProgramacionDocentes" p  WHERE p."identificador" = :pdId1; 
                DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
                DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
                DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
                DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
                DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;
                DELETE FROM public."ConjuntoActividadParcials" c WHERE c."ProgramacionDocenteId" is null;
                DELETE FROM public."ActividadParcials" act WHERE act."ConjuntoActividadParcialId" is null;`,
                { replacements: { pdId1: res.locals.identificador } },
            )
            next(error);
        }
        catch (err) {
            next(err);
        }
    }
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
    delete FROM public."FranjaExamens" f
    WHERE f."ProgramacionDocenteId" is null;
    DELETE FROM public."ConjuntoActividadParcials" c 
    WHERE c."ProgramacionDocenteId" is null;
    DELETE FROM public."ActividadParcials" act 
    WHERE act."ConjuntoActividadParcialId" is null
    */
