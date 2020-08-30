const Sequelize = require('sequelize');
const moment = require('moment');

const models = require('../models');

const op = Sequelize.Op;
const helpers = require('../lib/helpers');
const progDocController = require('./progDoc_controller');
const departamentoController = require('./departamento_controller');
const actividadParcialController = require('./actividadParcial_controller');
const apiUpmController = require('./apiUpm_controller');
const enumsPD = require('../enumsPD');

/**
 * Función para abrir una nueva programación docente
 *  Traslada los datos de la del periodo anterior coincidente
 */
exports.abrirNuevaProgDoc = async (req, res, next) => {
  try {
    // cargar nuevos planes y departamentos en el sistema
    await apiUpmController.updatePlanesAndDeparts();
    const tipoPD = req.body.semestre;
    const { plan } = req.body;
    const ano = req.body.anoAcademico;
    // ejemplo de identificador de progdoc: PD_09TT_201718_1S_v1;
    // la versión por defecto es 1
    res.locals.identificador = `PD_${plan}_${ano}_${tipoPD}_v1`;
    // las pds anteriores
    let pds;
    const pdsId = [];
    const nuevaPd = {};
    // las nuevas asignaturas son o nuevas o que cambian de semestre o de curso
    // o de itinerario o que cambian de obligatoria a optativa o al revés
    const nuevasAsignaturas = [];
    // asignaturas que se mantienen igual
    const viejasAsignaturas = [];
    // contiene la relacion de los ids de las asignaturas viejas con los de las
    // creadas a través del codigo
    const viejasAsignaturas2 = [];
    const cambioAsignaturas = [];
    // en cambioAsignaturas2 solo guardas el codigo de la asignatura y los cambios que hay
    const cambioAsignaturas2 = [];
    // asignaturas que desaparecen
    const desapareceAsignaturas = [];
    // asignacioens de profesores, horario y notas a asignaturas
    const asignacions = [];
    const examens = [];
    // contenedor de actividades parciales y actividades parciales que incluye
    let conjuntoActividadesParcial;
    // asociación de conjuntoActividadesParcial y grupos
    const conjuntoActividadesParcGrToAnadir = [];
    const gruposToAnadir = [];
    // franjas de exámenes
    const franjasToAnadir = [];
    const relacionGrupos = [];
    const promisesActividades = [];
    // asignaturas que devuelve APIUPM para comprobar si hay cambios de asignaturas
    let apiAsignaturas = [];
    // las dos programaciones anteriores que se toman como referencia para trasladar su contenido
    let pdId1 = 'no programacion';
    let pdId2 = 'no programacion';
    // departamentos responsables que participan en la titulación
    // se utiliza el set para no guardar elementos repetidos
    const depsResponsables = new Set();
    res.locals.departamentosResponsables = [];
    const planBBDD = res.locals.planEstudios.find(obj => obj.codigo === plan);
    const response = await apiUpmController.getAsignaturasApiUpm(plan, ano);
    const departamentosBBDD = await departamentoController.getAllDepartamentos();
    apiAsignaturas = response.data;
    /* En api upm
        T: Basica
        B: Obligatoria
        O: Optativa
        P: Trabajo de fin de titulacion, tiene curso pero no departamento responsable
        Las practicas son optativas y no tienen depart responsable. pero si curso
        Las asignaturas de intercambio son como las prácticas
        Las asignaturas que no se imparten no vienen con curso asignado ni tipo
        */

    /*
        Selección de pds anteriores de referencia:

        si la pd es semestral buscas la anterior semestral de ese mismo semestre o anual.
        Pero la más reciente de ambas
        si la pd es anual buscas la anterior anual o las dos anteriores semestrales 1S y 2S,
        lo que sea más reciente.
        Se supone que no puede ocurrir 1S, I, 2S o I, 2S.
        De todas formas con el orderby se queda con la I primero así que no habrían problemas
        ya que con la I se pueden hacer todos los casos
        También es importante la forma de la clave ppal de la
        pd ya que ordenamos en funcion de ello.
        */
    // eslint-disable-next-line prefer-const
    pds = await progDocController.getProgramacionDocentesAnteriores(
      plan,
      tipoPD,
      ano,
      null,
      null
    );
    // obtener el identificador del plan y de paso preparo el where para asignaturas
    pds.forEach(pdi => {
      pdsId.push(pdi.identificador);
      if (
        progDocController.getPlanPd(pdi.identificador) === plan &&
        progDocController.getAnoPd(pdi.identificador) === ano &&
        progDocController.getTipoPd(pdi.identificador) === tipoPD
      ) {
        const vers =
          progDocController.getVersionPdNumber(pdi.identificador) + 1;
        // sino es la versión 1 aquí se actualizaría
        res.locals.identificador = `PD_${plan}_${ano}_${tipoPD}_v${vers}`;
      }
    });
    nuevaPd.identificador = res.locals.identificador;
    nuevaPd.version = progDocController.getVersionPdNumber(
      res.locals.identificador
    );
    nuevaPd.anoAcademico = ano;
    nuevaPd.semestre = tipoPD;
    // estado -1, inválido para una PROGDOC, se cambia al finalizar el proceso
    nuevaPd.estadoProGDoc = -1;
    nuevaPd.fechaProgDoc = new Date();
    nuevaPd.PlanEstudioId = plan;
    if (nuevaPd.version > 1 && pds[0]) {
      /*
            Si la version es mayor que 1 debe haber una progdoc en la bbdd pero se comprueba
            Se marca si ya ha sido reabierta con la anterior progdoc
            */
      nuevaPd.reabierto = pds[0].reabierto;
    } else {
      // no ha sido reabierta la progdoc, deja reabrirla una única vez
      nuevaPd.reabierto = 0;
    }
    const pdToAnadir = models.ProgramacionDocente.build(nuevaPd);
    // se guarda en la bbdd la nueva progdoc, pero sin contenido
    await pdToAnadir.save();
    let semestreGrupo1 = '';
    let semestreGrupo2 = '';
    // se actualizan los identificadores de la(s) progdoc que se toma(n) como referencia
    if (pds[0]) pdId1 = pds[0].identificador;
    if (pds[1]) pdId2 = pds[1].identificador;
    switch (tipoPD) {
      case '1S':
        semestreGrupo1 = '1S';
        semestreGrupo2 = '1S';
        break;
      case '2S':
        semestreGrupo1 = '2S';
        semestreGrupo2 = '2S';
        break;
      case 'I':
        semestreGrupo1 = '1S';
        semestreGrupo2 = '2S';
        break;
      default:
        break;
    }
    // obtener los grupos que deben crearse para la nueva progdoc
    const grupos = await models.sequelize.query(
      `SELECT distinct  "nombre", "grupoId", "curso", "capacidad", "aula", "nombreItinerario", "idioma", "semestre", "tipo"
      FROM public."Grupos"
      WHERE "ProgramacionDocenteId" in (:pdId1, :pdId2)
      and "semestre" in (:semestreGrupo1, :semestreGrupo2) ORDER BY "nombre" ASC `,
      { replacements: { pdId1, pdId2, semestreGrupo1, semestreGrupo2 } }
    );
    grupos[0].forEach(g => {
      const newGrupo = {};
      newGrupo.nombre = g.nombre;
      newGrupo.capacidad = g.capacidad;
      newGrupo.curso = g.curso;
      newGrupo.aula = g.aula;
      newGrupo.idioma = g.idioma;
      newGrupo.semestre = g.semestre;
      newGrupo.tipo = g.tipo;
      newGrupo.ProgramacionDocenteId = res.locals.identificador;
      newGrupo.ItinerarioIdentificador = g.ItinerarioIdentificador;
      newGrupo.nombreItinerario = g.nombreItinerario;
      gruposToAnadir.push(newGrupo);
      relacionGrupos.push({
        nombre: g.nombre,
        identificadorViejo: g.grupoId,
        curso: g.curso
      });
    });

    await models.Grupo.bulkCreate(gruposToAnadir);
    // obtener los identificadores de los grupos que se acaban de crear
    const gruposNuevos = await models.Grupo.findAll({
      attributes: ['grupoId', 'nombre', 'curso'],
      where: {
        ProgramacionDocenteId: res.locals.identificador
      },
      raw: true
    });
    gruposNuevos.forEach(grupoNuevo => {
      const grupoToActualizar = relacionGrupos.find(
        obj =>
          `${obj.nombre}_${obj.curso}` ===
          `${grupoNuevo.nombre}_${grupoNuevo.curso}`
      );
      grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
    });
    // obtener las asignaturas de las progdocs anteriores que se toman como base
    const asignsBBDD = await models.Asignatura.findAll({
      where: {
        ProgramacionDocenteIdentificador: {
          [op.in]: pdsId
        }
      },
      include: [
        {
          // incluye las asignaciones de profesores y los horarios.
          model: models.AsignacionProfesor,
          // left join
          required: false
        }
      ],
      raw: true
    });
    // se recorren las asignaciones para rellenar así las asignaturas, asignaciones y horarios
    asignsBBDD.forEach(asignDatabase => {
      const asignBBDD = asignDatabase;
      // asignatura que cambio de curso
      let cursoCambio = false;
      // cambio de tipo es de optativa a otro tipo. Al revés de momento no se utiliza
      let tipoCambio = false;
      // cambio de semestre
      let semestreCambio = false;
      // flags que se usan para marcar lo que devuelve api upm
      let hasCurso = true;
      let hasSemestre = true;
      const nuevaAsignatura = nuevasAsignaturas.find(
        obj => obj.codigo === asignBBDD.codigo
      );
      const viejaAsignatura = viejasAsignaturas.find(
        obj => obj.codigo === asignBBDD.codigo
      );
      const cambioAsignatura = cambioAsignaturas.find(
        obj => obj.codigo === asignBBDD.codigo
      );
      // asignatura que está en la api pero es la primera vez que aparece en el bucle. Se debe crear
      if (
        apiAsignaturas[asignBBDD.codigo] &&
        !nuevaAsignatura &&
        !viejaAsignatura &&
        !cambioAsignatura
      ) {
        const apiAsignatura = apiAsignaturas[asignBBDD.codigo];
        asignBBDD.anoAcademico = ano;
        asignBBDD.nombre = apiAsignatura.nombre;
        if (apiAsignatura.nombre_ingles !== '')
          asignBBDD.nombreIngles = apiAsignatura.nombre_ingles;
        // api upm a veces los créditos los separa con puntos y a veces con comas
        asignBBDD.creditos = helpers.convertCommaToPointDecimal(
          apiAsignatura.credects
        );
        const { tipo } = asignBBDD;
        switch (apiAsignatura.codigo_tipo_asignatura) {
          case 'T':
            tipoCambio = tipo === 'opt';
            asignBBDD.tipo = 'bas';
            break;
          case 'B':
            tipoCambio = tipo === 'opt';
            asignBBDD.tipo = 'obl';
            break;
          case 'O':
            tipoCambio = tipo !== 'opt';
            asignBBDD.tipo = 'opt';
            break;
          case 'P':
            asignBBDD.tipo = 'obl';
            break;
          default:
            // hay un tipo E que a veces se usa para prácticas
            asignBBDD.tipo = null;
            break;
        }
        const apiDepartamentos = apiAsignatura.departamentos;
        // el departamento responsable debe existir en el sistema
        asignBBDD.DepartamentoResponsable = apiUpmController.addDepartamentoResponsable(
          apiDepartamentos,
          departamentosBBDD,
          planBBDD.nombreCompleto,
          apiAsignatura.codigo_tipo_asignatura
        );
        const { curso } = asignBBDD;
        if (apiAsignatura.curso === '') {
          hasCurso = false;
        } else {
          cursoCambio = curso !== apiAsignatura.curso;
          asignBBDD.curso = apiAsignatura.curso;
        }
        const { semestre } = asignBBDD;
        const { imparticion } = apiAsignatura;
        if (imparticion['1S'] && imparticion['2S']) {
          semestreCambio = semestre !== '1S-2S';
          asignBBDD.semestre = '1S-2S';
        } else if (imparticion['1S']) {
          semestreCambio = semestre !== '1S';
          asignBBDD.semestre = '1S';
        } else if (imparticion['2S']) {
          semestreCambio = semestre !== '2S';
          asignBBDD.semestre = '2S';
        } else if (imparticion.I) {
          semestreCambio = semestre !== 'I';
          asignBBDD.semestre = 'I';
        } else if (imparticion.A) {
          semestreCambio = semestre !== 'A';
          asignBBDD.semestre = 'A';
        } else {
          asignBBDD.semestre = '';
          hasSemestre = false;
        }
        const As = {};
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
        As.PresidenteTribunalAsignatura =
          asignBBDD.PresidenteTribunalAsignatura;
        As.VocalTribunalAsignatura = asignBBDD.VocalTribunalAsignatura;
        As.SecretarioTribunalAsignatura =
          asignBBDD.SecretarioTribunalAsignatura;
        As.SuplenteTribunalAsignatura = asignBBDD.SuplenteTribunalAsignatura;
        /*
          estado: S los profesores se asignan por grupo;
          N los profesores se asignan en común para todos los grupos.
          Si cambio el curso o el semestre se pone el estado
          S: los profesores se asignan por grupo, no comun
          */
        As.estado = asignBBDD.estado;
        if (!cursoCambio && !semestreCambio && hasCurso && hasSemestre) {
          /*
              Caso especial: Consulto una progdoc I para rellenar una 1S o 2S
              No se pueden meter asignaturas del primer semestre en el segundo y al revés
              */
          if (
            tipoPD === 'I' ||
            (tipoPD === '1S' && asignBBDD.semestre !== '2S') ||
            (tipoPD === '2S' && asignBBDD.semestre !== '1S')
          ) {
            // asignaciones con profesor o horario o asignatura (nota de asignatura)
            if (
              asignBBDD['AsignacionProfesors.ProfesorId'] ||
              asignBBDD['AsignacionProfesors.Dia'] ||
              asignBBDD['AsignacionProfesors.Nota']
            ) {
              const asignacion = {};
              const idGrupo = relacionGrupos.find(
                obj =>
                  obj.identificadorViejo ===
                  asignBBDD['AsignacionProfesors.GrupoId']
              );
              if (idGrupo) {
                /*
                Este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo.
                El código de la asignatura sirve para poder relacionar la asignatura
                de la progdoc referencia y la nueva.
                El código de la asignatura es invariante en apiUPM.
                El _a pq sino en el while de abajo podría quedarse enganchado
                si concide AsignaturaId con algún código.
                */
                asignacion.AsignaturaId = `${asignBBDD.codigo}_a`;
                asignacion.GrupoId = idGrupo.identificadorNuevo;
                asignacion.ProfesorId =
                  asignBBDD['AsignacionProfesors.ProfesorId'];
                asignacion.Dia = asignBBDD['AsignacionProfesors.Dia'];
                asignacion.Nota = asignBBDD['AsignacionProfesors.Nota'];
                asignacion.HoraInicio =
                  asignBBDD['AsignacionProfesors.HoraInicio'];
                asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion'];
                asignacions.push(asignacion);
              }
            }
            // se añade la asignatura a asignaturas viejas
            viejasAsignaturas.push(As);
            // relación de la asignatura vieja y la de referencia de apiupm
            viejasAsignaturas2.push({
              codigo: As.codigo,
              idAnterior: asignBBDD.identificador
            });
          }
        } else if (!hasCurso || !hasSemestre) {
          desapareceAsignaturas.push(As);
        } else if (cursoCambio || semestreCambio) {
          if (
            tipoPD === 'I' ||
            (tipoPD === '1S' && asignBBDD.semestre !== '2S') ||
            (tipoPD === '2S' && asignBBDD.semestre !== '1S')
          ) {
            /*
                              Si una asignatura cambia en algo:
                              Sigue es el tribunal.
                              Los profesores se añaden a todos los grupos.
                              Los examenes siguen si cambia el curso no el semestre
                              El horario no sigue.
                              */
            cambioAsignaturas.push(As);
            cambioAsignaturas2.push({
              codigo: As.codigo,
              cursoCambio,
              semestreCambio,
              tipoCambio,
              idAnterior: asignBBDD.identificador
            });
          }
        }
      } else if (apiAsignaturas[asignBBDD.codigo] && viejaAsignatura) {
        // asignación nueva en una asignatura vieja
        // TODO: cambiar else if para no repetir código con lo de arriba que también crea asignación
        if (
          asignBBDD['AsignacionProfesors.ProfesorId'] ||
          asignBBDD['AsignacionProfesors.Dia'] ||
          asignBBDD['AsignacionProfesors.Nota']
        ) {
          // asignaciones con profesor o horario o asignatura (nota de asignatura)
          const asignacion = {};
          const idGrupo = relacionGrupos.find(
            obj =>
              obj.identificadorViejo ===
              asignBBDD['AsignacionProfesors.GrupoId']
          );
          if (idGrupo) {
            /* El _a pq sino en el while de abajo podría engancharse
            si concide AsignaturaId con algún código.
            */
            asignacion.AsignaturaId = `${asignBBDD.codigo}_a`;
            asignacion.GrupoId = idGrupo.identificadorNuevo;
            asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId'];
            asignacion.Dia = asignBBDD['AsignacionProfesors.Dia'];
            asignacion.Nota = asignBBDD['AsignacionProfesors.Nota'];
            asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio'];
            asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion'];
            asignacions.push(asignacion);
          }
        }
      } else if (apiAsignaturas[asignBBDD.codigo] && cambioAsignatura) {
        /*
        Si una asignatura cambia en algo:
        Sigue es el tribunal.
        Los profesores se añaden a todos los grupos.
        Los examenes siguen si cambia el curso no el semestre
        El horario no sigue.
        */
        // As para obtener la info actualizada de curso, tipo y semestre
        const As = cambioAsignaturas.find(
          obj => obj.codigo === asignBBDD.codigo
        );
        if (asignBBDD['AsignacionProfesors.ProfesorId']) {
          for (let i = 0; i < relacionGrupos.length; i += 1) {
            if (relacionGrupos[i].curso === Number(As.curso)) {
              const asignacion = {};
              /*
              El _a pq sino en el while de abajo podría quedarse enganchado
              si concide AsignaturaId con algún código.
              */
              asignacion.AsignaturaId = `${asignBBDD.codigo}_a`;
              asignacion.ProfesorId =
                asignBBDD['AsignacionProfesors.ProfesorId'];
              asignacion.GrupoId = relacionGrupos[i].identificadorNuevo;
              // no se añaden profesores repetidos
              const asigExistente = asignacions.find(
                obj =>
                  obj.GrupoId === asignacion.GrupoId &&
                  obj.AsignaturaId === asignacion.AsignaturaId &&
                  obj.ProfesorId === asignacion.ProfesorId
              );
              if (!asigExistente) {
                asignacions.push(asignacion);
              }
            }
          }
        }
      } else {
        // asignatura que desaparece, no hace nada.
      }
    });
    /* ahora debe comprobar que asignaturas son nuevas de api upm
    (no estaban en el bucle asignsBBDD )
    */
    for (const apiCodigo in apiAsignaturas) {
      if (Object.prototype.hasOwnProperty.call(apiAsignaturas, apiCodigo)) {
        const apiAsignEncontrada = apiAsignaturas[apiCodigo];
        const asignExisteBBDD = asignsBBDD.find(
          obj => obj.codigo === apiAsignEncontrada.codigo
        );
        let semestre = '';
        const { imparticion } = apiAsignEncontrada;
        if (imparticion['1S'] && imparticion['2S']) {
          semestre = '1S-2S';
        } else if (imparticion['1S']) {
          semestre = '1S';
        } else if (imparticion['2S']) {
          semestre = '2S';
        } else if (imparticion.I) {
          semestre = 'I';
        } else if (imparticion.A) {
          semestre = 'A';
        } else {
          semestre = '';
        }
        const apiDepartamentos = apiAsignEncontrada.departamentos;
        // el departamento responsable debe existir en el sistema
        const depResponsable = apiUpmController.addDepartamentoResponsable(
          apiDepartamentos,
          departamentosBBDD,
          planBBDD.nombreCompleto,
          apiAsignEncontrada.codigo_tipo_asignatura
        );
        // nueva asignatura a anadir.
        // Es una asignatura si tiene curso, semestre y departamentoResponsable
        if (
          !asignExisteBBDD &&
          apiAsignEncontrada.curso !== '' &&
          semestre !== '' &&
          (tipoPD === 'I' ||
            (tipoPD === '1S' && semestre !== '2S') ||
            (tipoPD === '2S' && semestre !== '1S'))
        ) {
          const nuevaAsign = {};
          nuevaAsign.anoAcademico = ano;
          nuevaAsign.codigo = apiAsignEncontrada.codigo;
          nuevaAsign.nombre = apiAsignEncontrada.nombre;
          nuevaAsign.nombreIngles = apiAsignEncontrada.nombre_ingles;
          nuevaAsign.curso = apiAsignEncontrada.curso;
          nuevaAsign.semestre = semestre;
          nuevaAsign.DepartamentoResponsable = depResponsable;
          // por defecto los profesores se asignan común
          // (los mismos para todos los grupos) si es una nueva asignatura
          nuevaAsign.estado = 'N';
          nuevaAsign.creditos = helpers.convertCommaToPointDecimal(
            apiAsignEncontrada.credects
          );
          nuevaAsign.ProgramacionDocenteIdentificador =
            res.locals.identificador;
          switch (apiAsignEncontrada.codigo_tipo_asignatura) {
            case 'T':
              nuevaAsign.tipo = 'bas';
              break;
            case 'B':
              nuevaAsign.tipo = 'obl';
              break;
            case 'O':
              nuevaAsign.tipo = 'opt';
              break;
            case 'P':
              nuevaAsign.tipo = 'obl';
              break;
            default:
              // hay un tipo E que a veces se usa para prácticas
              nuevaAsign.tipo = null;
              break;
          }
          nuevasAsignaturas.push(nuevaAsign);
        }
      }
    }
    let asignaturasToAnadir = [];
    asignaturasToAnadir = asignaturasToAnadir.concat(nuevasAsignaturas);
    asignaturasToAnadir = asignaturasToAnadir.concat(viejasAsignaturas);
    asignaturasToAnadir = asignaturasToAnadir.concat(cambioAsignaturas);
    await models.Asignatura.bulkCreate(asignaturasToAnadir);
    /*
         Copia de examenes de asignaturas viejas o que no han cambiado el semestre.
         Se copia en el año siguiente en el mismo día desplazando los findes
         anteriorFecha se necesita para ver si se reinicia el offset en funcion addYear2
         offsetFinde es un parámetro que se usa en la función addYear2
         */
    let anteriorFecha;
    let offsetFinde = 0;
    const exs = await models.Asignatura.findAll({
      where: {
        ProgramacionDocenteIdentificador: {
          [op.in]: pdsId
        }
      },
      include: [
        {
          model: models.Examen,
          // left join
          required: true
        }
      ],
      order: [
        // el orden es muy importante para llamar a addYear2 y debe ser ascendente
        [Sequelize.literal('"Examens"."fecha"'), 'ASC']
      ],
      raw: true
    });
    exs.forEach(ex => {
      /*
      los examenes se copian en las asignaturas que son viejas
      o que cambian de año no de semestre
      */
      const asignaturaConExamen =
        viejasAsignaturas.find(obj => obj.codigo === ex.codigo) ||
        cambioAsignaturas2.find(
          obj => obj.codigo === ex.codigo && !obj.semestreCambio
        );
      if (asignaturaConExamen) {
        const nuevoExamen = {};
        if (
          moment(
            helpers.formatFecha(ex['Examens.fecha']),
            'DD/MM/YYYY'
          ).isValid()
        ) {
          /*
          El _a pq sino en el while de abajo podría quedarse enganchado
          si concide AsignaturaId con algún código.
          */
          nuevoExamen.AsignaturaIdentificador = `${ex.codigo}_a`;
          [nuevoExamen.fecha, offsetFinde] = helpers.addYear2(
            ex['Examens.fecha'],
            anteriorFecha,
            offsetFinde
          );
          nuevoExamen.periodo = ex['Examens.periodo'];
          nuevoExamen.horaInicio = ex['Examens.horaInicio'];
          nuevoExamen.duracion = ex['Examens.duracion'];
          anteriorFecha = ex['Examens.fecha'];
          /*
                    Caso especial: Consulto una progdoc I para rellenar una 1S o 2S
                    No se pueden meter exámenes del primer semestre en el segundo y al revés
                    */
          let cuadraExamen = false;
          switch (tipoPD) {
            case '1S':
              if (
                nuevoExamen.periodo === enumsPD.periodoPD.S1_E ||
                nuevoExamen.periodo === enumsPD.periodoPD.S1_O
              )
                cuadraExamen = true;
              break;
            case '2S':
              if (
                nuevoExamen.periodo === enumsPD.periodoPD.S2_E ||
                nuevoExamen.periodo === enumsPD.periodoPD.S2_O
              )
                cuadraExamen = true;
              break;
            case 'I':
              cuadraExamen = true;
              break;
            default:
              break;
          }
          if (cuadraExamen) examens.push(nuevoExamen);
        }
      }
    });
    const asignaturasNuevas = await models.Asignatura.findAll({
      attributes: ['identificador', 'codigo', 'DepartamentoResponsable'],
      where: {
        // de la nueva pd
        ProgramacionDocenteIdentificador: res.locals.identificador
      },
      raw: true
    });
    asignaturasNuevas.forEach(asignaturaNueva => {
      // actualizar los departamentos responsables que participan en la titulación
      // deben estar en el sistmea
      if (
        departamentosBBDD.find(
          dep => dep.codigo === asignaturaNueva.DepartamentoResponsable
        )
      ) {
        depsResponsables.add(asignaturaNueva.DepartamentoResponsable);
      }
      /*
      actualizar los identificadores de la asignatura que antes se pusieron con el código+_a
      El _a pq sino en el while de abajo podría quedarse enganchado
      si concide AsignaturaId con algún código.
      */
      while (
        asignacions.find(
          obj => obj.AsignaturaId === `${asignaturaNueva.codigo}_a`
        )
      ) {
        const asignacionToActualizar = asignacions.find(
          obj => obj.AsignaturaId === `${asignaturaNueva.codigo}_a`
        );
        asignacionToActualizar.AsignaturaId = asignaturaNueva.identificador;
      }
      while (
        examens.find(
          obj => obj.AsignaturaIdentificador === `${asignaturaNueva.codigo}_a`
        )
      ) {
        const examenToActualizar = examens.find(
          obj => obj.AsignaturaIdentificador === `${asignaturaNueva.codigo}_a`
        );
        examenToActualizar.AsignaturaIdentificador =
          asignaturaNueva.identificador;
      }
      // mapeo de ids en la bbddd de la anterior versión y la actual
      const viejaAsignatura2 = viejasAsignaturas2.find(
        obj => obj.codigo === asignaturaNueva.codigo
      );
      if (viejaAsignatura2)
        viejaAsignatura2.idNuevo = asignaturaNueva.identificador;
      const cambioAsignatura2 = cambioAsignaturas2.find(
        obj => obj.codigo === asignaturaNueva.codigo
      );
      if (cambioAsignatura2)
        cambioAsignatura2.idNuevo = asignaturaNueva.identificador;
    });
    res.locals.departamentosResponsables = [...depsResponsables];
    /*
        Hay que incluir asignaciones sin profesor ni horario ni asignatura:
        Se corresponde a notas que no se asocian a ninguna asignatura sino a grupo
        */
    const gruposBBDDIds = relacionGrupos.map(g => g.identificadorViejo);
    const notas = await models.AsignacionProfesor.findAll({
      where: {
        AsignaturaId: { [op.eq]: null },
        GrupoId: { [op.in]: gruposBBDDIds },
        Nota: { [op.ne]: null }
      },
      raw: true
    });
    notas.forEach(nota => {
      const idGrupo = relacionGrupos.find(
        obj => obj.identificadorViejo === nota.GrupoId
      );
      if (idGrupo) {
        const asignacion = {};
        asignacion.AsignaturaId = null;
        asignacion.GrupoId = idGrupo.identificadorNuevo;
        asignacion.Nota = nota.Nota;
        asignacions.push(asignacion);
      }
    });
    await models.AsignacionProfesor.bulkCreate(asignacions);
    await models.Examen.bulkCreate(examens);
    let periodo = '';
    switch (tipoPD) {
      case '1S':
        periodo = '1S%';
        break;
      case '2S':
        periodo = '2S%';
        break;
      case 'I':
        periodo = '%%';
        break;
      default:
        break;
    }
    /*
        castear a text el enum para usar like
        copiar las franjas de exámenes
        */
    const franjas = await models.sequelize.query(
      `SELECT  f."horaInicio", f."duracion", f."curso",
      f."periodo" FROM public."FranjaExamens" f
      WHERE (f."ProgramacionDocenteId" = :pdId1 or f."ProgramacionDocenteId" = :pdId2) and f."periodo"::text LIKE :periodo`,
      { replacements: { pdId1, pdId2, periodo } }
    );
    franjas[0].forEach(franja => {
      const franjaExamen = {};
      franjaExamen.horaInicio = franja.horaInicio;
      franjaExamen.duracion = franja.duracion;
      franjaExamen.curso = franja.curso;
      franjaExamen.periodo = franja.periodo;
      franjaExamen.ProgramacionDocenteId = res.locals.identificador;
      franjasToAnadir.push(franjaExamen);
    });
    await models.FranjaExamen.bulkCreate(franjasToAnadir);
    /*
    actividades parciales
    conjuntoActividadesParcial contiene los contenedoresde actividades parciales
    (conjuntoActividadesParcial) también contiene las actividades parciales
    asociadas a cada contenedor de actividades parciales.
        */
    conjuntoActividadesParcial = await actividadParcialController.getAllActividadParcial(
      pdsId
    );
    switch (tipoPD) {
      case '1S':
        conjuntoActividadesParcial = conjuntoActividadesParcial.filter(
          element => element.semestre === '1S'
        );
        break;
      case '2S':
        conjuntoActividadesParcial = conjuntoActividadesParcial.filter(
          element => element.semestre === '2S'
        );
        break;
      case 'I':
        conjuntoActividadesParcial = conjuntoActividadesParcial.filter(
          element => element.semestre === '1S' || element.semestre === '2S'
        );
        break;
      default:
        break;
    }
    // bucle para cada contenedor de actividades parciales.
    conjuntoActividadesParcial.forEach(c => {
      const newConjuntoActividadParcial = {};
      newConjuntoActividadParcial.notaInicial = c.notaInicial;
      newConjuntoActividadParcial.curso = c.curso;
      newConjuntoActividadParcial.semestre = c.semestre;
      // se le añade un año a la fecha que se toma como referencia
      newConjuntoActividadParcial.fechaInicio = helpers.addYear(
        helpers.formatFecha2(c.fechaInicio)
      );
      newConjuntoActividadParcial.fechaFin = helpers.addYear(
        helpers.formatFecha2(c.fechaFin)
      );
      newConjuntoActividadParcial.ProgramacionDocenteId = nuevaPd.identificador;
      newConjuntoActividadParcial.ActividadParcials = [];
      c.actividades.forEach(actParcial => {
        // las actividades se copian en las asignaturas que son viejas,
        // si cambian de curso o semestre no.
        // tambien se copian las que no eran asociadas a ninguna asignatura
        const asignaturaConActividad = viejasAsignaturas2.find(
          obj => obj.idAnterior === actParcial.asignaturaId
        );
        if (!actParcial.asignaturaId || asignaturaConActividad) {
          const newActividad = {};
          newActividad.horaInicio = actParcial.horaInicio;
          newActividad.duracion = actParcial.duracion;
          newActividad.descripcion = actParcial.descripcion;
          // añade un año a la fecha del año anterior
          newActividad.fecha = helpers.addYear(
            helpers.formatFecha2(actParcial.fecha)
          );
          newActividad.tipo = actParcial.tipo;
          newActividad.AsignaturaId = asignaturaConActividad
            ? asignaturaConActividad.idNuevo
            : null;
          newConjuntoActividadParcial.ActividadParcials.push(newActividad);
        }
      });
      promisesActividades.push(
        models.ConjuntoActividadParcial.create(newConjuntoActividadParcial, {
          include: [models.ActividadParcial]
        })
      );
    });
    const conjuntoActividadesParcialAnadidas = await Promise.all(
      promisesActividades
    );
    // añadir los grupos a los contenedores de actividades parciales
    // (conjuntoActividadParcial) creadas
    conjuntoActividadesParcialAnadidas.forEach(
      (conjuntoActividadParcialAnadida, index) => {
        // no tienen porqué tener grupo asociado
        conjuntoActividadesParcial[index].grupos.forEach(g => {
          const group = relacionGrupos.find(
            obj => obj.identificadorViejo === g.identificador
          );
          if (group) {
            conjuntoActividadesParcGrToAnadir.push({
              ConjuntoParcialId: conjuntoActividadParcialAnadida.identificador,
              GrupoId: group.identificadorNuevo
            });
          }
        });
      }
    );
    await models.ConjuntoActividadParcialGrupo.bulkCreate(
      conjuntoActividadesParcGrToAnadir
    );
    if (
      viejasAsignaturas.length === 0 &&
      nuevasAsignaturas.length === 0 &&
      cambioAsignaturas.length === 0
    ) {
      const err = new Error(
        'Error en la información de Universitas XXI, ahora mismo no puede abrir esta programación docente'
      );
      throw err;
    } else if (res.locals.departamentosResponsables.length === 0) {
      const err = new Error(
        'Error, no hay departamentos responsables asignados a esta titulación. Puede deberse a un error en API UPM o que este plan no necesite planificación'
      );
      throw err;
    } else {
      next();
    }
  } catch (error) {
    try {
      // si se produce un error en el proceso se borra todo el progreso que se hizo
      // TODO hacerlo con transacciones
      console.error('Error:', error);
      await progDocController.borrarPd(res.locals.identificador);
      next(error);
    } catch (err) {
      next(err);
    }
  }
};

