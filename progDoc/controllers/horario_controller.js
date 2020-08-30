const Sequelize = require('sequelize');
const models = require('../models');

const op = Sequelize.Op;
const estados = require('../estados');
const enumsPD = require('../enumsPD');
const helpers = require('../lib/helpers');
const progDocController = require('../controllers/progDoc_controller');
const grupoController = require('./grupo_controller');

// para obtener las notas definidas para el grupo completo no ligadas a asignatura
const getNotasGruposSinAsignatura = async gruposBBDD => {
  // eslint-disable-next-line no-useless-catch
  try {
    // eslint-disable-next-line no-param-reassign
    gruposBBDD = gruposBBDD.map(g => {
      // eslint-disable-next-line no-param-reassign
      g.asignaciones = [];
      return g;
    });
    const gruposBBDDIds = gruposBBDD.map(g => g.grupoId);
    const notas = await models.AsignacionProfesor.findAll({
      where: {
        AsignaturaId: { [op.eq]: null },
        GrupoId: { [op.in]: gruposBBDDIds },
        Nota: { [op.ne]: null }
      },
      raw: true
    });
    notas.forEach(nota => {
      const n = {};
      n.identificador = nota.identificador;
      n.nota = nota.Nota;
      // como nombre de asignatura se pone el nombre del grupo
      n.asignaturaAcronimo = gruposBBDD.find(
        obj => obj.grupoId === nota.GrupoId
      ).nombre;
      n.asignaturaNombre = 'Nota de grupo';
      n.asignaturaIdentificador = 'grupo';
      n.asignaturaCodigo = gruposBBDD.find(
        obj => obj.grupoId === nota.GrupoId
      ).nombre;
      gruposBBDD.find(obj => obj.grupoId === nota.GrupoId).asignaciones.push(n);
    });
    return gruposBBDD;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.getHorario = async (req, res, next) => {
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    const view =
      req.session.menuBar === enumsPD.menuBar.consultar.nombre
        ? 'horarios/horariosConsultar'
        : 'horarios/horariosCumplimentar';
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
      planEstudios: res.locals.planEstudios,
      asignacionsHorario: null
    });
    // hay que comprobar que no sea una url de consultar.
  } else if (
    estados.estadoHorario.abierto !==
      res.locals.progDoc['ProgramacionDocentes.estadoHorarios'] &&
    (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
      estados.estadoProgDoc.abierto ||
      res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] ===
        estados.estadoProgDoc.listo) &&
    req.session.menuBar !== enumsPD.menuBar.consultar.nombre
  ) {
    res.render('horarios/horariosCumplimentar', {
      estado:
        'Asignación de horarios ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y Jefatura de Estudios la apruebe',
      permisoDenegado: res.locals.permisoDenegado || null,
      planEstudios: res.locals.planEstudios,
      estadoHorarios: res.locals.progDoc['ProgramacionDocentes.estadoHorarios'],
      asignacionsHorario: null
    });
  } else {
    try {
      const asignacionsHorario = []; // asignaciones existentes
      const cursos = []; // array con los cursos por separado
      const asignaturas = []; // array con los acronimos de las asignaturas por separado
      let gruposBBDD;
      const { pdID } = req.session;
      gruposBBDD = await grupoController.getGruposAndAula(pdID);
      const gruposBBDDConNotas = await getNotasGruposSinAsignatura(gruposBBDD);
      // eslint-disable-next-line no-use-before-define
      getAsignacionHorario(pdID);
      gruposBBDD = gruposBBDDConNotas;
      // eslint-disable-next-line no-inner-declarations
      async function getAsignacionHorario(ProgramacionDocenteIdentificador) {
        /*
        busca las asignaturas con departamento responsable
        ya que son las que entran en el horario
        */
        const horarioAsignaturas = await models.Asignatura.findAll({
          where: {
            ProgramacionDocenteIdentificador,
            DepartamentoResponsable: {
              [op.ne]: null
            },
            semestre: {
              [op.ne]: null
            }
          },
          attributes: [
            'acronimo',
            'codigo',
            'curso',
            'identificador',
            'nombre',
            'semestre',
            'codigo'
          ],
          order: [
            [Sequelize.literal('"curso"'), 'ASC'],
            [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC'],
            [Sequelize.literal('"codigo"'), 'ASC']
          ],
          raw: true,
          include: [
            {
              // left join
              model: models.AsignacionProfesor,
              where: {
                ProfesorId: null // cojo las que no son de asignacion de profesores
              },
              required: false,
              attributes: [
                'Dia',
                'HoraInicio',
                'Duracion',
                'Nota',
                'GrupoId',
                'identificador'
              ],
              include: [
                {
                  model: models.Grupo,
                  attributes: ['nombre', 'semestre', 'tipo']
                }
              ]
            }
          ]
        });
        horarioAsignaturas.forEach(horarioAsignatura => {
          const GrupoNombre =
            horarioAsignatura['AsignacionProfesors.Grupo.nombre'];
          // lo convierto en string
          let c = asignacionsHorario.find(
            obj => obj.curso === horarioAsignatura.curso
          );
          // si el curso no está lo añado
          if (!c) {
            cursos.push(horarioAsignatura.curso);
            const cursoAsignacion = {};
            cursoAsignacion.curso = horarioAsignatura.curso;
            cursoAsignacion.semestres = [];
            let coincidenciasGrupos;
            let coincidenciasGrupos1;
            let coincidenciasGrupos2;
            switch (pdID.split('_')[3]) {
              case '1S':
                coincidenciasGrupos = gruposBBDD.filter(
                  gr =>
                    Number(gr.curso) === Number(horarioAsignatura.curso) &&
                    gr.semestre === '1S'
                );
                // al reformatear el codigo pongo el grupoCodigo y el grupoNombre
                coincidenciasGrupos = coincidenciasGrupos.map(e => {
                  e.grupoNombre = e.nombre;
                  e.grupoCodigo = e.grupoId;
                  e.asignaturas = [];
                  return e;
                });
                cursoAsignacion.semestres = [
                  { semestre: 1, grupos: coincidenciasGrupos }
                ];
                break;
              case '2S':
                coincidenciasGrupos = gruposBBDD.filter(
                  gr =>
                    Number(gr.curso) === Number(horarioAsignatura.curso) &&
                    gr.semestre === '2S'
                );
                coincidenciasGrupos = coincidenciasGrupos.map(e => {
                  e.grupoNombre = e.nombre;
                  e.grupoCodigo = e.grupoId;
                  e.asignaturas = [];
                  return e;
                });
                cursoAsignacion.semestres = [
                  { semestre: 2, grupos: coincidenciasGrupos }
                ];
                break;
              default:
                coincidenciasGrupos1 = gruposBBDD.filter(
                  gr =>
                    Number(gr.curso) === Number(horarioAsignatura.curso) &&
                    gr.semestre === '1S'
                );
                coincidenciasGrupos2 = gruposBBDD.filter(
                  gr =>
                    Number(gr.curso) === Number(horarioAsignatura.curso) &&
                    gr.semestre === '2S'
                );
                coincidenciasGrupos1 = coincidenciasGrupos1.map(e => {
                  e.grupoNombre = e.nombre;
                  e.grupoCodigo = e.grupoId;
                  e.asignaturas = [];
                  return e;
                });
                coincidenciasGrupos2 = coincidenciasGrupos2.map(e => {
                  e.grupoNombre = e.nombre;
                  e.grupoCodigo = e.grupoId;
                  e.asignaturas = [];
                  return e;
                });
                cursoAsignacion.semestres = [
                  { semestre: 1, grupos: coincidenciasGrupos1 },
                  { semestre: 2, grupos: coincidenciasGrupos2 }
                ];
                break;
            }
            asignacionsHorario.push(cursoAsignacion);
            c = asignacionsHorario.find(
              obj => obj.curso === horarioAsignatura.curso
            );
          }
          let asign = asignaturas.find(
            obj => obj.nombre === horarioAsignatura.nombre
          );
          if (!asign) {
            asign = {};
            asign.acronimo = horarioAsignatura.acronimo;
            asign.nombre = horarioAsignatura.nombre;
            asign.codigo = horarioAsignatura.codigo;
            asign.identificador = horarioAsignatura.identificador;
            asign.semestre = horarioAsignatura.semestre;
            asign.curso = horarioAsignatura.curso;
            let s1;
            let s2;
            switch (pdID.split('_')[3]) {
              case '1S':
                s1 =
                  horarioAsignatura.semestre === '1S' ||
                  horarioAsignatura.semestre === '1S-2S' ||
                  horarioAsignatura.semestre === 'A' ||
                  horarioAsignatura.semestre === 'I';
                s2 = false;
                break;
              case '2S':
                s1 = false;
                s2 =
                  horarioAsignatura.semestre === '2S' ||
                  horarioAsignatura.semestre === '1S-2S' ||
                  horarioAsignatura.semestre === 'A' ||
                  horarioAsignatura.semestre === 'I';
                break;
              default:
                s1 =
                  horarioAsignatura.semestre === '1S' ||
                  horarioAsignatura.semestre === '1S-2S' ||
                  horarioAsignatura.semestre === 'A' ||
                  horarioAsignatura.semestre === 'I';
                s2 =
                  horarioAsignatura.semestre === '2S' ||
                  horarioAsignatura.semestre === '1S-2S' ||
                  horarioAsignatura.semestre === 'A' ||
                  horarioAsignatura.semestre === 'I';
                break;
            }
            if (s1) {
              const sem = c.semestres.find(obj => obj.semestre === 1);
              for (let i = 0; i < sem.grupos.length; i++) {
                sem.grupos[i].asignaturas.push(asign);
              }
            }
            if (s2) {
              const sem = c.semestres.find(obj => obj.semestre === 2);
              for (let i = 0; i < sem.grupos.length; i++) {
                sem.grupos[i].asignaturas.push(asign);
              }
            }
            asignaturas.push(asign);
          }
          if (GrupoNombre) {
            const s = c.semestres.find(
              obj =>
                `${obj.semestre}S` ===
                horarioAsignatura['AsignacionProfesors.Grupo.semestre']
            );
            if (s) {
              // busco el grupo ya se inició
              const g = s.grupos.find(
                obj =>
                  obj.grupoId ===
                  horarioAsignatura['AsignacionProfesors.GrupoId']
              );
              // busco si está la asignatura
              if (g) {
                // mira si la asignacion no está vacía
                if (
                  horarioAsignatura['AsignacionProfesors.Dia'] !== null ||
                  horarioAsignatura['AsignacionProfesors.Nota'] !== null
                ) {
                  const asignacion = {};
                  asignacion.identificador =
                    horarioAsignatura['AsignacionProfesors.identificador'];
                  asignacion.dia = horarioAsignatura['AsignacionProfesors.Dia'];
                  asignacion.horaInicio =
                    horarioAsignatura['AsignacionProfesors.HoraInicio'];
                  asignacion.duracion =
                    horarioAsignatura['AsignacionProfesors.Duracion'];
                  asignacion.nota =
                    horarioAsignatura['AsignacionProfesors.Nota'];
                  asignacion.asignaturaAcronimo = horarioAsignatura.acronimo;
                  asignacion.asignaturaNombre = horarioAsignatura.nombre;
                  asignacion.asignaturaIdentificador =
                    horarioAsignatura.identificador;
                  asignacion.asignaturaCodigo = horarioAsignatura.codigo;
                  g.asignaciones.push(asignacion);
                }
              }
            }
          }
        });
        const cancelarpath = `${req.baseUrl}?planID=${req.session.planID}`;
        const nuevopath = req.baseUrl;
        const view =
          req.session.menuBar === enumsPD.menuBar.consultar.nombre
            ? 'horarios/horariosConsultar'
            : 'horarios/horariosCumplimentar';
        res.render(view, {
          asignacionsHorario,
          nuevopath,
          aprobarpath: `${req.baseUrl}/estado`,
          cancelarpath,
          pdID,
          permisoDenegado: res.locals.permisoDenegado || null,
          estadosHorario: estados.estadoHorario,
          estadosProgDoc: estados.estadoProgDoc,
          estadoHorarios:
            res.locals.progDoc['ProgramacionDocentes.estadoHorarios'],
          estadoProgDoc:
            res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
          planEstudios: res.locals.planEstudios
        });
      }
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }
};

exports.guardarHorarios = async (req, res) => {
  const whereEliminar = {};
  const { pdID } = req.session;
  const toEliminar = req.body.eliminarAsignacions;
  const promises = [];
  if (!res.locals.permisoDenegado) {
    try {
      const asignaturaAsignacions = await models.Asignatura.findAll({
        where: {
          ProgramacionDocenteIdentificador: pdID
        },
        attributes: ['identificador', 'DepartamentoResponsable'],
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
      if (toEliminar) {
        whereEliminar.identificador = [];
        toEliminar.forEach(element => {
          const asignacion = Number(element.asignacion);
          // comprobar que borra una asignacion de la asignatura y no cualquier otra
          const asig = asignaturaAsignacions.find(
            obj =>
              asignacion &&
              obj['AsignacionProfesors.identificador'] === asignacion
          );
          if (!asig || !asig['AsignacionProfesors.Dia']) {
            console.error('Intenta cambiar una nota o un profesor');
          } else {
            whereEliminar.identificador.push(asignacion);
          }
        });
        if (helpers.isEmpty(whereEliminar)) {
          whereEliminar.identificador = 'Identificador erróneo';
        }
        const promise1 = models.AsignacionProfesor.destroy({
          where: whereEliminar
        });
        promises.push(promise1);
      }
      const toAnadir = req.body.newAsignacions;
      const queryToAnadir = [];
      if (toAnadir) {
        toAnadir.forEach(element => {
          const nuevaEntrada = {};
          nuevaEntrada.Duracion = 60;
          nuevaEntrada.Dia = element.dia;
          nuevaEntrada.HoraInicio = element.horaInicio;
          nuevaEntrada.AsignaturaId = element.asignaturaId;
          nuevaEntrada.GrupoId = Number(element.grupoId);
          const asig = asignaturaAsignacions.find(
            obj =>
              nuevaEntrada.AsignaturaId &&
              obj.identificador === nuevaEntrada.AsignaturaId
          );
          if (!asig) {
            console.error('Ha intentado cambiar una asignatura que no puede');
          } else {
            queryToAnadir.push(nuevaEntrada);
          }
        });
        const promise2 = models.AsignacionProfesor.bulkCreate(queryToAnadir);
        promises.push(promise2);
      }
      await Promise.all(promises);
      res.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  } else {
    res.json({ success: true });
  }
};
// recibe la info de una nota nueva y la crea en la asignatura y grupo correspondiente
exports.guardarNota = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      const notaToAnadir = {};
      // sino tiene asignaturaId se trata de una nota de grupo
      // eslint-disable-next-line no-restricted-globals
      notaToAnadir.AsignaturaId = isNaN(req.body.asignaturaId)
        ? null
        : req.body.asignaturaId;
      notaToAnadir.GrupoId = req.body.grupoId;
      notaToAnadir.Nota = req.body.nota;
      const nToAnadir = models.AsignacionProfesor.build(notaToAnadir);
      const n = await nToAnadir.save();
      notaToAnadir.identificador = n.identificador;
      res.json({ success: true, accion: 'create', notaUpdate: notaToAnadir });
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

// recibe la info de una nota existente y la actualiza en la asignatura y grupo correspondiente
exports.updateNota = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      const notaToUpdate = {};
      // sino tiene asignaturaId se trata de una nota de grupo
      // eslint-disable-next-line no-restricted-globals
      notaToUpdate.AsignaturaId = isNaN(req.body.asignaturaId)
        ? null
        : req.body.asignaturaId;
      notaToUpdate.Nota = req.body.nota;
      await models.AsignacionProfesor.update(notaToUpdate, {
        where: { identificador: req.params.id }
      });
      res.json({ success: true, accion: 'update', notaUpdate: notaToUpdate });
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
// recibe la info de una nota existente y la elimina
exports.eliminarNota = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      await models.AsignacionProfesor.destroy({
        where: { identificador: req.params.id }
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

// get
exports.reenviar = (req, res) => {
  req.session.save(() => {
    res.redirect(
      `${req.baseUrl}?departamentoID=${req.session.departamentoID}&planID=${req.session.planID}`
    );
  });
};
// post
exports.aprobarHorarios = async (req, res, next) => {
  const { pdID } = req.session;
  const date = new Date();
  let estadoHorarios;
  try {
    const pd = await models.ProgramacionDocente.findOne({
      where: { identificador: pdID },
      attributes: ['estadoHorarios']
    });
    estadoHorarios = pd.estadoHorarios;
    if (!res.locals.permisoDenegado) {
      switch (estadoHorarios) {
        case estados.estadoHorario.abierto:
          estadoHorarios = estados.estadoHorario.aprobadoCoordinador;
          break;
        default:
          break;
      }
      await models.ProgramacionDocente.update(
        {
          estadoHorarios,
          fechaHorarios: date
        } /* set attributes' value */,
        { where: { identificador: pdID } } /* where criteria */
      );
      req.session.save(() => {
        progDocController.isPDLista(pdID, res.redirect(req.baseUrl));
      });
    } else {
      req.session.save(() => {
        res.redirect(req.baseUrl);
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};
