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

// convierte las aulas para poder ordenarlas bien
// por ejemplo B1 sera B00001
const prepareStringAula = aula => {
  const convertNumber = match => {
    return `00000${match}`.slice(-5);
  };
  return aula.replace(/\d+/g, convertNumber);
};

const getAllAulas = async () => {
  // eslint-disable-next-line no-useless-catch
  try {
    let aulas = await models.Aula.findAll({ raw: true });
    aulas = aulas.map(aula => {
      return { ...aula, aulaOrder: prepareStringAula(aula.identificador) };
    });
    aulas.sort((a, b) => (a.aulaOrder > b.aulaOrder ? 1 : -1));
    return aulas;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.createAula = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    const aulaToAnadir = {};
    // eslint-disable-next-line no-restricted-globals
    aulaToAnadir.cupo = isNaN(req.body.cupo) ? null : Number(req.body.cupo);
    aulaToAnadir.identificador = req.body.identificador
      .replace(/([/,_])/g, '-')
      .trim();
    try {
      const nToAnadir = models.Aula.build(aulaToAnadir);
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

exports.updateAula = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    const aulaToUpdate = {};
    // sino tiene asignaturaId se trata de una actividad de grupo
    // eslint-disable-next-line no-restricted-globals
    aulaToUpdate.cupo = isNaN(req.body.cupo) ? null : Number(req.body.cupo);
    aulaToUpdate.identificador = req.body.identificador
      .replace(/([/,_])/g, '-')
      .trim();
    try {
      await models.Aula.update(aulaToUpdate, {
        where: { identificador: req.params.id }
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

exports.deleteAula = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      await models.Aula.destroy({
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

// te da todos los grupos de las programciones docentes pasadas como array
// que tengan aula asignada
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

exports.getAulas = async (req, res, next) => {
  try {
    const aulas = await getAllAulas();
    res.render('aulas/aulas', {
      CONTEXT,
      permisoDenegado: res.locals.permisoDenegado || null,
      aulas,
      selectAulapath: `${req.baseUrl}/asignacion`
    });
  } catch (error) {
    console.error(error);
    next(error);
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

exports.getAsignacionAulas = async (req, res, next) => {
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
    let aulas = await getAllAulas();
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
          if (g.semestre === '1S') {
            if (!aulas1.find(obj => obj.aula === aula)) {
              const aulaOriginal = aulas.find(
                obj => obj.identificador === aula
              );
              aulas1.push({
                aula,
                aulaOrder: aulaOriginal.aulaOrder,
                cupo: aulaOriginal.cupo,
                planes: []
              });
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
              const aulaOriginal = aulas.find(
                obj => obj.identificador === aula
              );
              aulas2.push({
                aula,
                aulaOrder: aulaOriginal.aulaOrder,
                cupo: aulaOriginal.cupo,
                planes: []
              });
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
            if (g.semestre === '1S') {
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
      res.render('aulas/asignacionAulas', {
        CONTEXT,
        permisoDenegado: res.locals.permisoDenegado || null,
        aulas,
        aulas1,
        aulas2,
        gruposPorAula1,
        gruposPorAula2,
        ano1: String(ano1),
        ano2: String(ano2),
        anoSeleccionado: String(anoSeleccionado),
        generarPdfpath: `${req.baseUrl}/pdf`,
        selectAulapath: `${req.baseUrl}`
      });
    } else {
      aulas = cuatrimestreSeleccionado === '1S' ? aulas1 : aulas2;
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
      const [configPdfOptions, header, footer] = configPdf(false, null, null);
      let html = `<html><head>
            <link rel='stylesheet' href='stylesheets/pdf.css' />
        </head>
            `;
      html += `<body>
            <div id="pageHeader">
              ${header}
            </div>
            <div id="pageContent">
          `;
      html += htmlCode;
      html += `</div>
            <div id="pageFooter">
            ${footer}
          </div>
          </body>
        </html>`;
      let file = `aulas_${anoCodigo}_${cuatrimestreSeleccionado}.pdf`;
      file = `${anoCodigo}/aulas/${file}`;
      // console.error("the fileç: ", file);
      const ruta = `${PATH_PDF}/pdfs/${file}`;
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

exports.getAllAulas = getAllAulas;
