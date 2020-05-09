const Sequelize = require('sequelize');
const models = require('../models');

const op = Sequelize.Op;
const estados = require('../estados');
const funciones = require('../funciones');

// devuelve el tipo de la PD a partir del id
// PD_09TT_201819_I_v1
exports.getPlanPd = function(pdID) {
  return pdID ? pdID.split('_')[1] : null;
};

// devuelve el ano de la PD a partir del id
// PD_09TT_201819_I_v1
exports.getAnoPd = function(pdID) {
  return pdID ? pdID.split('_')[2] : null;
};

// devuelve el tipo de la PD a partir del id
// PD_09TT_201819_I_v1
exports.getTipoPd = function(pdID) {
  return pdID ? pdID.split('_')[3] : null;
};

// devuelve el version de la PD a partir del id: v1
// PD_09TT_201819_I_v1
function getVersionPd(pdID) {
  return pdID ? pdID.split('_')[4] : null;
}

// devuelve la version de la PD a partir del id normalizada: v001
function getVersionPdNormalized(pdID) {
  const v = getVersionPdNumber(pdID);
  return v ? `v${v.toString().padStart(3, '0')}` : null;
}

// devuelve el numero version de la PD a partir del id 1
// PD_09TT_201819_I_v1
function getVersionPdNumber(pdID) {
  const v = getVersionPd(pdID);
  return v ? Number(v.split('v')[1]) : null;
}
// devuelve el id de PD con version normalizada: PD_09TT_201819_I_v001
function getProgramacionDocenteIdNormalized(pdID) {
  if (pdID) {
    const pdIDArray = pdID.split('_');
    pdIDArray.splice(4, 1, getVersionPdNormalized(pdID));
    return pdIDArray.join('_');
  }
  return null;
}

// devuelve el id de PD con version normalizada y acronimo: PD_GITST_09TT_201819_I_v001
exports.getProgramacionDocenteIdNormalizedAcronimo = function(pdID, acronimo) {
  if (pdID && acronimo) {
    const pdIDNormalizedArray = getProgramacionDocenteIdNormalized(pdID).split(
      '_'
    );
    pdIDNormalizedArray.splice(1, 0, acronimo);
    return pdIDNormalizedArray.join('_');
  }
  return pdID;
};

exports.getProgramacionDocenteById = async function(pdID) {
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

function CumpleTodos(estado, objeto) {
  for (const variable in objeto) {
    if (objeto[variable] !== estado) {
      return false;
    }
  }
  return true;
}
// te devuelve la programacion docente sobre la que puede tocar una persona
exports.getProgramacionDocente = async function(req, res, next) {
  let { planID } = req.query;
  if (!planID) {
    planID = req.session.planID;
  }
  if (!planID) {
    planID = '09TT';
  }
  let { departamentoID } = req.query;
  if (!departamentoID) {
    departamentoID = req.session.departamentoID;
  }
  try {
    req.session.planID = planID;
    req.session.departamentoID = departamentoID;
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
      where: Sequelize.or({ nombre: planID }, { codigo: planID }),
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
          funciones.sortDepartamentos
        );
        if (!departamentoID) {
          if (depResponsables.length > 0) {
            req.session.departamentoID = depResponsables[0].codigo;
          } else {
            req.session.departamentoID = null;
          }
        }
      }
      next();
    } else {
      next();
    }
  } catch (error) {
    console.log('Error:', error);
    next(error);
  }
};

// TODO: cuando se añadan las otras funciones hay que ponerlas aquí
// para comprobar si la pd se puede marcar como lista para que el jefe de estudios la cierre
exports.isPDLista = async function(progID, thenFunction) {
  // eslint-disable-next-line no-useless-catch
  try {
    let nuevoEstado;
    const prog = await models.ProgramacionDocente.findOne({
      where: { identificador: progID },
      raw: true
    });
    if (
      prog.estadoProGDoc === estados.estadoProgDoc.abierto &&
      CumpleTodos(
        estados.estadoProfesor.aprobadoDirector,
        prog.estadoProfesores
      ) &&
      CumpleTodos(
        estados.estadoTribunal.aprobadoDirector,
        prog.estadoTribunales
      ) &&
      prog.estadoHorarios === estados.estadoHorario.aprobadoCoordinador &&
      prog.estadoExamenes === estados.estadoExamen.aprobadoCoordinador &&
      //calendario de actividades
      prog.estadoCalendario === estados.estadoCalendario.aprobadoCoordinador
    ) {
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

/*
da las ultimas pds existentes para el plan, tipoPD y ano
en caso de pasar la pdIDNoIncluir obvia esa, se utiliza para el pdf
estadoPD en caso de que se quiera el estado de la programación docente, si no a null
*/
exports.getProgramacionDocentesAnteriores = async function(
  plan,
  tipoPD,
  ano,
  pdIDNoIncluir,
  estadoPD
) {
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
      if (tipoPD === '1S' && ano >= progdoc.identificador.split('_')[2]) {
        if (progdoc.semestre === '1S' || progdoc.semestre === 'I') {
          pds.push(progdoc);
          break;
        }
      }
      if (tipoPD === '2S' && ano >= progdoc.identificador.split('_')[2]) {
        if (progdoc.semestre === '2S' || progdoc.semestre === 'I') {
          pds.push(progdoc);
          break;
        }
      }
      if (tipoPD === 'I' && ano >= progdoc.identificador.split('_')[2]) {
        if (progdoc.semestre === 'I' && I === false) {
          pds.push(progdoc);
          I = true;
          break;
        } else {
          if (
            progdoc.semestre === '1S' &&
            s1 === false &&
            ano >= progdoc.identificador.split('_')[2]
          ) {
            pds.push(progdoc);
            s1 = true;
          }
          if (
            progdoc.semestre === '2S' &&
            s2 === false &&
            ano >= progdoc.identificador.split('_')[2]
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

// te da las ultimas programaciones docentes de los planes pasados como array
// planes el codigo del plan
// tipoPD: 1S,2S no acepta I
// ano: 201819
exports.getAllProgramacionDocentes = async function(planes, tipoPD, ano) {
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
      if (pdsPlanes.length > 0) {
        continue;
      }
      /*
      el segundo elemento del if es para que coja la pd anterior o igual por si se quiere modificar
      una cuando ya se abrio otra mas nueva
      */
      if (tipoPD === '1S' && ano >= progdoc.identificador.split('_')[2]) {
        if (progdoc.semestre === '1S' || progdoc.semestre === 'I') {
          pdsPlanes.push(progdoc);
          continue;
        }
      }
      if (tipoPD === '2S' && ano >= progdoc.identificador.split('_')[2]) {
        if (progdoc.semestre === '2S' || progdoc.semestre === 'I') {
          pdsPlanes.push(progdoc);
          continue;
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

exports.CumpleTodos = CumpleTodos;
exports.getVersionPd = getVersionPd;
exports.getVersionPdNumber = getVersionPdNumber;
exports.getVersionPdNormalized = getVersionPdNormalized;
exports.getProgramacionDocenteIdNormalized = getProgramacionDocenteIdNormalized;
