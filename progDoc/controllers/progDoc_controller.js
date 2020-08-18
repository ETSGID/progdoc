/* global PATH_PDF */
const Sequelize = require('sequelize');
const rimraf = require('rimraf');

const models = require('../models');

const op = Sequelize.Op;
const estados = require('../estados');
const helpers = require('../lib/helpers');

// devuelve el tipo de la PD a partir del id
// PD_09TT_201819_I_v1
const getPlanPd = pdID => {
  return pdID ? pdID.split('_')[1] : null;
};

// devuelve el ano de la PD a partir del id
// PD_09TT_201819_I_v1
const getAnoPd = pdID => {
  return pdID ? pdID.split('_')[2] : null;
};

// devuelve el tipo de la PD a partir del id
// PD_09TT_201819_I_v1
const getTipoPd = pdID => {
  return pdID ? pdID.split('_')[3] : null;
};

// devuelve el version de la PD a partir del id: v1
// PD_09TT_201819_I_v1
const getVersionPd = pdID => {
  return pdID ? pdID.split('_')[4] : null;
};

// devuelve la version de la PD a partir del id normalizada: v001
const getVersionPdNormalized = pdID => {
  const v = getVersionPdNumber(pdID);
  return v ? `v${v.toString().padStart(3, '0')}` : null;
};

const getVersionPdNormalizedWithoutV = pdID => {
  const v = getVersionPdNumber(pdID);
  return v ? `${v.toString().padStart(3, '0')}` : null;
};

// devuelve el numero version de la PD a partir del id 1
// PD_09TT_201819_I_v1
const getVersionPdNumber = pdID => {
  const v = getVersionPd(pdID);
  return v ? Number(v.split('v')[1]) : null;
};
// devuelve el id de PD con version normalizada: PD_09TT_201819_I_v001
const getProgramacionDocenteIdNormalized = pdID => {
  if (pdID) {
    const pdIDArray = pdID.split('_');
    pdIDArray.splice(4, 1, getVersionPdNormalized(pdID));
    return pdIDArray.join('_');
  }
  return null;
};

// devuelve el id de PD con version normalizada y acronimo: PD_GITST_09TT_201819_I_v001
const getProgramacionDocenteIdNormalizedAcronimo = (pdID, acronimo) => {
  if (pdID && acronimo) {
    const pdIDNormalizedArray = getProgramacionDocenteIdNormalized(pdID).split(
      '_'
    );
    pdIDNormalizedArray.splice(1, 0, acronimo);
    return pdIDNormalizedArray.join('_');
  }
  return pdID;
};

const getProgramacionDocenteById = async pdID => {
  if (pdID) {
    // eslint-disable-next-line no-useless-catch
    try {
      const pd = await models.ProgramacionDocente.findOne({
        attributes: [
          'identificador',
          'semestre',
          'estadoProfesores',
          'reabierto'
        ],
        where: {
          identificador: pdID
        },
        raw: true
      });
      return pd;
    } catch (error) {
      // se propaga el error lo captura el middleware
      throw error;
    }
  } else {
    return null;
  }
};

const CumpleTodos = (estado, objeto) => {
  for (const variable in objeto) {
    if (objeto[variable] !== estado) {
      return false;
    }
  }
  return true;
};

// funcion para ver el estado de profesores/tribunales si cumple uno el resto lo marca como cumplido
const comprobarEstadoCumpleUno = (estado, objeto) => {
  for (const variable in objeto) {
    if (Object.prototype.hasOwnProperty.call(objeto, variable)) {
      if (objeto[variable] === estado) {
        return true;
      }
    }
  }
  return false;
};

