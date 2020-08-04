const Sequelize = require('sequelize');
const models = require('../models');
const estados = require('../estados');
const enumsPD = require('../enumsPD');
const funciones = require('../funciones');

exports.getGrupos = async (req, res, next) => {
  req.session.submenu = 'Grupos';
  const view =
    req.session.menuBar === enumsPD.menuBar.consultar
      ? 'grupos/gruposConsultar'
      : 'grupos/gruposJE';
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentosResponsables: res.locals.departamentosResponsables,
      planEstudios: res.locals.planEstudios,
      grupos: null
    });
    // hay que comprobar que no sea una url de consultar.
  } else if (
    estados.estadoProgDoc.abierto !==
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
    estados.estadoProgDoc.incidencia !==
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
    req.session.menuBar !== enumsPD.menuBar.consultar
  ) {
    res.render('grupos/gruposJE', {
      existe:
        'Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada',
      permisoDenegado: res.locals.permisoDenegado || null,
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentosResponsables: res.locals.departamentosResponsables,
      planEstudios: res.locals.planEstudios,
      grupos: null
    });
  } else {
    try {
      const cursosConGrupos = [];
      const pdID = res.locals.progDoc['ProgramacionDocentes.identificador'];
      // obtengo los cursos que hay en el plan por las asignaturas que tiene el plan
      // eslint-disable-next-line no-undef
      const cursos = await models.sequelize.query(
        'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
        { replacements: { pdID } }
      );
      cursos[0].forEach(c => {
        const nuevoCurso = {};
        nuevoCurso.curso = Number(c.curso);
        switch (pdID.split('_')[3]) {
          case '1S':
            nuevoCurso.semestres = [{ semestre: 1, grupos: [] }];
            break;
          case '2S':
            nuevoCurso.semestres = [{ semestre: 2, grupos: [] }];
            break;
          default:
            nuevoCurso.semestres = [
              { semestre: 1, grupos: [] },
              { semestre: 2, grupos: [] }
            ];
            break;
        }

        cursosConGrupos.push(nuevoCurso);
      });
      const gs = await models.Grupo.findAll({
        where: {
          ProgramacionDocenteId: pdID
        },
        order: [[Sequelize.literal('"nombre"'), 'ASC']],
        raw: true
      });
      gs.forEach(g => {
        const curso = cursosConGrupos.find(obj => obj.curso === g.curso);
        if (curso) {
          const semestre = curso.semestres.find(
            obj => obj.semestre === Number(g.nombre.split('.')[1])
          );
          if (semestre) {
            semestre.grupos.push(g);
          }
        }
      });
      const nuevopath = `${req.baseUrl}/gestionGrupos/guardarGruposJE`;
      const cancelarpath = `${req.baseUrl}/gestionGrupos/getGrupos?planID=${req.session.planID}`;
      res.render(view, {
        permisoDenegado: res.locals.permisoDenegado || null,
        menu: req.session.menu,
        submenu: req.session.submenu,
        nuevopath,
        cancelarpath,
        planID: req.session.planID,
        departamentosResponsables: res.locals.departamentosResponsables,
        planEstudios: res.locals.planEstudios,
        grupos: cursosConGrupos,
        pdID
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }
};

// migrar a getGruposNuevo
exports.getGrupos2 = async pdID => {
  if (pdID) {
    // eslint-disable-next-line no-useless-catch
    try {
      const grupos = await models.Grupo.findAll({
        attributes: ['nombre', 'curso', 'grupoId', 'nombreItinerario', 'aula'],
        where: { ProgramacionDocenteId: pdID },
        order: [
          [Sequelize.literal('curso'), 'ASC'],
          [Sequelize.literal('nombre'), 'ASC']
        ],
        raw: true
      });
      return grupos;
    } catch (error) {
      // se propaga el error lo captura el middleware
      throw error;
    }
  } else {
    return null;
  }
};

exports.EliminarGruposJE = async (req, res, next) => {
  let toEliminar = req.body.eliminar;
  if (toEliminar && !res.locals.permisoDenegado) {
    try {
      const whereEliminar = {};
      const whereEliminar2 = {};
      if (!Array.isArray(toEliminar)) {
        toEliminar = [toEliminar];
      }
      whereEliminar.grupoId = [];
      whereEliminar2.GrupoId = [];
      toEliminar.forEach(element => {
        const grupoId = Number(element.split('_')[1]);
        whereEliminar.grupoId.push(grupoId);
        whereEliminar2.GrupoId.push(grupoId);
      });
      if (funciones.isEmpty(whereEliminar)) {
        whereEliminar.identificador = 'Identificador erróneo';
      }
      if (funciones.isEmpty(whereEliminar2)) {
        whereEliminar2.identificador = 'Identificador erróneo';
      }
      // antes de borrarlo de grupos voy a borrarlo de las asignaciones
      // de conjuntoActividadParcialGrupos ya se elemina solo
      await models.AsignacionProfesor.destroy({
        where: whereEliminar2
      });
      await models.Grupo.destroy({
        where: whereEliminar
      });
      next();
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

exports.ActualizarGruposJE = async (req, res, next) => {
  let toActualizar = req.body.actualizar;
  const promises = [];
  try {
    if (toActualizar && !res.locals.permisoDenegado) {
      if (!Array.isArray(toActualizar)) {
        toActualizar = [toActualizar];
      }
      const gruposToActualizar = [];
      toActualizar.forEach(element => {
        const grupoToActualizar = {};
        const grupoId = Number(element.split('_')[1]);
        const curso = Number(element.split('_')[3]);
        const nombre = element.split('_')[2];
        let capacidad = Number(req.body[`grupo_${nombre}_capacidad_${curso}`]);
        // eslint-disable-next-line no-restricted-globals
        if (isNaN(capacidad)) {
          capacidad = null;
        }
        const aula = req.body[`grupo_${nombre}_aula_${curso}`];
        const nombreItinerario =
          req.body[`grupo_${nombre}_nombreItinerario_${curso}`];
        grupoToActualizar.capacidad = capacidad;
        if (aula) {
          grupoToActualizar.aula = aula;
        }
        if (nombreItinerario) {
          grupoToActualizar.nombreItinerario = nombreItinerario;
        }
        gruposToActualizar.push(grupoToActualizar);
        promises.push(
          models.Grupo.update(grupoToActualizar, { where: { grupoId } })
        );
      });
    }
    await Promise.all(promises);
    next();
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.AnadirGruposJE = async (req, res, next) => {
  const { planID } = req.session;
  const { pdID } = req.body;
  let toAnadir = req.body.anadir;
  const gruposToAnadir = [];
  try {
    if (toAnadir && !res.locals.permisoDenegado) {
      if (!Array.isArray(toAnadir)) {
        toAnadir = [toAnadir];
      }
      toAnadir.forEach(element => {
        const nombre = element.split('_')[2];
        const newGrupo = {};
        newGrupo.curso = Number(element.split('_')[3]);
        newGrupo.nombre = nombre;
        newGrupo.capacidad = Number(
          req.body[`grupo_${nombre}_capacidad_${newGrupo.curso}`]
        );
        // eslint-disable-next-line no-restricted-globals
        if (isNaN(newGrupo.capacidad)) {
          newGrupo.capacidad = null;
        }
        newGrupo.aula = req.body[`grupo_${nombre}_aula_${newGrupo.curso}`];
        newGrupo.nombreItinerario =
          req.body[`grupo_${nombre}_nombreItinerario_${newGrupo.curso}`];
        newGrupo.ProgramacionDocenteId = pdID;
        gruposToAnadir.push(newGrupo);
      });
      await models.Grupo.bulkCreate(gruposToAnadir);
      req.session.save(() => {
        res.redirect(`${req.baseUrl}/gestionGrupos/getGrupos?planID=${planID}`);
      });
    } else {
      req.session.save(() => {
        res.redirect(`${req.baseUrl}/gestionGrupos/getGrupos?planID=${planID}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};