/*
Función para abrir incidencia o reabierto.
Abrir copia de progdoc
No traslada fechas al año siguiente
*/
exports.abrirCopiaProgDoc = async (req, res, next) => {
  const pdIDanterior = req.body.pdIdentificador.split('-')[1];
  const tipoPD = progDocController.getTipoPd(pdIDanterior);
  const plan = progDocController.getPlanPd(pdIDanterior);
  const ano = progDocController.getAnoPd(pdIDanterior);
  const version = progDocController.getVersionPdNumber(pdIDanterior) + 1;
  // ejemplo de identificador de progdoc: PD_09TT_201718_1S_v1;
  // la versión será la de referencia +1
  res.locals.identificador = `PD_${plan}_${ano}_${tipoPD}_v${version}`;
  const nuevaPd = {};
  // al abrir copia solo son asignaturas viejas no comprueba nada de la api.
  const viejasAsignaturas = [];
  /*
  contiene la relación de los ids de las asignaturas viejas con los de las creadas
  a través del codigo
  */
  const viejasAsignaturas2 = [];
  // asignacioens de profesores, horario y notas a asignaturas
  const asignacions = [];
  const examens = [];
  const gruposToAnadir = [];
  const relacionGrupos = [];
  const franjasToAnadir = [];
  // contenedor de actividades parciales y actividades parciales que incluye
  let conjuntoActividadesParcial;
  // asociación de conjuntoActividadesParcial y grupos
  const conjuntoActividadesParcGrToAnadir = [];
  const promisesActividades = [];
  // departamentos responsables del plan
  // se utiliza el set para no guardar elementos repetidos
  const depsResponsables = new Set();
  res.locals.departamentosResponsables = [];
  try {
    const departamentosBBDD = await departamentoController.getAllDepartamentos();
    const pd = await models.ProgramacionDocente.findOne({
      attributes: [
        'identificador',
        'semestre',
        'estadoProfesores',
        'reabierto'
      ],
      where: {
        identificador: pdIDanterior
      },
      raw: true
    });
    // voy a obtener el identificador del plan y de paso preparo el where para asignaturas
    nuevaPd.identificador = res.locals.identificador;
    nuevaPd.version = progDocController.getVersionPdNumber(
      res.locals.identificador
    );
    nuevaPd.anoAcademico = ano;
    nuevaPd.semestre = tipoPD;
    // estado -1, inválido para una PROGDOC, se cambia al finalizar el proceso
    nuevaPd.estadoProGDoc = -1;
    nuevaPd.fechaProgDoc = new Date();
    nuevaPd.PlanEstudioId = plan;
    if (nuevaPd.version > 1 && pd) {
      /*
      si la version es mayor que 1 debe haber una progdoc en la bbdd
      pero se comprueba de todas formas
      */
      nuevaPd.reabierto = pd.reabierto;
    } else {
      nuevaPd.reabierto = 0;
    }
    const pdToAnadir = models.ProgramacionDocente.build(nuevaPd);
    // se guarda en la bbdd la nueva progdoc, pero sin contenido
    await pdToAnadir.save();
    const grupos = await models.Grupo.findAll({
      attributes: [
        'nombre',
        'capacidad',
        'curso',
        'aula',
        'idioma',
        'semestre',
        'tipo',
        'grupoId',
        'nombreItinerario'
      ],
      where: {
        ProgramacionDocenteId: pdIDanterior
      },
      raw: true
    });
    grupos.forEach(g => {
      const newGrupo = {};
      newGrupo.nombre = g.nombre;
      newGrupo.capacidad = g.capacidad;
      newGrupo.curso = g.curso;
      newGrupo.aula = g.aula;
      newGrupo.idioma = g.idioma;
      newGrupo.semestre = g.semestre;
      newGrupo.tipo = g.tipo;
      newGrupo.ProgramacionDocenteId = res.locals.identificador;
      newGrupo.ItinerarioIdentificador = g.ItinerarioIdentificador;
      newGrupo.nombreItinerario = g.nombreItinerario;
      gruposToAnadir.push(newGrupo);
      relacionGrupos.push({
        nombre: g.nombre,
        identificadorViejo: g.grupoId,
        curso: g.curso
      });
    });
    await models.Grupo.bulkCreate(gruposToAnadir);
    // obtener los identificadores de los grupos que se acaban de crear
    const gruposNuevos = await models.Grupo.findAll({
      attributes: ['grupoId', 'nombre', 'curso'],
      where: {
        ProgramacionDocenteId: res.locals.identificador
      },
      raw: true
    });
    gruposNuevos.forEach(grupoNuevo => {
      const grupoToActualizar = relacionGrupos.find(
        obj =>
          `${obj.nombre}_${obj.curso}` ===
          `${grupoNuevo.nombre}_${grupoNuevo.curso}`
      );
      grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
    });
    // obtener las asignaturas de la progdoc anterior que se va a copiar
    const asignsBBDD = await models.Asignatura.findAll({
      where: {
        ProgramacionDocenteIdentificador: pdIDanterior
      },
      include: [
        {
          // incluye las asignaciones de profesores y los horarios.
          model: models.AsignacionProfesor,
          // left join
          required: false
        }
      ],
      raw: true
    });
    asignsBBDD.forEach(asignBBDD => {
      const viejaAsignatura = viejasAsignaturas.find(
        obj => obj.codigo === asignBBDD.codigo
      );
      // asignatura que es la primera vez que aparece
      if (!viejaAsignatura) {
        const As = {};
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
        As.PresidenteTribunalAsignatura =
          asignBBDD.PresidenteTribunalAsignatura;
        As.VocalTribunalAsignatura = asignBBDD.VocalTribunalAsignatura;
        As.SecretarioTribunalAsignatura =
          asignBBDD.SecretarioTribunalAsignatura;
        As.SuplenteTribunalAsignatura = asignBBDD.SuplenteTribunalAsignatura;
        viejasAsignaturas.push(As);
        viejasAsignaturas2.push({
          codigo: As.codigo,
          idAnterior: asignBBDD.identificador
        });
      }
      // asignación nueva en una asignatura que ya se creó
      if (
        asignBBDD['AsignacionProfesors.ProfesorId'] ||
        asignBBDD['AsignacionProfesors.Dia'] ||
        asignBBDD['AsignacionProfesors.Nota']
      ) {
        // la asignacion es de profesor o horario
        const asignacion = {};
        const idGrupo = relacionGrupos.find(
          obj =>
            obj.identificadorViejo === asignBBDD['AsignacionProfesors.GrupoId']
        );
        if (idGrupo) {
          /*
          El _a pq sino en el while de abajo podría quedarse enganchado
          si concide AsignaturaId con algún código.
          */
          asignacion.AsignaturaId = `${asignBBDD.codigo}_a`;
          asignacion.GrupoId = idGrupo.identificadorNuevo;
          asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId'];
          asignacion.Dia = asignBBDD['AsignacionProfesors.Dia'];
          asignacion.Nota = asignBBDD['AsignacionProfesors.Nota'];
          asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio'];
          asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion'];
          asignacions.push(asignacion);
        }
      }
    });
    let asignaturasToAnadir = [];
    asignaturasToAnadir = asignaturasToAnadir.concat(viejasAsignaturas);
    await models.Asignatura.bulkCreate(asignaturasToAnadir);
    // copiar exámenes
    const exs = await models.Asignatura.findAll({
      where: {
        ProgramacionDocenteIdentificador: pdIDanterior
      },
      attributes: ['codigo'],
      include: [
        {
          // incluye las asignaciones de profesores y los horarios.
          model: models.Examen,
          // inner join
          required: true
        }
      ],
      raw: true
    });
    exs.forEach(ex => {
      const nuevoExamen = {};
      nuevoExamen.fecha = ex['Examens.fecha'];
      nuevoExamen.periodo = ex['Examens.periodo'];
      nuevoExamen.horaInicio = ex['Examens.horaInicio'];
      nuevoExamen.duracion = ex['Examens.duracion'];
      // hago el truco de antes
      nuevoExamen.AsignaturaIdentificador = `${ex.codigo}_a`;
      examens.push(nuevoExamen);
    });
    // obtener las asignaturas que se acaban de crear
    const asignaturasNuevas = await models.Asignatura.findAll({
      attributes: ['identificador', 'codigo', 'DepartamentoResponsable'],
      where: {
        ProgramacionDocenteIdentificador: res.locals.identificador
      },
      raw: true
    });
    asignaturasNuevas.forEach(asignaturaNueva => {
      // actualizar los departamentos responsables que participan en la titulación
      // deben estar en el sistmea
      if (
        departamentosBBDD.find(
          dep => dep.codigo === asignaturaNueva.DepartamentoResponsable
        )
      ) {
        depsResponsables.add(asignaturaNueva.DepartamentoResponsable);
      }
      /*
      actualizar los identificadores de la asignatura que antes se pusieron con el código+_a
      El _a pq sino en el while de abajo podría quedarse enganchado
      si concide AsignaturaId con algún código.
      */
      while (
        asignacions.find(
          obj => obj.AsignaturaId === `${asignaturaNueva.codigo}_a`
        )
      ) {
        const asignacionToActualizar = asignacions.find(
          obj => obj.AsignaturaId === `${asignaturaNueva.codigo}_a`
        );
        asignacionToActualizar.AsignaturaId = asignaturaNueva.identificador;
      }
      while (
        examens.find(
          obj => obj.AsignaturaIdentificador === `${asignaturaNueva.codigo}_a`
        )
      ) {
        const examenToActualizar = examens.find(
          obj => obj.AsignaturaIdentificador === `${asignaturaNueva.codigo}_a`
        );
        examenToActualizar.AsignaturaIdentificador =
          asignaturaNueva.identificador;
      }
      // mapeo de ids en la bbddd
      const viejaAsignatura2 = viejasAsignaturas2.find(
        obj => obj.codigo === asignaturaNueva.codigo
      );
      if (viejaAsignatura2)
        viejaAsignatura2.idNuevo = asignaturaNueva.identificador;
    });
    res.locals.departamentosResponsables = [...depsResponsables];
    /*
        Hay que incluir asignaciones sin profesor ni horario ni asignatura:
        Se corresponde a notas que no se asocian a ninguna asignatura sino a grupo
        */
    const gruposBBDDIds = relacionGrupos.map(g => g.identificadorViejo);
    const notas = await models.AsignacionProfesor.findAll({
      where: {
        AsignaturaId: { [op.eq]: null },
        GrupoId: { [op.in]: gruposBBDDIds },
        Nota: { [op.ne]: null }
      },
      raw: true
    });
    notas.forEach(nota => {
      const idGrupo = relacionGrupos.find(
        obj => obj.identificadorViejo === nota.GrupoId
      );
      if (idGrupo) {
        const asignacion = {};
        asignacion.AsignaturaId = null;
        asignacion.GrupoId = idGrupo.identificadorNuevo;
        asignacion.Nota = nota.Nota;
        asignacions.push(asignacion);
      }
    });
    await models.AsignacionProfesor.bulkCreate(asignacions);
    await models.Examen.bulkCreate(examens);
    // copiar las franjas de exámenes
    const franjas = await models.FranjaExamen.findAll({
      where: {
        ProgramacionDocenteId: pdIDanterior
      },
      raw: true
    });
    franjas.forEach(franja => {
      const franjaExamen = {};
      franjaExamen.horaInicio = franja.horaInicio;
      franjaExamen.duracion = franja.duracion;
      franjaExamen.curso = franja.curso;
      franjaExamen.periodo = franja.periodo;
      franjaExamen.ProgramacionDocenteId = res.locals.identificador;
      franjasToAnadir.push(franjaExamen);
    });
    await models.FranjaExamen.bulkCreate(franjasToAnadir);
    /*
    actividades parciales
    conjuntoActividadesParcial contiene los contenedores de actividades parciales
    (conjuntoActividadesParcial) también contiene las actividades parciales
    asociadas a cada contenedor de actividades parciales
    */
    conjuntoActividadesParcial = await actividadParcialController.getAllActividadParcial(
      [pdIDanterior]
    );
    // bucle para cada contenedor de actividades parciales.
    conjuntoActividadesParcial.forEach(c => {
      const newConjuntoActividadParcial = {};
      newConjuntoActividadParcial.notaInicial = c.notaInicial;
      newConjuntoActividadParcial.curso = c.curso;
      newConjuntoActividadParcial.semestre = c.semestre;
      newConjuntoActividadParcial.fechaInicio = helpers.formatFecha2(
        c.fechaInicio
      );
      newConjuntoActividadParcial.fechaFin = helpers.formatFecha2(c.fechaFin);
      newConjuntoActividadParcial.ProgramacionDocenteId = nuevaPd.identificador;
      newConjuntoActividadParcial.ActividadParcials = [];
      c.actividades.forEach(actParcial => {
        const asignaturaConActividad = viejasAsignaturas2.find(
          obj => obj.idAnterior === actParcial.asignaturaId
        );
        if (!actParcial.asignaturaId || asignaturaConActividad) {
          const newActividad = {};
          newActividad.horaInicio = actParcial.horaInicio;
          newActividad.duracion = actParcial.duracion;
          newActividad.descripcion = actParcial.descripcion;
          newActividad.fecha = helpers.formatFecha2(actParcial.fecha);
          newActividad.tipo = actParcial.tipo;
          newActividad.AsignaturaId = asignaturaConActividad
            ? asignaturaConActividad.idNuevo
            : null;
          newConjuntoActividadParcial.ActividadParcials.push(newActividad);
        }
      });
      promisesActividades.push(
        models.ConjuntoActividadParcial.create(newConjuntoActividadParcial, {
          include: [models.ActividadParcial]
        })
      );
    });
    const conjuntoActividadesParcialAnadidas = await Promise.all(
      promisesActividades
    );
    // añadir los grupos a los conjuntoActividadParcial creadas
    conjuntoActividadesParcialAnadidas.forEach(
      (conjuntoActividadParcialAnadida, index) => {
        // no tienen porqué tener grupo asociado
        conjuntoActividadesParcial[index].grupos.forEach(g => {
          const group = relacionGrupos.find(
            obj => obj.identificadorViejo === g.identificador
          );
          if (group) {
            conjuntoActividadesParcGrToAnadir.push({
              ConjuntoParcialId: conjuntoActividadParcialAnadida.identificador,
              GrupoId: group.identificadorNuevo
            });
          }
        });
      }
    );
    await models.ConjuntoActividadParcialGrupo.bulkCreate(
      conjuntoActividadesParcGrToAnadir
    );
    next();
  } catch (error) {
    try {
      // si se produce un error en el proceso se borra todo el progreso que se hizo
      // TODO hacerlo con transacciones
      console.error('Error:', error);
      await progDocController.borrarPd(res.locals.identificador);
      next(error);
    } catch (err) {
      next(err);
    }
  }
};
