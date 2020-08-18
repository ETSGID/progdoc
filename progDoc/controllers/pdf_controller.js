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

const configPdf = (draft, planNombre, pdId) => {
  const base = path.resolve('public'); //  just relative path to absolute path
  const styleHeader = 'margin:0; font-size: 6pt; text-align: center';
  const heightHeader = '35mm';
  const heightFooter = '10mm';
  const draftStyle = draft
    ? '<div class="draft"><p class="draftText">Borrador</div>'
    : '';
  const borrador = draft ? '(Borrador),' : '';
  let textoHeader = '';
  if (planNombre) {
    textoHeader += `<p style="${styleHeader}">${planNombre.toUpperCase()}</p>`;
  }
  textoHeader += `<p style="${styleHeader}">E.T.S. Ingenieros de Telecomunicación</p>
  <p style="${styleHeader}">`;
  if (pdId) {
    textoHeader += ` Versión ${progDocController.getVersionPdNormalizedWithoutV(
      pdId
    )}, `;
  }
  textoHeader += ` ${borrador}
    ${moment()
      .locale('es')
      .format('LL')}
    </p>`;
  /*
    las imagenes que use en el encabezado o footer no funcionan muy bien
    si tratas de cargarlas de alguna url no se ven o si usas las imagenes
    locales tampoco
    */
  const header = `
<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" style='width:30mm;height:20mm; float:left;'>
<div style="padding-top:5mm">
${textoHeader}
</div>
<div style="clear:both"></div>
${draftStyle}`;

  const footer = ``;

  return [
    {
      format: 'A4', // allowed units: A3, A4, A5, Legal, Letter, Tabloid
      base: `file://${base}/`, // you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
      orientation: 'portrait', // portrait or landscape
      paginationOffset: 1, // Override the initial pagination number
      header: {
        height: heightHeader
      },
      footer: {
        height: heightFooter,
        contents: {
          first: ' ',
          default:
            '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>' // fallback value
        }
      }
    },
    header,
    footer
  ];
};

