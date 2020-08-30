const Sequelize = require('sequelize');
const models = require('../models');
const estados = require('../estados');
const enumsPD = require('../enumsPD');
const aulaController = require('./aula_controller');
const progDocController = require('./progDoc_controller');

exports.getGrupos = async (req, res, next) => {
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    res.render('grupos/grupos', {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
      departamentosResponsables: res.locals.departamentosResponsables,
      planEstudios: res.locals.planEstudios,
      tipoGrupo: enumsPD.tipoGrupo,
      aulas: null,
      cursosConGrupos: null
    });
    // hay que comprobar que no sea una url de consultar.
  } else if (
    estados.estadoProgDoc.abierto !==
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
    estados.estadoProgDoc.incidencia !==
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] &&
    req.session.menuBar !== enumsPD.menuBar.consultar.nombre
  ) {
    res.render('grupos/grupos', {
      existe:
        'Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada',
      permisoDenegado: res.locals.permisoDenegado || null,
      departamentosResponsables: res.locals.departamentosResponsables,
      planEstudios: res.locals.planEstudios,
      tipoGrupo: enumsPD.tipoGrupo,
      aulas: null,
      cursosConGrupos: null
    });
  } else {
    try {
      const cursosConGrupos = [];
      const pdID = res.locals.progDoc['ProgramacionDocentes.identificador'];
      const aulas = await aulaController.getAllAulas();
      // cursos que hay en el plan por las asignaturas que tiene el plan
      // eslint-disable-next-line no-undef
      const cursos = await models.sequelize.query(
        'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
        { replacements: { pdID } }
      );
      cursos[0].forEach(c => {
        const nuevoCurso = {};
        nuevoCurso.curso = Number(c.curso);
        switch (progDocController.getTipoPd(pdID)) {
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
      const gs = await getGruposAndAula(pdID);
      gs.forEach(g => {
        const curso = cursosConGrupos.find(obj => obj.curso === g.curso);
        if (curso) {
          const semestre = curso.semestres.find(
            obj => `${obj.semestre}S` === g.semestre
          );
          if (semestre) {
            semestre.grupos.push(g);
          }
        }
      });
      res.render('grupos/grupos', {
        permisoDenegado: res.locals.permisoDenegado || null,
        departamentosResponsables: res.locals.departamentosResponsables,
        planEstudios: res.locals.planEstudios,
        tipoGrupo: enumsPD.tipoGrupo,
        aulas,
        cursosConGrupos,
        pdID
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }
};

// devuelve los grupos y el aula si tiene asignada aula
const getGruposAndAula = async pdID => {
  if (pdID) {
    // eslint-disable-next-line no-useless-catch
    try {
      const grupos = await models.Grupo.findAll({
        attributes: [
          'nombre',
          'curso',
          'tipo',
          'semestre',
          'grupoId',
          'nombreItinerario',
          'aula'
        ],
        where: { ProgramacionDocenteId: pdID },
        order: [
          [Sequelize.literal('curso'), 'ASC'],
          [Sequelize.literal('nombre'), 'ASC']
        ],
        raw: true,
        include: [
          {
            model: models.Aula,
            // left join
            required: false
          }
        ]
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

exports.createGrupo = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    const grupoToAnadir = {};
    // eslint-disable-next-line no-restricted-globals
    grupoToAnadir.nombre = req.body.nombre.trim();
    grupoToAnadir.nombreItinerario = req.body.nombreItinerario.trim() || null;
    // eslint-disable-next-line no-restricted-globals
    grupoToAnadir.tipo = isNaN(req.body.tipo)
      ? enumsPD.tipoGrupo.General
      : Number(req.body.tipo);
    grupoToAnadir.curso = Number(req.body.curso);
    grupoToAnadir.semestre = req.body.semestre;
    grupoToAnadir.aula = req.body.aula.trim() || null;
    grupoToAnadir.ProgramacionDocenteId = req.body.ProgramacionDocenteId;
    try {
      const nToAnadir = models.Grupo.build(grupoToAnadir);
      await nToAnadir.save();
      res.json({
        success: true
      });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};

exports.updateGrupo = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    const grupoToUpdate = {};
    grupoToUpdate.nombre = req.body.nombre.trim();
    grupoToUpdate.nombreItinerario = req.body.nombreItinerario.trim() || null;
    // eslint-disable-next-line no-restricted-globals
    grupoToUpdate.tipo = isNaN(req.body.tipo)
      ? enumsPD.tipoGrupo.General
      : Number(req.body.tipo);
    grupoToUpdate.aula = req.body.aula || null;
    try {
      await models.Grupo.update(grupoToUpdate, {
        where: { grupoId: req.params.id }
      });
      res.json({
        success: true
      });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};

exports.deleteGrupo = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      await models.Grupo.destroy({
        where: { grupoId: req.params.id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: false, msg: 'No tiene permiso' });
  }
};
exports.getGruposAndAula = getGruposAndAula;
