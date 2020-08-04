/* global PATH_PDF, CONTEXT */
const Sequelize = require('sequelize');
const ejs = require('ejs');
const pdf = require('html-pdf');
const { configPdf } = require('./pdf_controller');
const models = require('../models');

const op = Sequelize.Op;
const progDocController = require('./progDoc_controller');

const paletaColores = [
  'maroon',
  '#FF5733',
  'blue',
  '#942653',
  'darkgreen',
  '#8e402a',
  '#47C242',
  '#1A5E80',
  '#DC5B00',
  '#8B4513',
  '#002000'
];

// le pasas un string y lo convierte en un int de 32 bits
const hashCode = s => {
  return s.split('').reduce((a, b) => {
    // eslint-disable-next-line
    a = (a << 5) - a + b.charCodeAt(0);
    // eslint-disable-next-line
    return a & a;
  }, 0);
};

// te da todos los grupos de las programciones docentes pasadas como array
const getAllGruposConAula = async progDocs => {
  const gruposPorProgramacionDocente = {};
  // eslint-disable-next-line no-useless-catch
  try {
    for (const progDoc of progDocs) {
      // eslint-disable-next-line no-await-in-loop
      const grupos = await models.Grupo.findAll({
        where: {
          ProgramacionDocenteId: progDoc,
          aula: {
            [op.ne]: null,
            [op.ne]: ''
          }
        },
        raw: true
      });
      gruposPorProgramacionDocente[progDoc] = grupos;
    }
    return gruposPorProgramacionDocente;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

/**
 * Esta funcion se encarga de obtener los grupos que hay en cada aula
 * y renderizar la página con el horario de las aulas.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */

exports.getAulas = async (req, res, next) => {
  req.session.submenu = 'Aulas';
  let anoSeleccionado = req.body.ano || req.query.ano;
  const cuatrimestreSeleccionado =
    req.body.cuatrimestre || 'Primer cuatrimestre';
  let ano = new Date().toString().split(' ')[3];
  if (new Date().getMonth() < 8) {
    ano = String(parseInt(ano, 10) - 1);
  }
  req.ano_mostrar = String(parseInt(ano, 10) + 1);
  const ano1 = ano;
  const ano2 = parseInt(ano, 10) + 1;
  if (anoSeleccionado === undefined) {
    anoSeleccionado = ano2;
  }
  const anoCodigo =
    anoSeleccionado + String(parseInt(anoSeleccionado, 10) + 1).substring(2, 4);
  const planes = res.locals.planEstudios.map(obj => obj.codigo);
  res.locals.planEstudios.forEach(plan => {
    // eslint-disable-next-line no-param-reassign
    plan.color = paletaColores[hashCode(plan.codigo) % paletaColores.length];
  });
  try {
    const p = await progDocController.getAllProgramacionDocentes(
      planes,
      '1S',
      anoCodigo
    );
    const p2 = await progDocController.getAllProgramacionDocentes(
      planes,
      '2S',
      anoCodigo
    );
    let programacionesDocentes = planes.map(obj => {
      if (p[obj].length !== 0 && p[obj] !== undefined) {
        return p[obj][0].identificador;
      }
      if (p2[obj].length !== 0 && p2[obj] !== undefined) {
        return p2[obj][0].identificador;
      }
      return null;
    });
    programacionesDocentes = programacionesDocentes.filter(
      element => element !== undefined
    );

    const gruposPorProgramacionDocente = await getAllGruposConAula(
      programacionesDocentes
    );
    const offsetDeDiasDeSemana = {
      L: 0,
      M: 13,
      X: 26,
      J: 39,
      V: 52,
      S: 65
    };
    const aulas1 = [];
    const aulas2 = [];
    const gruposPorAula1 = {};
    const gruposPorAula2 = {};
    for (const programacionDocente of programacionesDocentes) {
      if (
        gruposPorProgramacionDocente[programacionDocente] === undefined ||
        gruposPorProgramacionDocente[programacionDocente].length === 0
      ) {
        // eslint-disable-next-line no-continue
        continue;
      } else {
        // eslint-disable-next-line
        for (const grupoPorProgramacionDocente of gruposPorProgramacionDocente[programacionDocente]) {
          const g = grupoPorProgramacionDocente;
          const planCode = progDocController.getPlanPd(g.ProgramacionDocenteId);
          if (g.aula === null) {
            return;
          }
          const { aula } = g;
          let aulaOrder = g.aula
            .split('.')
            .join('')
            .toLowerCase();
          if (aula.length === 2) {
            aulaOrder = `${aula[0]}00${aula[1]}`;
          } else if (aula.length === 3) {
            aulaOrder = `${aula[0]}0${aula[1]}${aula[2]}`;
          }
          if (g.nombre.split('.')[1] === '1') {
            if (!aulas1.find(obj => obj.aula === aula)) {
              aulas1.push({ aula, aulaOrder, planes: [] });
              gruposPorAula1[aula] = new Array(78);
            }
            const aulai = aulas1.find(obj => obj.aula === aula);
            if (!aulai.planes.find(obj => obj.codigo === planCode)) {
              aulai.planes.push({
                codigo: planCode,
                nombre:
                  res.locals.planEstudios.find(obj => obj.codigo === planCode)
                    .nombre || planCode,
                color: res.locals.planEstudios.find(
                  obj => obj.codigo === planCode
                ).color,
                grupos: []
              });
            }
            const gruposPlanAula = aulai.planes.find(
              obj => obj.codigo === planCode
            ).grupos;
            if (!gruposPlanAula.includes(g.nombre))
              gruposPlanAula.push(g.nombre);
          } else {
            if (!aulas2.find(obj => obj.aula === aula)) {
              aulas2.push({ aula, aulaOrder, planes: [] });
              gruposPorAula2[aula] = new Array(78);
            }
            const aulai = aulas2.find(obj => obj.aula === aula);
            if (!aulai.planes.find(obj => obj.codigo === planCode)) {
              aulai.planes.push({
                codigo: planCode,
                nombre:
                  res.locals.planEstudios.find(obj => obj.codigo === planCode)
                    .nombre || planCode,
                color: res.locals.planEstudios.find(
                  obj => obj.codigo === planCode
                ).color,
                grupos: []
              });
            }
            const gruposPlanAula = aulai.planes.find(
              obj => obj.codigo === planCode
            ).grupos;
            if (!gruposPlanAula.includes(g.nombre))
              gruposPlanAula.push(g.nombre);
          }
          const planCodigo = progDocController.getPlanPd(
            g.ProgramacionDocenteId
          );
          // eslint-disable-next-line no-await-in-loop
          const horarios = await models.AsignacionProfesor.findAll({
            where: {
              GrupoId: g.grupoId,
              Dia: {
                [op.ne]: null
              },
              HoraInicio: {
                [op.ne]: null
              }
            },
            include: [
              {
                model: models.Asignatura,
                attributes: ['nombre', 'acronimo'],
                required: true // inner join
              }
            ],
            raw: true
          });
          for (const horario of horarios) {
            const asignaturaNombre =
              horario['Asignatura.acronimo'] || horario['Asignatura.nombre'];
            const offsetHora =
              parseInt(horario.HoraInicio.substring(0, 2), 10) - 8;
            const offsetTotal = offsetHora + offsetDeDiasDeSemana[horario.Dia];
            if (g.nombre.split('.')[1] === '1') {
              if (gruposPorAula1[aula][offsetTotal] === undefined) {
                gruposPorAula1[aula][offsetTotal] = {};
                gruposPorAula1[aula][offsetTotal].asignaturas = [
                  asignaturaNombre
                ];
                gruposPorAula1[aula][offsetTotal].color = [
                  res.locals.planEstudios.find(obj => obj.codigo === planCodigo)
                    .color
                ];
              } else if (
                gruposPorAula1[aula][offsetTotal].asignaturas.includes(
                  asignaturaNombre
                )
              ) {
                // nada
              } else {
                gruposPorAula1[aula][offsetTotal].asignaturas.push(
                  asignaturaNombre
                );
                gruposPorAula1[aula][offsetTotal].color.push([
                  res.locals.planEstudios.find(obj => obj.codigo === planCodigo)
                    .color
                ]);
              }
            } else if (gruposPorAula2[aula][offsetTotal] === undefined) {
              gruposPorAula2[aula][offsetTotal] = {};
              gruposPorAula2[aula][offsetTotal].asignaturas = [
                asignaturaNombre
              ];
              gruposPorAula2[aula][offsetTotal].color = [
                res.locals.planEstudios.find(obj => obj.codigo === planCodigo)
                  .color
              ];
            } else if (
              gruposPorAula2[aula][offsetTotal].asignaturas.includes(
                asignaturaNombre
              )
            ) {
              // nada
            } else {
              gruposPorAula2[aula][offsetTotal].asignaturas.push(
                asignaturaNombre
              );
              gruposPorAula2[aula][offsetTotal].color.push([
                res.locals.planEstudios.find(obj => obj.codigo === planCodigo)
                  .color
              ]);
            }
          }
        }
      }
    }
    aulas1.sort((a, b) => (a.aulaOrder > b.aulaOrder ? 1 : -1));
    aulas2.sort((a, b) => (a.aulaOrder > b.aulaOrder ? 1 : -1));
    if (!req.body.generarPdf) {
      res.render('aulas/aulas', {
        CONTEXT,
        permisoDenegado: res.locals.permisoDenegado || null,
        menu: req.session.menu,
        submenu: req.session.submenu,
        planID: req.session.planID,
        aulas1,
        aulas2,
        gruposPorAula1,
        gruposPorAula2,
        ano1: String(ano1),
        ano2: String(ano2),
        anoSeleccionado: String(anoSeleccionado),
        generarPdfpath: `${req.baseUrl}/gestion/aulas/generarPdf`
      });
    } else {
      const aulas = cuatrimestreSeleccionado === '1S' ? aulas1 : aulas2;
      const gruposPorAula =
        cuatrimestreSeleccionado === '1S' ? gruposPorAula1 : gruposPorAula2;
      const htmlCode = await new Promise((resolve, reject) => {
        ejs.renderFile(
          './views/pdfs/pdfAulas.ejs',
          {
            aulas,
            gruposPorAula
          },
          (err, str) => {
            if (err) {
              reject(err);
            } else {
              resolve(str);
            }
          }
        );
      });
      let html = `<html><head>
            <link rel='stylesheet' href='stylesheets/pdf.css' />
        </head>
            `;
      html += htmlCode;
      html +=
        '<img style="display:none" src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg">';
      html += '</body></html>';
      let file = `aulas_${anoCodigo}_${cuatrimestreSeleccionado}.pdf`;
      file = `${anoCodigo}/aulas/${file}`;
      // console.error("the fileç: ", file);
      const ruta = `${PATH_PDF}/pdfs/${file}`;
      const configPdfOptions = configPdf(false, null, null);
      // save file
      // eslint-disable-next-line no-unused-vars
      pdf.create(html, configPdfOptions).toFile(ruta, (err, resp) => {
        if (err) {
          console.error(err);
          res.json({
            success: false,
            msg: 'Ha habido un error la acción no se ha podido completar'
          });
        }
        res.json({ success: true, path: `${CONTEXT}/pdfs/${file}` });
      });
    }
  } catch (error) {
    console.error('Error:', error);
    if (!req.body.generarPdf) {
      next(error);
    } else {
      res.json({
        success: false,
        msg: 'Ha habido un error la acción no se ha podido completar'
      });
    }
  }
};