// Funcion que genera un pdf de la programacion docente
// pdID el identificador de pd
// tipoPDF puede ser pdfDraftGenerado si es pintar un draft o pdfCerrado
// calendario se le pasa la informacion de calendario
// eslint-disable-next-line consistent-return
const generatePDFFile = async (pdID, tipoPDF, calendario) => {
  const promises = [];
  const promises2 = [];
  const cursosConGrupos = [];
  const grupos = [];
  const profesores = [];
  const asignaturas = [];
  // asignaturas de la anterior version de la programacion docente
  const asignaturasViejas = [];
  // asignaturas de la ultima version del curso anterior
  const asignaturasViejasAno = [];
  const asignacionsExamen = [];
  let planAcronimo;
  let planNombre;
  let pdsAnteriores = [];
  let pdsAnterioresAno = [];
  let anoFinal;
  let semestre;
  const plan = progDocController.getPlanPd(pdID);
  try {
    const pd = await models.PlanEstudio.findOne({
      where: { codigo: plan },
      raw: true,
      include: [
        {
          model: models.ProgramacionDocente,
          where: { identificador: pdID },
          // left join
          required: false
        }
      ]
    });
    planAcronimo = pd.nombre || plan;
    planNombre = pd.nombreCompleto;
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
      progDocController.getPlanPd(pdID),
      progDocController.getTipoPd(pdID),
      progDocController.getAnoPd(pdID),
      pdID,
      null
    );
    // Sino se incluye devolverá la ultima version del anio pasado
    pdsAnterioresAno = await progDocController.getProgramacionDocentesAnteriores(
      progDocController.getPlanPd(pdID),
      progDocController.getTipoPd(pdID),
      funciones.anteriorAnoAcademico(progDocController.getAnoPd(pdID)),
      pdID,
      null
    );
    const whereAsignaturas = [];
    whereAsignaturas.push(pdID);
    // obtener el identificador del plan y preparar el where para asignaturas
    for (const pdAnterior of pdsAnteriores) {
      whereAsignaturas.push(pdAnterior.identificador);
    }
    for (const pdAnterior of pdsAnterioresAno) {
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
        // asignaturas viejas
        // si pdsAnteriores coincide con pdsAnterioresAnio se incluye en ambas
        if (
          pdsAnteriores.find(
            pdAnterior =>
              pdAnterior.identificador ===
              asignaturaConExamen.ProgramacionDocenteIdentificador
          )
        ) {
          const as = asignaturasViejas.find(
            x => x.identificador === asignaturaConExamen.identificador
          );
          if (!as) {
            asignaturasViejas.push(asignaturaConExamen);
          }
        }
        if (
          pdsAnterioresAno.find(
            pdAnterior =>
              pdAnterior.identificador ===
              asignaturaConExamen.ProgramacionDocenteIdentificador
          )
        ) {
          const as = asignaturasViejasAno.find(
            x => x.identificador === asignaturaConExamen.identificador
          );
          if (!as) {
            asignaturasViejasAno.push(asignaturaConExamen);
          }
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
        ejs.renderFile(
          './views/pdfs/pdfAsignaturas.ejs',
          {
            asignaturas,
            asignaturasViejas,
            asignaturasViejasAno,
            cursosConGrupos,
            profesores,
            calendario: calendario.calendario || [],
            array_dias: calendario.array_dias || [],
            anoSeleccionado: progDocController.getAnoPd(pdID),
            calendarioEstado: calendario.estado,
            progDoc: pd,
            version: progDocController.getVersionPdNormalizedWithoutV(pdID)
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
              console.error('error');
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
              console.error('error');
              reject(err);
            } else {
              // console.error("éxito!");
              resolve(str);
            }
          }
        );
      })
    );
    const datos = await Promise.all(promises2);
    // si incluye palabra draft incluye el estilo de draft
    const [configPdfOptions, header, footer] = configPdf(
      tipoPDF.toLowerCase().includes('draft'),
      planNombre,
      pdID
    );
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
                </style>`;

    html += `<body>
              <div id="pageHeader">
                ${header}
              </div>
              <div id="pageContent">
            `;
    datos.forEach(d => {
      html += d;
    });
    html += `</div>
            <div id="pageFooter">
            ${footer}
          </div>
          </body>
        </html>`;
    let folder = '/';
    let folder2 = '';
    if (tipoPDF.toLowerCase().includes('draft')) {
      folder = '/borrador/';
      folder2 = '_borrador';
    }

    const fileName = `${progDocController.getProgramacionDocenteIdNormalizedAcronimo(
      pdID,
      planAcronimo
    )}${folder2}.pdf`;
    const file = `${progDocController.getAnoPd(
      pdID
    )}/${progDocController.getPlanPd(pdID)}/${progDocController.getTipoPd(
      pdID
    )}/${progDocController.getVersionPdNormalized(pdID)}${folder}${fileName}`;
    const ruta = `${PATH_PDF}/pdfs/${file}`;

    return {
      html,
      configPdfOptions,
      ruta,
      file,
      fileName
    };
  } catch (error) {
    console.error('Error:', error);
  }
};

exports.generarPDF = async (req, res, next) => {
  const view =
    req.session.menuBar === enumsPD.menuBar.consultar.nombre
      ? 'pdfs/pdfDraftGenerado'
      : 'pdfCerrado';
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (
    view === 'pdfs/pdfDraftGenerado' &&
    (!res.locals.progDoc || !res.locals.departamentosResponsables)
  ) {
    res.render(view, {
      existe: 'Programación docente no abierta',
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
          if (err) return console.error(err);
          switch (view) {
            case 'pdfs/pdfDraftGenerado':
              res.render(view, {
                file: pdfDatos.file,
                planEstudios: res.locals.planEstudios,
                pdID
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
      console.error('Error:', error);
      next(error);
    }
  }
};

exports.configPdf = configPdf;
