let app = require('../app');
let configPdfCerrado = require('./pdf_controller').configPdfCerrado;
let models = require('../models');
let Sequelize = require('sequelize');
let ejs = require('ejs');
let pdf = require('html-pdf');
const op = Sequelize.Op;
let progDocController = require('./progDoc_controller');
const fs = require('fs');

const paletaColores = ["maroon", "#FF5733", "#47C242", "#942653", "darkgreen", "red", "blue", "#1B6A92", "#8D1B92", "#943026", '#42AFC2', '#946726', '#000000']

//le pasas un string y lo convierte en un int de 32 bits
const hashCode = function (s) {
    return s.split("").reduce(function (a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
}



/**
* Esta funcion se encarga de obtener los grupos que hay en cada aula y renderizar la página con el horario de las aulas.
* 
* @param {*} req 
* @param {*} res 
* @param {*} next 
*/

exports.getAulas = async function (req, res, next) {
    let anoSeleccionado = req.body.ano || req.query.ano;
    let cuatrimestreSeleccionado = req.body.cuatrimestre || "Primer cuatrimestre"
    let ano = (new Date()).toString().split(" ")[3];
    if ((new Date()).getMonth() < 8) {
        ano = String(parseInt(ano) - 1);
    }
    req.ano_mostrar = String(parseInt(ano) + 1);
    let ano1 = ano;
    let ano2 = parseInt(ano) + 1;
    if (anoSeleccionado === undefined) {
        anoSeleccionado = ano2;
    }
    let ano_codigo = anoSeleccionado + String(parseInt(anoSeleccionado) + 1).substring(2, 4);
    let planes = res.locals.planEstudios.map((obj) => {
        return obj.codigo
    })
    res.locals.planEstudios.forEach(plan => {
        plan.color = paletaColores[hashCode(plan.codigo) % paletaColores.length];
    });
    try {
        let p = await progDocController.getAllProgramacionDocentes(planes, "1S", ano_codigo)
        let p2 = await progDocController.getAllProgramacionDocentes(planes, "2S", ano_codigo)
        programacionesDocentes = planes.map((obj) => {
            if (p[obj].length !== 0 && p[obj] !== undefined) {
                return p[obj][0].identificador
            }
            else if (p2[obj].length !== 0 && p2[obj] !== undefined) {
                return p2[obj][0].identificador
            }
        })
        programacionesDocentes = programacionesDocentes.filter(function (element) {
            return element !== undefined;
        });

        gruposPorProgramacionDocente = await getAllGruposConAula(programacionesDocentes);
        let offsetDeDiasDeSemana = {
            "L": 0,
            "M": 13,
            "X": 26,
            "J": 39,
            "V": 52,
            "S": 65
        }
        let aulas1 = []
        let aulas2 = []
        let gruposPorAula1 = {}
        let gruposPorAula2 = {}
        for (programacionDocente of programacionesDocentes) {
            if (gruposPorProgramacionDocente[programacionDocente] === undefined || gruposPorProgramacionDocente[programacionDocente].length === 0) {
                continue;
            } else {
                for (grupoPorProgramacionDocente of gruposPorProgramacionDocente[programacionDocente]) {
                    let g = grupoPorProgramacionDocente
                    let planCode = progDocController.getPlanPd(g.ProgramacionDocenteId)
                    if (g.aula === null) {
                        return;
                    }
                    let aula = g.aula.split(".").join("").toLowerCase();
                    let aulaOrder = aula;
                    if (aula.length === 2) {
                        aulaOrder = aula[0] + "00" + aula[1];
                    } else if (aula.length === 3) {
                        aulaOrder = aula[0] + "0" + aula[1] + aula[2];
                    }
                    if (g.nombre.split(".")[1] === "1") {
                        if (!aulas1.find(obj => { return obj.aula === aula })) {
                            aulas1.push({ aula: aula, aulaOrder: aulaOrder, planes: [] })
                            gruposPorAula1[aula] = new Array(78)
                        }
                        let aulai = aulas1.find(obj => { return obj.aula === aula })
                        if (!aulai.planes.find(obj => { return obj.codigo === planCode })) {
                            aulai.planes.push(
                                {
                                    codigo: planCode,
                                    nombre: res.locals.planEstudios.find(function (obj) { return obj.codigo === planCode }).nombre || planCode,
                                    color: res.locals.planEstudios.find(function (obj) { return obj.codigo === planCode }).color,
                                    grupos: []
                                }
                            )
                        }
                        let gruposPlanAula = aulai.planes.find(obj => { return obj.codigo === planCode }).grupos
                        if (!gruposPlanAula.includes(g.nombre)) gruposPlanAula.push(g.nombre)
                    } else {
                        if (!aulas2.find(obj => { return obj.aula === aula })) {
                            aulas2.push({ aula: aula, aulaOrder:aulaOrder, planes: [] })
                            gruposPorAula2[aula] = new Array(78)
                        }
                        let aulai = aulas2.find(obj => { return obj.aula === aula })
                        if (!aulai.planes.find(obj => { return obj.codigo === planCode })) {
                            aulai.planes.push(
                                {
                                    codigo: planCode,
                                    nombre: res.locals.planEstudios.find(function (obj) { return obj.codigo === planCode }).nombre || planCode,
                                    color: res.locals.planEstudios.find(function (obj) { return obj.codigo === planCode }).color,
                                    grupos: []
                                }
                            )
                        }
                        let gruposPlanAula = aulai.planes.find(obj => { return obj.codigo === planCode }).grupos
                        if (!gruposPlanAula.includes(g.nombre)) gruposPlanAula.push(g.nombre)
                    }
                    let planCodigo = progDocController.getPlanPd(g.ProgramacionDocenteId);
                    let horarios = await models.AsignacionProfesor.findAll({
                        where: {
                            GrupoId: g.grupoId,
                            Dia: {
                                [op.ne]: null
                            },
                            HoraInicio: {
                                [op.ne]: null
                            }
                        },
                        include: [{
                            model: models.Asignatura,
                            attributes: ['nombre', 'acronimo'],
                            required: true //inner join
                        }],
                        raw: true
                    })
                    for (horario of horarios) {
                        let asignaturaNombre = horario["Asignatura.acronimo"] || horario["Asignatura.nombre"]
                        let offsetHora = parseInt(horario.HoraInicio.substring(0, 2)) - 8
                        let offsetTotal = offsetHora + offsetDeDiasDeSemana[horario.Dia]
                        if (g.nombre.split(".")[1] === "1") {
                            if (gruposPorAula1[aula][offsetTotal] === undefined) {
                                gruposPorAula1[aula][offsetTotal] = {}
                                gruposPorAula1[aula][offsetTotal].asignaturas = [asignaturaNombre];
                                gruposPorAula1[aula][offsetTotal].color = [res.locals.planEstudios.find(function (obj) { return obj.codigo === planCodigo }).color]

                            } else if (gruposPorAula1[aula][offsetTotal].asignaturas.includes(asignaturaNombre)) {
                                ;
                            } else {

                                gruposPorAula1[aula][offsetTotal].asignaturas.push(asignaturaNombre);
                                gruposPorAula1[aula][offsetTotal].color.push([res.locals.planEstudios.find(function (obj) { return obj.codigo === planCodigo }).color]);
                            }
                        } else {
                            if (gruposPorAula2[aula][offsetTotal] === undefined) {
                                gruposPorAula2[aula][offsetTotal] = {}
                                gruposPorAula2[aula][offsetTotal].asignaturas = [asignaturaNombre];
                                gruposPorAula2[aula][offsetTotal].color = [res.locals.planEstudios.find(function (obj) { return obj.codigo === planCodigo }).color]

                            } else if (gruposPorAula2[aula][offsetTotal].asignaturas.includes(asignaturaNombre)) {
                                ;
                            } else {

                                gruposPorAula2[aula][offsetTotal].asignaturas.push(asignaturaNombre);
                                gruposPorAula2[aula][offsetTotal].color.push([res.locals.planEstudios.find(function (obj) { return obj.codigo === planCodigo }).color]);
                            }
                        }
                    }

                }
            }
        }
        aulas1.sort((a, b) => (a.aulaOrder > b.aulaOrder) ? 1 : -1)
        aulas2.sort((a, b) => (a.aulaOrder > b.aulaOrder) ? 1 : -1)
        if (!req.body.generarPdf) {
            req.session.submenu = "Aulas";
            res.render('aulas/aulas', {
                contextPath: app.contextPath,
                permisoDenegado: res.locals.permisoDenegado,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                aulas1: aulas1,
                aulas2: aulas2,
                gruposPorAula1: gruposPorAula1,
                gruposPorAula2: gruposPorAula2,
                ano1: String(ano1),
                ano2: String(ano2),
                anoSeleccionado: String(anoSeleccionado),
                generarPdfpath: "" + req.baseUrl + "/gestion/aulas/generarPdf"
            });
        } else {
            let aulas = cuatrimestreSeleccionado === "1S" ? aulas1 : aulas2
            let gruposPorAula = cuatrimestreSeleccionado === "1S" ? gruposPorAula1 : gruposPorAula2
            let htmlCode = await new Promise(function (resolve, reject) {
                ejs.renderFile("./views/pdfs/pdfAulas.ejs",
                    {
                        aulas: aulas,
                        gruposPorAula: gruposPorAula
                    },
                    function (err, str) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(str);
                        }
                    }
                )
            })
            let html = `<html><head>
            <link rel='stylesheet' href='stylesheets/pdf.css' />
        </head>
            `
            html += htmlCode;
            html += `<img style="display:none" src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg">`
            html += `</body></html>`
            let file = `aulas_${ano_codigo}_${cuatrimestreSeleccionado}.pdf`;
            file = `${ano_codigo}/aulas/${file}`;
            //console.log("the fileç: ", file);
            let ruta = app.pathPDF + '/pdfs/' + file
            let configPdfOptions = configPdfCerrado
            //save file
            pdf.create(html, configPdfOptions).toFile(ruta, function (err, resp) {
                if (err) {console.log(err); res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })}
                res.json({ success: true, path: `${app.contextPath}/pdfs/${file}`  })
            })
        }
    } catch (error) {
        console.log("Error:", error);
        if (!req.body.generarPdf) {
            next(error);
        } else {
            res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar" })
        }

    }
}

//te da todos los grupos de las programciones docentes pasadas como array
async function getAllGruposConAula(progDocs) {
    let gruposPorProgramacionDocente = {}
    try {
        for (progDoc of progDocs) {
            let grupos = await models.Grupo.findAll({
                where: {
                    ProgramacionDocenteId: progDoc,
                    aula: {
                        [op.ne]: null,
                        [op.ne]: ""
                    }
                },
                raw: true
            })
            gruposPorProgramacionDocente[progDoc] = grupos;
        }
        return gruposPorProgramacionDocente;
    } catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }

}