// te devuelve la programacion docente sobre la que puede tocar una persona
exports.getProgramacionDocente = async (req, res, next) => {
  try {
    // separar con un if el rol en el que el where afecta
    const wherePD = [];
    // solo puede haber una abierta y una en incidencia como maximo en un plan
    wherePD.push(estados.estadoProgDoc.abierto);
    wherePD.push(estados.estadoProgDoc.listo);
    wherePD.push(estados.estadoProgDoc.incidencia);
    wherePD.push(estados.estadoProgDoc.cerrado);
    // el planID si no existe acronimo sera el código, por eso el or
    const params = await models.PlanEstudio.findAll({
      attributes: ['nombre', 'codigo', 'nombreCompleto'],
      where: Sequelize.or(
        { nombre: req.session.planID },
        { codigo: req.session.planID }
      ),
      include: [
        {
          model: models.ProgramacionDocente,
          where: {
            estadoProGDoc: {
              [op.in]: wherePD
            }
          }
        }
      ],
      order: [
        // el orden es muy importante para llamar a addYear2 y debe ser ascendente
        [Sequelize.literal('"ProgramacionDocentes"."anoAcademico"'), 'DESC'],
        [Sequelize.literal('"ProgramacionDocentes"."semestre"'), 'DESC'],
        [Sequelize.literal('"ProgramacionDocentes"."version"'), 'DESC']
      ],
      raw: true
    });
    let progDocIncidencia = null;
    let progDocAbierta = null;
    params.forEach(param => {
      req.session.planID = param.codigo;
      res.locals.pdSemestre = param['ProgramacionDocentes.semestre'];
      switch (param['ProgramacionDocentes.estadoProGDoc']) {
        case estados.estadoProgDoc.abierto:
          progDocAbierta = param;
          break;
        case estados.estadoProgDoc.listo:
          progDocAbierta = param;
          break;
        case estados.estadoProgDoc.incidencia:
          progDocIncidencia = param;
          break;
        default:
          break;
      }
    });
    if (progDocIncidencia !== null) {
      res.locals.progDoc = progDocIncidencia;
      req.session.pdID =
        progDocIncidencia['ProgramacionDocentes.identificador'];
    } else if (progDocAbierta !== null) {
      res.locals.progDoc = progDocAbierta;
      req.session.pdID = progDocAbierta['ProgramacionDocentes.identificador'];
    } else {
      // como estan ordenadas sino se coge la ultima
      res.locals.estado = 'Programación docente no abierta';
      res.locals.progDoc = params.length > 0 ? params[0] : null;
      req.session.pdID =
        params.length > 0
          ? params[0]['ProgramacionDocentes.identificador']
          : null;
    }
    if (res.locals.progDoc) {
      const query =
        'SELECT distinct  "DepartamentoResponsable", public."Departamentos".nombre, public."Departamentos".acronimo FROM public."Asignaturas" p  inner join public."Departamentos" on p."DepartamentoResponsable" = public."Departamentos".codigo WHERE p."ProgramacionDocenteIdentificador" = :pdId ';
      // eslint-disable-next-line no-self-assign
      const departamentosResponsables = await models.sequelize.query(query, {
        replacements: {
          pdId: res.locals.progDoc['ProgramacionDocentes.identificador']
        }
      });
      const depResponsables = [];
      departamentosResponsables[0].forEach(d => {
        const newDepartamento = {};
        newDepartamento.nombre = d.nombre;
        newDepartamento.acronimo = d.acronimo;
        newDepartamento.codigo = d.DepartamentoResponsable;
        depResponsables.push(newDepartamento);
      });
      if (depResponsables.length >= 0) {
        res.locals.departamentosResponsables = depResponsables.sort(
          helpers.sortDepartamentos
        );
      }
      next();
    } else {
      next();
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// se le pasa una programacion docente y dice si puede marcarse como lista
const isPDListaBoolean = progdoc => {
  return (
    progdoc.estadoProGDoc === estados.estadoProgDoc.abierto &&
    CumpleTodos(
      estados.estadoProfesor.aprobadoDirector,
      progdoc.estadoProfesores
    ) &&
    CumpleTodos(
      estados.estadoTribunal.aprobadoDirector,
      progdoc.estadoTribunales
    ) &&
    progdoc.estadoHorarios === estados.estadoHorario.aprobadoCoordinador &&
    progdoc.estadoExamenes === estados.estadoExamen.aprobadoCoordinador &&
    // calendario de actividades
    progdoc.estadoCalendario === estados.estadoCalendario.aprobadoCoordinador
  );
};

// TODO: cuando se añadan las otras helpers hay que ponerlas aquí
// para comprobar si la pd se puede marcar como lista para que Jefatura de Estudios la cierre
exports.isPDLista = async (progID, thenFunction) => {
  // eslint-disable-next-line no-useless-catch
  try {
    let nuevoEstado;
    const prog = await models.ProgramacionDocente.findOne({
      where: { identificador: progID },
      raw: true
    });
    if (isPDListaBoolean(prog)) {
      nuevoEstado = estados.estadoProgDoc.listo;
    } else {
      nuevoEstado = estados.estadoProgDoc.abierto;
    }
    await models.ProgramacionDocente.update(
      { estadoProGDoc: nuevoEstado } /* set attributes' value */,
      { where: { identificador: progID } } /* where criteria */
    );
    // eslint-disable-next-line no-unused-expressions
    thenFunction;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// TODO: cuando se añadan las otras helpers hay que ponerlas aquí
// para comprobar si no se ha aprobado nada de la programacion docente
// o si es una incidencia
exports.isPDInitialState = progdoc => {
  return (
    (progdoc.estadoProGDoc === estados.estadoProgDoc.abierto &&
      CumpleTodos(estados.estadoProfesor.abierto, progdoc.estadoProfesores) &&
      CumpleTodos(estados.estadoTribunal.abierto, progdoc.estadoTribunales) &&
      progdoc.estadoHorarios === estados.estadoHorario.abierto &&
      progdoc.estadoExamenes === estados.estadoExamen.abierto &&
      // calendario de actividades
      progdoc.estadoCalendario === estados.estadoCalendario.abierto) ||
    progdoc.estadoProGDoc === estados.estadoProgDoc.incidencia
  );
};

/*
Devuelve la/las ultimas pds existentes para el plan, tipoPD y ano
Devuelve la version anterior y en caso de que no exista la del anio anterior
Si tipo es I devuelve la I anterior o la 1S y 2S anterior
Si tipo es 1S devuelve la I o 1S anterior
Si tipo es 2S devuelve la I o 2S anterior
ano 202021 por ejemplo
en caso de pasar la pdIDNoIncluir obvia esa a la hora de buscar, se utiliza para el pdf
estadoPD en caso de que se quiera buscar programación docente por estado, si no a null
*/
exports.getProgramacionDocentesAnteriores = async (
  plan,
  tipoPD,
  ano,
  pdIDNoIncluir,
  estadoPD
) => {
  let s1 = false;
  let s2 = false;
  let I = false;
  const pds = [];
  const filtro = {
    PlanEstudioId: plan,
    identificador: {
      [op.ne]: pdIDNoIncluir
    }
  };
  if (estadoPD) filtro.estadoProGDoc = estadoPD;
  // eslint-disable-next-line no-useless-catch
  try {
    const progdocs = await models.ProgramacionDocente.findAll({
      attributes: [
        'identificador',
        'semestre',
        'anoAcademico',
        'estadoProfesores',
        'reabierto',
        'version'
      ],
      where: filtro,
      order: [
        [Sequelize.literal('"anoAcademico"'), 'DESC'],
        [Sequelize.literal('semestre'), 'DESC'],
        [Sequelize.literal('version'), 'DESC']
      ],
      raw: true
    });

    for (const progdoc of progdocs) {
      /*
       el segundo elemento del if es para que me coja la pd anterior o igual por si quiero
       modificar una cuando ya abri otra mas nueva
      */
      if (tipoPD === '1S' && ano >= getAnoPd(progdoc.identificador)) {
        if (progdoc.semestre === '1S' || progdoc.semestre === 'I') {
          pds.push(progdoc);
          break;
        }
      }
      if (tipoPD === '2S' && ano >= getAnoPd(progdoc.identificador)) {
        if (progdoc.semestre === '2S' || progdoc.semestre === 'I') {
          pds.push(progdoc);
          break;
        }
      }
      if (tipoPD === 'I' && ano >= getAnoPd(progdoc.identificador)) {
        if (progdoc.semestre === 'I' && I === false) {
          pds.push(progdoc);
          I = true;
          break;
        } else {
          if (
            progdoc.semestre === '1S' &&
            s1 === false &&
            ano >= getAnoPd(progdoc.identificador)
          ) {
            pds.push(progdoc);
            s1 = true;
          }
          if (
            progdoc.semestre === '2S' &&
            s2 === false &&
            ano >= getAnoPd(progdoc.identificador)
          ) {
            pds.push(progdoc);
            s2 = true;
          }
          if (s1 && s2) {
            break;
          }
        }
      }
    }
    /*
    caso raro que haya varias I y s1 por ejemplo si tengo s1 I s2 se va a dar.
    En ese caso se queda con la anual
    */
    if ((I && s1) || (I && s2)) {
      let index = pds.length - 1;
      while (index >= 0) {
        if (pds[index].semestre === '2S' || pds[index].semestre === '1S') {
          pds.splice(index, 1);
        }
        index -= 1;
      }
    }
    return pds;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// devuelve las ultimas programaciones docentes de los planes pasados como array
// planes el codigo del plan
// tipoPD: 1S,2S no acepta I
// ano: 201819
exports.getAllProgramacionDocentes = async (planes, tipoPD, ano) => {
  const programacionDocentesPlan = {};
  planes.forEach(p => {
    programacionDocentesPlan[p] = [];
  });
  // eslint-disable-next-line no-useless-catch
  try {
    const progdocs = await models.ProgramacionDocente.findAll({
      attributes: [
        'identificador',
        'semestre',
        'PlanEstudioId',
        'anoAcademico',
        'version'
      ],
      where: {
        PlanEstudioId: {
          [op.in]: planes
        },
        anoAcademico: ano
      },
      order: [
        [Sequelize.literal('"PlanEstudioId"'), 'DESC'],
        [Sequelize.literal('"anoAcademico"'), 'DESC'],
        [Sequelize.literal('semestre'), 'DESC'],
        [Sequelize.literal('version'), 'DESC']
      ],
      raw: true
    });
    for (const progdoc of progdocs) {
      const pdsPlanes = programacionDocentesPlan[progdoc.PlanEstudioId];
      if (!pdsPlanes.length > 0) {
        /*
        el segundo elemento del if es para que coja la pd anterior o igual por si se quiere modificar
        una cuando ya se abrio otra mas nueva
        */
        if (
          tipoPD === '1S' &&
          ano >= progdoc.identificador.split('_')[2] &&
          (progdoc.semestre === '1S' || progdoc.semestre === 'I')
        ) {
          pdsPlanes.push(progdoc);
        } else if (
          tipoPD === '2S' &&
          ano >= progdoc.identificador.split('_')[2] &&
          (progdoc.semestre === '2S' || progdoc.semestre === 'I')
        ) {
          pdsPlanes.push(progdoc);
        }
      }
    }
    /*
    caso raro que haya varias I y s1. Por ejemplo si hay s1 I s2 se va a dar.
    En ese caso se queda con la anual
    */
    return programacionDocentesPlan;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// devuelve las programaciones docentes mas antiguas (2 o más años)
const getAntiguasProgramacionDocentes = async () => {
  // eslint-disable-next-line no-useless-catch
  try {
    return await models.ProgramacionDocente.findAll({
      attributes: ['identificador'],
      where: {
        anoAcademico: {
          [op.lt]: (new Date().getFullYear() - 2).toString()
        }
      },
      raw: true
    });
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

/*
borra todos las programaciones docentes con errores que no deberia haberlas
y lo relacionado con las mismas
*/
const borrarPdsWithErrores = async () => {
  // eslint-disable-next-line no-useless-catch
  try {
    await models.sequelize
      .query(`DELETE FROM public."ProgramacionDocentes" p  WHERE p."estadoProGDoc" = -1; 
        DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
        DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
        DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
        DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
        DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;
        DELETE FROM public."ConjuntoActividadParcials" c WHERE c."ProgramacionDocenteId" is null;
        DELETE FROM public."ActividadParcials" act WHERE act."ConjuntoActividadParcialId" is null;`);
  } catch (error) {
    // se propaga el error lo captura el middleware. Es critica para abrir progdoc
    throw error;
  }
};

// borra toda la informacion de una programacion docente
const borrarPd = async pdID => {
  // eslint-disable-next-line no-useless-catch
  try {
    const dir = `${PATH_PDF}/pdfs/${getAnoPd(pdID)}/${getPlanPd(
      pdID
    )}/${getTipoPd(pdID)}/${getVersionPdNormalized(pdID)}`;
    await models.sequelize.query(
      `DELETE FROM public."ProgramacionDocentes" p  
      WHERE p."identificador" = :pdId; 
      DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
      DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
      DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
      DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
      DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;
      DELETE FROM public."ConjuntoActividadParcials" c WHERE c."ProgramacionDocenteId" is null;
      DELETE FROM public."ActividadParcials" act WHERE act."ConjuntoActividadParcialId" is null;`,
      { replacements: { pdId: pdID } }
    );
    await rimraf.sync(dir);
  } catch (error) {
    // se propaga el error lo captura el middleware. Es critica para abrir progdoc
    throw error;
  }
};

/**
 * Borrar las pds antiguas
 */
const borrarPdsAntiguas = async () => {
  try {
    const pds = await getAntiguasProgramacionDocentes();
    const results = [];
    for (const pd of pds) {
      results.push(borrarPd(pd.identificador));
    }
    await Promise.all(results);
  } catch (error) {
    console.error(error);
  }
};

exports.getPlanPd = getPlanPd;
exports.getAnoPd = getAnoPd;
exports.getTipoPd = getTipoPd;
exports.getVersionPd = getVersionPd;
exports.getVersionPdNumber = getVersionPdNumber;
exports.getVersionPdNormalized = getVersionPdNormalized;
exports.getVersionPdNormalizedWithoutV = getVersionPdNormalizedWithoutV;
exports.getProgramacionDocenteIdNormalizedAcronimo = getProgramacionDocenteIdNormalizedAcronimo;
exports.getProgramacionDocenteIdNormalized = getProgramacionDocenteIdNormalized;
exports.getProgramacionDocenteById = getProgramacionDocenteById;
exports.CumpleTodos = CumpleTodos;
exports.comprobarEstadoCumpleUno = comprobarEstadoCumpleUno;
exports.borrarPdsWithErrores = borrarPdsWithErrores;
exports.borrarPd = borrarPd;
exports.borrarPdsAntiguas = borrarPdsAntiguas;
