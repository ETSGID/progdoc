/* global PATH_PDF */
const path = require('path');
const Sequelize = require('sequelize');
const moment = require('moment');
const pdf = require('html-pdf');
const ejs = require('ejs');
const funciones = require('../funciones');
const enumsPD = require('../enumsPD');
const models = require('../models');
const progDocController = require('./progDoc_controller');
const examenController = require('./examen_controller');
const actividadParcialController = require('./actividadParcial_controller');
const cursoController = require('./curso_controller');

const op = Sequelize.Op;
// local
const base = path.resolve('public'); //  just relative path to absolute path
// despliegue¿?
const configPdfDraft = {
  format: 'A4', // allowed units: A3, A4, A5, Legal, Letter, Tabloid
  base: `file://${base}/`, // you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
  orientation: 'portrait', // portrait or landscape
  paginationOffset: 1, // Override the initial pagination number
  header: {
    height: '35mm',
    contents:
      '<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" alt="Politécnica" style="width:30mm;height:20mm;"><div class="draft"><p class="draftText">Borrador</div >'
  },
  footer: {
    height: '10mm',
    contents: {
      first: ' ',
      default:
        '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>' // fallback value
    }
  }
};
exports.configPdfDraft = configPdfDraft;
const configPdfCerrado = {
  format: 'A4', // allowed units: A3, A4, A5, Legal, Letter, Tabloid
  base: `file://${base}/`, // you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
  orientation: 'portrait', // portrait or landscape
  paginationOffset: 1, // Override the initial pagination number
  header: {
    height: '35mm',
    contents:
      '<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" alt="Politécnica" style="width:30mm;height:20mm;">'
  },
  footer: {
    height: '10mm',
    contents: {
      first: ' ',
      default:
        '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>' // fallback value
    }
  }
};
exports.configPdfCerrado = configPdfCerrado;
// pdID el identificador de pd
// tipoPDF puede ser pdfDraftGenerado si es pintar un draft o pdfCerrado
// calendario se le pasa la informacion de calendario
// eslint-disable-next-line consistent-return
async function generatePDFFile(pdID, tipoPDF, calendario) {
  const promises = [];
  const promises2 = [];
  const cursosConGrupos = [];
  const grupos = [];
  const profesores = [];
  const asignaturas = [];
  const asignaturasViejas = [];
  const asignacionsExamen = [];
  let pdsAnteriores = [];
  let anoFinal;
  let semestre;
  const plan = progDocController.getPlanPd(pdID);
  try {
    const pd = await models.PlanEstudio.findOne({
      where: { codigo: plan },
      raw: true,
      include: [
        {
          // incluye las asignaciones de profesores y los horarios.
          model: models.ProgramacionDocente,
          where: { identificador: pdID },
          // left join
          required: false
        }
      ]
    });
    anoFinal =
      2000 +
      Number(
        `${pd['ProgramacionDocentes.anoAcademico'][4]}${pd['ProgramacionDocentes.anoAcademico'][5]}`
      );
    semestre = pd['ProgramacionDocentes.semestre'];
    pd.version = pd['ProgramacionDocentes.version'];
    pd.anoAcademico = pd['ProgramacionDocentes.anoAcademico'];
    pd.semestre = progDocController.getTipoPd(pdID);
    pdsAnteriores = await progDocController.getProgramacionDocentesAnteriores(
      pdID.split('_')[1],
      pdID.split('_')[3],
      pdID.split('_')[2],
      pdID,
      null
    );
    const whereAsignaturas = [];
    whereAsignaturas.push(pdID);
    // voy a obtener el identificador del plan y de paso preparo el where para asignaturas
    for (const pdAnterior of pdsAnteriores) {
      whereAsignaturas.push(pdAnterior.identificador);
    }
    switch (semestre) {
      case 'I':
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S1_O,
          periodoNombre: `Periodo Ordinario 1º Semestre (Enero ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S1_E,
          periodoNombre: `Periodo Extraordinario 1º Semestre (Julio ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S2_O,
          periodoNombre: `Periodo Ordinario 2º Semestre (Junio ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S2_E,
          periodoNombre: `Periodo Extraordinario 2º Semestre (Julio ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        break;
      case '1S':
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S1_O,
          periodoNombre: `Periodo Ordinario 1º Semestre (Enero ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S1_E,
          periodoNombre: `Periodo Extraordinario 1º Semestre (Julio ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        break;
      case '2S':
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S2_O,
          periodoNombre: `Periodo Ordinario 2º Semestre (Junio ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        asignacionsExamen.push({
          periodo: enumsPD.periodoPD.S2_E,
          periodoNombre: `Periodo Extraordinario 2º Semestre (Julio ${anoFinal})`,
          asignaturas: [],
          examenes: []
        });
        break;
      default:
        break;
    }
    // obtengo los cursos que hay en el plan por las asignaturas que tiene el plan
    const promise1 = cursoController.getCursos(pdID);
    // busco las asignaturas con departamento responsable ya que son las que entran en los exámene
    const promise2 = models.Asignatura.findAll({
      where: {
        ProgramacionDocenteIdentificador: {
          [op.in]: whereAsignaturas
        },
        DepartamentoResponsable: {
          [op.ne]: null
        }
      },
      order: [
        [Sequelize.literal('"ProgramacionDocenteIdentificador"'), 'DESC'], // asi si hay asignaturas repes de 1S y 2S se queda con el 2S para el tribunal
        [Sequelize.literal('"curso"'), 'ASC'],
        [Sequelize.literal('"Examens.periodo"'), 'ASC'],
        [Sequelize.literal('"codigo"'), 'ASC']
      ],
      raw: true,
      include: [
        {
          // left join
          model: models.Examen
        }
      ]
    });
    const promise3 = models.Persona.findAll({
      attributes: ['identificador', 'email', 'nombre', 'apellido'],
      include: [
        {
          model: models.Profesor,
          required: true
        }
      ],
      raw: true
    });
    const promise4 = examenController.getFranjasExamenes(pdID);
    const promise5 = actividadParcialController.getAllActividadParcial([pdID]);
    promises.push(promise1);
    promises.push(promise2);
    promises.push(promise3);
    promises.push(promise4);
    promises.push(promise5);
    const [
      cursos,
      asignaturasConExamens,
      profesors,
      franjasExamen,
      conjuntoActividadesParcial
    ] = await Promise.all(promises);
    cursos.forEach(c => {
      const nuevoCurso = {};
      nuevoCurso.curso = Number(c);
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
      include: [
        {
          model: models.AsignacionProfesor // obtengo los horarios + asignacion profesores
        }
      ],
      /*
      el orden es importante porque sino la asignatura que tenga profesores asignados
      en otros grupos que no están en el horario aparecerían
      */
      order: [
        [Sequelize.literal('"grupoId"'), 'ASC'],
        [Sequelize.literal('"AsignacionProfesors.Dia"'), 'ASC'],
        [Sequelize.literal('"AsignacionProfesors.Nota"'), 'ASC']
      ],
      raw: true
    });
    gs.forEach(g => {
      const curso = cursosConGrupos.find(obj => obj.curso === g.curso);
      if (curso) {
        // eslint-disable-next-line no-shadow
        const semestre = curso.semestres.find(
          obj => obj.semestre === Number(g.nombre.split('.')[1])
        );
        if (semestre) {
          let grupo = semestre.grupos.find(
            obj => obj.grupoId === Number(g.grupoId)
          );
          if (!grupo) {
            const newGrupo = {};
            newGrupo.grupoId = g.grupoId;
            newGrupo.nombre = g.nombre;
            newGrupo.capacidad = g.capacidad;
            newGrupo.curso = g.curso;
            newGrupo.aula = g.aula;
            newGrupo.nombreItinerario = g.nombreItinerario;
            newGrupo.idioma = g.idioma;
            newGrupo.horarios = [];
            newGrupo.asignaturas = [];
            semestre.grupos.push(newGrupo);
            grupos.push(newGrupo);
            grupo = semestre.grupos.find(
              obj => obj.grupoId === Number(g.grupoId)
            );
          }
          let asignatura = grupo.asignaturas.find(
            obj =>
              obj.asignaturaId === Number(g['AsignacionProfesors.AsignaturaId'])
          );
          /*
          como el orden esta hecho para que muestre primero los que Dia y Nota
          sean distinto de null ahí es donde se considera que esa asignatura pertenece a ese grupo
          */
          if (
            !asignatura &&
            (g['AsignacionProfesors.Dia'] !== null ||
              (g['AsignacionProfesors.Nota'] &&
                g['AsignacionProfesors.AsignaturaId']))
          ) {
            const newAsignatura = {};
            newAsignatura.asignaturaId = Number(
              g['AsignacionProfesors.AsignaturaId']
            );
            newAsignatura.asignacions = [];
            grupo.asignaturas.push(newAsignatura);
            asignatura = grupo.asignaturas.find(
              obj =>
                obj.asignaturaId ===
                Number(g['AsignacionProfesors.AsignaturaId'])
            );
            /*
            puede ocurrir que una asignatura no esté incluida pero si tenga asignacion
            de profesor en ese grupo.
            en ese caso no se incluye porque sólo se van a mostrar las asignaturas
            que aparezcan en el horario o con nota en el horario
            */
          }
          if (g['AsignacionProfesors.ProfesorId'] !== null && asignatura) {
            asignatura.asignacions.push(g['AsignacionProfesors.ProfesorId']);
          }
          if (
            g['AsignacionProfesors.Dia'] !== null ||
            g['AsignacionProfesors.Nota']
          ) {
            const newHorario = {};
            newHorario.asignaturaId = g['AsignacionProfesors.AsignaturaId'];
            newHorario.dia = g['AsignacionProfesors.Dia'];
            newHorario.horaInicio = g['AsignacionProfesors.HoraInicio'];
            newHorario.duracion = g['AsignacionProfesors.Duracion'];
            newHorario.nota = g['AsignacionProfesors.Nota'];
            grupo.horarios.push(newHorario);
          }
        }
      }
    });

    asignaturasConExamens.forEach(asignaturaConExamen => {
      if (asignaturaConExamen.ProgramacionDocenteIdentificador === pdID) {
        const as = asignaturas.find(
          x => x.identificador === asignaturaConExamen.identificador
        );
        if (!as) {
          // TODO solo pasar las cosas que me interesan
          asignaturas.push(asignaturaConExamen);
        }
        const periodoExamen = asignaturaConExamen['Examens.periodo'];
        const p = asignacionsExamen.find(obj => obj.periodo === periodoExamen);
        if (p) {
          const nuevoExamen = {};
          nuevoExamen.asignatura =
            asignaturaConExamen.acronimo !== null
              ? asignaturaConExamen.acronimo
              : asignaturaConExamen.nombre;
          nuevoExamen.curso = asignaturaConExamen.curso;
          // debo convertir la fecha a formato dd/mm/yyyy
          nuevoExamen.fecha = `${
            asignaturaConExamen['Examens.fecha'].split('-')[2]
          }/${asignaturaConExamen['Examens.fecha'].split('-')[1]}/${
            asignaturaConExamen['Examens.fecha'].split('-')[0]
          }`;
          nuevoExamen.horaInicio = asignaturaConExamen['Examens.horaInicio'];
          nuevoExamen.duracion = asignaturaConExamen['Examens.duracion'];
          p.examenes.push(nuevoExamen);
        }
      } else {
        const as = asignaturasViejas.find(
          x =>
            x.identificador === asignaturaConExamen.identificador &&
            x.curso === asignaturaConExamen.curso &&
            x.creditos === asignaturaConExamen.creditos &&
            x.semestre === asignaturaConExamen.semestre
        );
        if (!as) {
          // TODO solo pasar las cosas que me interesan
          asignaturasViejas.push(asignaturaConExamen);
        }
      }
    });

    profesors.forEach(profesor => {
      let nombre = `${profesor.apellido}, ${profesor.nombre}`;
      const correo = profesor.email;
      const profesorId = profesor.identificador;
      const { identificador } = profesor;
      nombre = funciones.primerasMayusc(nombre);
      const prof = {
        nombre,
        correo,
        profesorId,
        identificador
      };
      profesores.push(prof);
    });
    promises2.push(
      new Promise((resolve, reject) => {
        // console.log("11");
        if (calendario.estado === 0) {
          ejs.renderFile(
            './views/pdfs/pdfAsignaturas.ejs',
            {
              asignaturas,
              asignaturasViejas,
              cursosConGrupos,
              profesores,
              calendario: [],
              array_dias: [],
              anoSeleccionado: progDocController.getAnoPd(pdID),
              estadoCalendario: 0,
              progDoc: pd
            },
            (err, str) => {
              if (err) {
                reject(err);
              } else {
                resolve(str);
              }
            }
          );
        } else {
          ejs.renderFile(
            './views/pdfs/pdfAsignaturas.ejs',
            {
              asignaturas,
              asignaturasViejas,
              cursosConGrupos,
              profesores,
              calendario: calendario.calendario,
              array_dias: calendario.array_dias,
              anoSeleccionado: progDocController.getAnoPd(pdID),
              estadoCalendario: 1,
              progDoc: pd
            },
            (err, str) => {
              if (err) {
                reject(err);
              } else {
                resolve(str);
              }
            }
          );
        }
      })
    );
    promises2.push(
      new Promise((resolve, reject) => {
        // console.log("22");
        ejs.renderFile(
          './views/pdfs/pdfGruposyHorarios.ejs',
          {
            asignaturas,
            cursosConGrupos,
            profesores,
            pdID
          },
          (err, str) => {
            if (err) {
              reject(err);
            } else {
              resolve(str);
            }
          }
        );
      })
    );
    promises2.push(
      new Promise((resolve, reject) => {
        // console.log("33");
        asignacionsExamen.forEach(as => {
          const fr = franjasExamen.find(obj => obj.periodo === as.periodo);
          // eslint-disable-next-line no-param-reassign
          as.franjas = fr.franjas;
          as.examenes.forEach(ex => {
            if (fr.franjas.length === 0) {
              // eslint-disable-next-line no-param-reassign
              ex.franja = '-';
            } else {
              // eslint-disable-next-line no-param-reassign
              ex.franja = examenController.isExamenInFranjas(ex, fr.franjas);
            }
          });
        });
        ejs.renderFile(
          './views/pdfs/pdfExamenes.ejs',
          {
            asignacionsExamen,
            franjasExamen,
            cursosConGrupos,
            pdID,
            periodos: enumsPD.periodoPD
          },
          (err, str) => {
            if (err) {
              console.log('error');
              reject(err);
            } else {
              // console.log("éxito!");
              resolve(str);
            }
          }
        );
      })
    );
    promises2.push(
      new Promise((resolve, reject) => {
        // console.log("44");
        ejs.renderFile(
          './views/pdfs/pdfActividades.ejs',
          {
            asignaturas,
            conjuntoActividadesParcial,
            grupos,
            cursos,
            moment
          },
          (err, str) => {
            if (err) {
              console.log('error');
              reject(err);
            } else {
              // console.log("éxito!");
              resolve(str);
            }
          }
        );
      })
    );
    const datos = await Promise.all(promises2);
    /*
    ojo el css del header y el footer no puede ir en el fichero
    pq no carga debe ir en el propio html
    */
    let html = `<html><head>
                        <link rel='stylesheet' href='stylesheets/pdf.css' />
                    </head>
                        `;
    html += ` <style>
                        .draft{
                            position:absolute;
                            z-index:0;
                            background:white;
                            display:block;
                            min-height:100%; 
                            min-width:100%;
                            margin-top: 20%;
                            color:yellow;
                        }
                        .draftText{
                        text-align:left;
                        color:lightgrey;
                        font-size:140px;
                        transform:rotate(-45deg);
                        -webkit-transform:rotate(-45deg);
                        }
                        </style>
                        <body>
                     `;
    datos.forEach(d => {
      html += d;
    });
    /*
    las imagenes que use en el encabezado o footer debo cargarlas antes
    y deben ser obtenidas de una url pq lo que te carga la dirección local es
    después del footer.
    html += `<img src="images/politecnica.jpg" alt="Politécnica" width="50" height="33">`
    */
    html +=
      '<img style="display:none" src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg">';

    html += '</body></html>';
    const fileName = tipoPDF.toLowerCase().includes('draft')
      ? `${pdID}_borrador.pdf`
      : `${pdID}.pdf`;
    const borrador = tipoPDF.toLowerCase().includes('draft') ? 'borrador/' : '';
    const file = `${progDocController.getAnoPd(
      pdID
    )}/${progDocController.getTipoPd(pdID)}/${progDocController.getPlanPd(
      pdID
    )}/${progDocController.getVersionPd(pdID)}/${borrador}${fileName}`;
    // console.log("the fileç: ", file);
    const ruta = `${PATH_PDF}/pdfs/${file}`;
    const configPdfOptions = tipoPDF.toLowerCase().includes('draft')
      ? configPdfDraft
      : configPdfCerrado;
    return {
      html,
      configPdfOptions,
      ruta,
      file,
      fileName
    };
  } catch (error) {
    console.log('Error:', error);
  }
}

exports.generarPDF = async function(req, res, next) {
  const view = req.originalUrl.toLowerCase().includes('consultar')
    ? 'pdfs/pdfDraftGenerado'
    : 'pdfCerrado';
  if (view === 'pdfs/pdfDraftGenerado') {
    req.session.submenu = 'PDF';
  }
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (
    view === 'pdfs/pdfDraftGenerado' &&
    (!res.locals.progDoc || !res.locals.departamentosResponsables)
  ) {
    res.render(view, {
      existe: 'Programación docente no abierta',
      menu: req.session.menu,
      submenu: req.session.submenu,
      planID: req.session.planID,
      departamentosResponsables: res.locals.departamentosResponsables,
      planEstudios: res.locals.planEstudios,
      grupos: null
    });
  } else {
    try {
      const pdID =
        res.locals.progDoc['ProgramacionDocentes.identificador'] ||
        res.locals.progDoc.identificador;
      const pdfDatos = await generatePDFFile(pdID, view, req.calendario);
      // eslint-disable-next-line
      pdf.create(pdfDatos.html, pdfDatos.configPdfOptions).toFile(pdfDatos.ruta, (err, resp) => {
          if (err) return console.log(err);
          switch (view) {
            case 'pdfs/pdfDraftGenerado':
              res.render(view, {
                file: pdfDatos.file,
                planID: req.session.planID,
                planEstudios: res.locals.planEstudios,
                pdID,
                menu: req.session.menu,
                submenu: req.session.submenu
              });
              break;
            case 'pdfCerrado':
              next();
              break;
            default:
              next();
              break;
          }
        });
    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  }
};
