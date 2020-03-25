const Sequelize = require('sequelize');
const models = require('../models');
const funciones = require('../funciones');
const estados = require('../estados');

const op = Sequelize.Op;
const progDocController = require('./progDoc_controller');
const departamentoController = require('./departamento_controller');
const grupoController = require('./grupo_controller');
const apiUpmController = require('./apiUpm_controller');

exports.getGestionPlanes = async function(req, res, next) {
  req.session.submenu = 'Planes';
  const actualizarpath = `${req.baseUrl}/gestion/actualizarPlanApi`;
  const cambioEstadopath = `${req.baseUrl}/gestion/cambiarEstadoProgDoc`;
  const path = `${req.baseUrl}/gestion/planes`;
  let estado = null;
  let pdID = null;
  if (
    !res.locals.progDoc ||
    (estados.estadoProgDoc.abierto !==
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
      estados.estadoProgDoc.listo !==
        res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
      estados.estadoProgDoc.incidencia !==
        res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'])
  ) {
    estado = 'Programación docente no abierta. Debe abrir una nueva.';
  } else {
    pdID = res.locals.progDoc['ProgramacionDocentes.identificador'];
  }
  try {
    const departamentos = await departamentoController.getAllDepartamentos();
    res.render('gestionPlanes/gestionPlanes', {
      estado,
      permisoDenegado: res.locals.permisoDenegado,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      planEstudios: res.locals.planEstudios,
      actualizarpath,
      cambioEstadopath,
      departamentos,
      path,
      pdID,
      progDoc: res.locals.progDoc,
      // gestionar los estados
      estadosProfesor: estados.estadoProfesor,
      estadosTribunal: estados.estadoTribunal,
      estadosHorario: estados.estadoHorario,
      estadosExamen: estados.estadoExamen,
      estadosCalendario: estados.estadoCalendario,
      estadosProgDoc: estados.estadoProgDoc,
      // cuando se hace redirect de updateAsignaturasApiUPM no valen null
      desapareceAsignaturas: res.locals.desapareceAsignaturas,
      cambioAsignaturas: res.locals.cambioAsignaturas,
      cambioAsignaturasAntigua: res.locals.cambioAsignaturasAntigua,
      nuevasAsignaturas: res.locals.nuevasAsignaturas,
      // se manda cuando ha pasado por actualizar
      actualizar: res.locals.actualizar,
      // para diferenciar entre pantalla mostrar el estado o poder cambiarlo en gestionPlanes
      verEstado: false
    });
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

exports.updateAsignaturasApiUpm = async function(req, res, next) {
  await apiUpmController.updatePlanesAndDeparts();
  const { pdID } = req.session;
  let apiAsignaturas = [];
  const nuevasAsignaturas = [];
  const viejasAsignaturas = [];
  const cambioAsignaturas = [];
  const cambioAsignaturasAntigua = [];
  const desapareceAsignaturas = [];
  /*
  update AsignaturasApiUpm se hace en dos estados (mostrar)
  1: solo muestra los cambios
  2: aplica los cambios
  */
  let mostrar = req.body.aplicarCambios;
  if (!res.locals.permisoDenegado && mostrar) {
    // convertir en integer por si viene como string
    mostrar = +mostrar;
    try {
      // las asignacions se meten la copia de los profesores a los grupos nuevos
      const asignacions = [];
      const plan = progDocController.getPlanPd(pdID);
      const ano = progDocController.getAnoPd(pdID);
      const tipoPD = progDocController.getTipoPd(pdID);
      const planBBDD = res.locals.planEstudios.find(obj => obj.codigo === plan);
      const promisesUpdate = [];
      /*
      si aparece una asignatura de un departamento que no tenia asignado debo meterla y al reves,
      igual se tiene que eliminar un departamento
      */
      const departamentosResponsables = [];
      // el set para no tener elementos repetidos
      // los profesores se deben copiar a los nuevos grupos si cambia de semestre o año
      const copiarProfesores = new Set();
      // las cosas que se van a eliminar de la base de datos
      const whereEliminarAsignatura = [];
      const whereEliminarProfesor = [];
      const whereEliminarHorario = [];
      const whereEliminarExamen = [];
      const whereEliminarActividadParcial = [];
      const response = await apiUpmController.getAsignaturasApiUpm(plan, ano);
      apiAsignaturas = response.data;
      const grupos = grupoController.getGrupos2(pdID);
      // los grupos de las nuevas asignatuas

      const asignaturasBBDD = await models.Asignatura.findAll({
        where: {
          ProgramacionDocenteIdentificador: pdID
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
      asignaturasBBDD.forEach(asignBBDD => {
        const { identificador } = asignBBDD;
        const nuevaAsignatura = nuevasAsignaturas.find(
          obj => obj.codigo === asignBBDD.codigo
        );
        const viejaAsignatura = viejasAsignaturas.find(
          obj => obj.codigo === asignBBDD.codigo
        );
        let cambioAsignatura = cambioAsignaturas.find(
          obj => obj.codigo === asignBBDD.codigo
        );
        const desapareceAsignatura = desapareceAsignaturas.find(
          obj => obj.codigo === asignBBDD.codigo
        );
        // asignatura que no está catalogada debo catalogarla
        if (
          !nuevaAsignatura &&
          !viejaAsignatura &&
          !cambioAsignatura &&
          !desapareceAsignatura
        ) {
          // actualizo o eliminar las asignaturas que hayan cambiado o desaparecido
          if (apiAsignaturas[asignBBDD.codigo]) {
            const apiAsignatura = apiAsignaturas[asignBBDD.codigo];
            const as = {};
            as.codigo = asignBBDD.codigo;
            let hasCurso = true;
            // hasDepartamento no se usa pq las practicas si que la quiero y no tiene departamento
            // let hasDepartamento = true;
            let hasSemestre = true;
            const nombreCambio = asignBBDD.nombre !== apiAsignatura.nombre;
            as.nombre = apiAsignatura.nombre;
            // eslint-disable-next-line no-param-reassign
            if (apiAsignatura.nombre_ingles !== '') {
              // eslint-disable-next-line no-param-reassign
              asignBBDD.nombreIngles = apiAsignatura.nombre_ingles;
            }
            const nombreInglesCambio =
              asignBBDD.nombreIngles !== apiAsignatura.nombre_ingles;
            as.nombreIngles = apiAsignatura.nombre_ingles;
            const creditosCambio =
              asignBBDD.creditos !==
              funciones.convertCommaToPointDecimal(apiAsignatura.credects);
            as.creditos = funciones.convertCommaToPointDecimal(
              apiAsignatura.credects
            );
            switch (apiAsignatura.codigo_tipo_asignatura) {
              case 'T':
                as.tipo = 'bas';
                break;
              case 'B':
                as.tipo = 'obl';
                break;
              case 'O':
                as.tipo = 'opt';
                break;
              case 'P':
                as.tipo = 'obl';
                break;
              default:
                // hay un tipo E que a veces se usa para prácticas
                as.tipo = null;
                break;
            }
            const tipoCambio = as.tipo !== asignBBDD.tipo;

            const apiDepartamentos = apiAsignatura.departamentos;
            if (apiDepartamentos.length === 0) {
              if (
                apiAsignatura.codigo_tipo_asignatura === 'P' &&
                (planBBDD.nombreCompleto.toUpperCase().includes('MASTER') ||
                  planBBDD.nombreCompleto.toUpperCase().includes('MÁSTER'))
              ) {
                as.DepartamentoResponsable = 'TFM';
              } else if (
                apiAsignatura.codigo_tipo_asignatura === 'P' &&
                planBBDD.nombreCompleto.toUpperCase().includes('GRADO')
              ) {
                as.DepartamentoResponsable = 'TFG';
              } else {
                as.DepartamentoResponsable = null;
                // hasDepartamento = false;
              }
            }
            apiDepartamentos.forEach(element => {
              if (element.responsable === 'S' || element.responsable === '') {
                as.DepartamentoResponsable = element.codigo_departamento;
              }
            });
            const departamentoResponsableCambio =
              as.DepartamentoResponsable !== asignBBDD.DepartamentoResponsable;
            if (apiAsignatura.curso === '') {
              hasCurso = false;
            } else {
              as.curso = apiAsignatura.curso;
            }
            const cursoCambio = as.curso !== asignBBDD.curso;

            const { imparticion } = apiAsignatura;
            if (imparticion['1S'] && imparticion['2S']) {
              as.semestre = '1S-2S';
            } else if (imparticion['1S']) {
              as.semestre = '1S';
            } else if (imparticion['2S']) {
              as.semestre = '2S';
            } else if (imparticion.I) {
              as.semestre = 'I';
            } else if (imparticion.A) {
              as.semestre = 'A';
            } else {
              as.semestre = '';
              hasSemestre = false;
            }
            const semestreCambio = as.semestre !== asignBBDD.semestre;
            if (!hasCurso || !hasSemestre) {
              desapareceAsignaturas.push(as);
              whereEliminarAsignatura.push(identificador);
              whereEliminarProfesor.push(identificador);
              whereEliminarHorario.push(identificador);
              whereEliminarExamen.push(identificador);
              whereEliminarActividadParcial.push(identificador);
            } else if (
              nombreCambio ||
              nombreInglesCambio ||
              creditosCambio ||
              tipoCambio ||
              departamentoResponsableCambio ||
              cursoCambio ||
              semestreCambio
            ) {
              /*
               añade el departamentoResponsable si no estaba.
                Solo en las asignaturas nuevas que se añaden o las que permanecen
              */
              const index = departamentosResponsables.indexOf(
                as.DepartamentoResponsable
              );
              if (index < 0 && as.DepartamentoResponsable) {
                departamentosResponsables.push(as.DepartamentoResponsable);
              }
              cambioAsignaturas.push(as);
              cambioAsignaturasAntigua.push(asignBBDD);
              if (cursoCambio) {
                whereEliminarHorario.push(identificador);
                whereEliminarProfesor.push(identificador);
                whereEliminarActividadParcial.push(identificador);
                // los profesores hay que copiarlos a todos los grupos nuevos
                copiarProfesores.add(identificador);
              }
              if (semestreCambio) {
                whereEliminarHorario.push(identificador);
                whereEliminarProfesor.push(identificador);
                whereEliminarExamen.push(identificador);
                whereEliminarActividadParcial.push(identificador);
                // los profesores hay que copiarlos a todos los grupos nuevos
                copiarProfesores.add(identificador);
              }
              /*
              if (departamentoResponsableCambio) {
              }
              */
              if (mostrar === 2) {
                promisesUpdate.push(
                  models.Asignatura.update(
                    as /* set attributes' value */,
                    { where: { identificador } } /* where criteria */
                  )
                );
              }
              as.identificador = asignBBDD.identificador;
            } else {
              /*
              añado el departamentoResponsable si no estaba.
              Solo en las asignaturas nuevas que se añaden o las que permanecen
              */
              const index = departamentosResponsables.indexOf(
                as.DepartamentoResponsable
              );
              if (index < 0 && as.DepartamentoResponsable) {
                departamentosResponsables.push(as.DepartamentoResponsable);
              }
              viejasAsignaturas.push(as);
            }
          } else {
            desapareceAsignaturas.push(asignBBDD);
            whereEliminarAsignatura.push(identificador);
            whereEliminarProfesor.push(identificador);
            whereEliminarHorario.push(identificador);
            whereEliminarExamen.push(identificador);
            whereEliminarActividadParcial.push(identificador);
          }
        }
        /* ahora ya estará guardada en la bbdd actualizo
        para ver si es una cambioAsignatura
        */
        cambioAsignatura = cambioAsignaturas.find(
          obj => obj.codigo === asignBBDD.codigo
        );
        // hay que copiar los profesores en todos los grupos
        if (
          cambioAsignatura &&
          copiarProfesores.has(cambioAsignatura.identificador)
        ) {
          if (asignBBDD['AsignacionProfesors.ProfesorId']) {
            for (let i = 0; i < grupos.length; i++) {
              if (grupos[i].curso === Number(cambioAsignatura.curso)) {
                const asignacion = {};
                // el identificador de la asignatura es el mismo
                asignacion.AsignaturaId = asignBBDD.identificador;
                asignacion.ProfesorId =
                  asignBBDD['AsignacionProfesors.ProfesorId'];
                asignacion.GrupoId = grupos[i].grupoId;
                // no meto profesores repetidos
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
        }
      });
      // buscar las asignaturas nuevas en API upm
      for (const apiCodigo in apiAsignaturas) {
        if (Object.prototype.hasOwnProperty.call(apiAsignaturas, apiCodigo)) {
          const apiAsignEncontrada = apiAsignaturas[apiCodigo];
          const asignExisteBBDD = asignaturasBBDD.find(
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
          let depResponsable = null;
          if (apiDepartamentos.length === 0) {
            if (
              apiAsignEncontrada.codigo_tipo_asignatura === 'P' &&
              (planBBDD.nombreCompleto.toUpperCase().includes('MASTER') ||
                planBBDD.nombreCompleto.toUpperCase().includes('MÁSTER'))
            ) {
              depResponsable = 'TFM';
            } else if (
              apiAsignEncontrada.codigo_tipo_asignatura === 'P' &&
              planBBDD.nombreCompleto.toUpperCase().includes('GRADO')
            ) {
              depResponsable = 'TFG';
            } else {
              depResponsable = null;
            }
          }
          apiDepartamentos.forEach(element => {
            if (element.responsable === 'S' || element.responsable === '') {
              depResponsable = element.codigo_departamento;
            }
          });
          /*
          Nueva asignatura a anadir.
          Es una asignatura si tiene curso, semestre y departamentoResponsable
          */
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
            // por defecto los profesores se asignan por grupo comun
            nuevaAsign.estado = 'N';
            nuevaAsign.creditos = funciones.convertCommaToPointDecimal(
              apiAsignEncontrada.credects
            );
            nuevaAsign.ProgramacionDocenteIdentificador = pdID;
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
            /*
            Añade el departamentoResponsable si no estaba.
            Solo en las asignaturas nuevas que se añaden o las que permanecen
            */
            const index = departamentosResponsables.indexOf(depResponsable);
            if (index < 0 && depResponsable) {
              departamentosResponsables.push(depResponsable);
            }
            nuevasAsignaturas.push(nuevaAsign);
          }
        }
      }
      // modifico los estados de pd con los camibos que se han aplicado
      res.locals.desapareceAsignaturas = desapareceAsignaturas;
      res.locals.cambioAsignaturas = cambioAsignaturas;
      res.locals.cambioAsignaturasAntigua = cambioAsignaturasAntigua;
      res.locals.nuevasAsignaturas = nuevasAsignaturas;
      /*
      actualizar es 1 cuando muestra los cambios
      2 cuando aplica los cambios
      actualizar upm se hace en dos pasos primero muestra los cambios
      y después debe aplicarlos
      */
      if (mostrar === 1) {
        res.locals.actualizar = 1;
        next();
      } else {
        res.locals.actualizar = 2;
        // eliminar las asignaciones de profesores
        await models.AsignacionProfesor.destroy({
          where: {
            ProfesorId: {
              [op.ne]: null
            },
            AsignaturaId: {
              [op.in]: whereEliminarProfesor
            }
          }
        });
        // eliminar los horaios y notas
        await models.AsignacionProfesor.destroy({
          where: {
            [op.or]: [{ Nota: { [op.ne]: null } }, { Dia: { [op.ne]: null } }],
            AsignaturaId: {
              [op.in]: whereEliminarHorario
            }
          }
        });
        // eliminar los examenes
        await models.Examen.destroy({
          where: {
            AsignaturaIdentificador: {
              [op.in]: whereEliminarExamen
            }
          }
        });
        // eliminar las actividades parciales
        await models.ActividadParcial.destroy({
          where: {
            AsignaturaId: {
              [op.in]: whereEliminarActividadParcial
            }
          }
        });
        // eliminar las asignaturas que desaparecen
        await models.Asignatura.destroy({
          where: {
            identificador: {
              [op.in]: whereEliminarAsignatura
            }
          }
        });
        // actualizo todas las asignaturas
        await Promise.all(promisesUpdate);
        // creo las nuevas asignaturas
        await models.Asignatura.bulkCreate(nuevasAsignaturas);
        // añado los profesores a los nuevos grupos una vez que ya borre los anteriores
        await models.AsignacionProfesor.bulkCreate(asignacions);
        /*
        añado los nuevos o quito los departamentos que desaparecen en el plan.
        Si aparece uno nuevo se pone en cerrado
        el jefe de estudios debería retraer su estado
        si desaparece un departamentoResponsable también desaparecerá en el estado
        */
        const estadoProfesores = {};
        const estadoTribunales = {};
        const nuevaEntrada = {};
        departamentosResponsables.forEach(element => {
          estadoProfesores[element] =
            res.locals.progDoc['ProgramacionDocentes.estadoProfesores'][
              element
            ] || estados.estadoProfesor.aprobadoDirector;
          estadoTribunales[element] =
            res.locals.progDoc['ProgramacionDocentes.estadoTribunales'][
              element
            ] || estados.estadoTribunal.aprobadoDirector;
        });
        nuevaEntrada.estadoProfesores = estadoProfesores;
        nuevaEntrada.fechaProfesores = new Date();
        nuevaEntrada.estadoTribunales = estadoTribunales;
        nuevaEntrada.fechaTribunales = new Date();
        await models.ProgramacionDocente.update(
          nuevaEntrada /* set attributes' value */,
          { where: { identificador: pdID } } /* where criteria */
        );

        next();
      }
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

exports.updateEstadoProgDoc = async function(req, res) {
  if (!res.locals.permisoDenegado) {
    try {
      const nuevaEntrada = {};
      const { pdID } = req.session;
      switch (req.body.estadoNombre) {
        case 'estadoProfesores':
          nuevaEntrada.estadoProfesores =
            res.locals.progDoc['ProgramacionDocentes.estadoProfesores'];
          nuevaEntrada.estadoProfesores[req.body.departamentoId] =
            req.body.estadoNuevo;
          break;
        case 'estadoTribunales':
          nuevaEntrada.estadoTribunales =
            res.locals.progDoc['ProgramacionDocentes.estadoTribunales'];
          nuevaEntrada.estadoTribunales[req.body.departamentoId] =
            req.body.estadoNuevo;
          break;
        case 'estadoHorarios':
          nuevaEntrada.estadoHorarios = req.body.estadoNuevo;
          break;
        case 'estadoExamenes':
          nuevaEntrada.estadoExamenes = req.body.estadoNuevo;
          break;
        case 'estadoCalendario':
          nuevaEntrada.estadoCalendario = req.body.estadoNuevo;
          break;
        default:
          break;
      }
      await models.ProgramacionDocente.update(
        nuevaEntrada /* set attributes' value */,
        { where: { identificador: pdID } }
      );
      progDocController.isPDLista(pdID, res.json({ success: true }));
    } catch (error) {
      console.log('Error:', error);
      res.json({
        success: false,
        msg:
          'Ha habido un error la acción no se ha podido completar recargue la página para ver el estado en el que se encuentra la programación docente'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};
