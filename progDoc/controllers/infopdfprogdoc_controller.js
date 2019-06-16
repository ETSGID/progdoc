let app = require('../app');
let path = require('path')
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let funciones = require('../funciones');
let pdf = require('html-pdf');
let fs = require('fs');
let ejs = require('ejs')
let menuProgDocController = require('../controllers/menuProgDoc_controller')
let examenController = require('../controllers/examen_controller')
//local
const base = path.resolve('public'); //  just relative path to absolute path 
//despliegue¿?
let configPdfDraft = {
    "format": "A4",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
    "base": `file://${base}/`,// you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
    "orientation": "portrait", // portrait or landscape
    paginationOffset: 1,       // Override the initial pagination number
    "header": {
        "height": "35mm",
        "contents": '<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" alt="Politécnica" style="width:30mm;height:20mm;">' + '<div class="draft"><p class="draftText">Borrador</div >'
    },
    "footer": {
        "height": "10mm",
        "contents": {
            first: ' ',
            default: '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>', // fallback value
        }
    },
}
let configPdfCerrado = {
    "format": "A4",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
    "base": `file://${base}/`,// you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
    "orientation": "portrait", // portrait or landscape
    paginationOffset: 1,       // Override the initial pagination number
    "header": {
        "height": "35mm",
        "contents": '<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" alt="Politécnica" style="width:30mm;height:20mm;">'
    },
    "footer": {
        "height": "10mm",
        "contents": {
            first: ' ',
            default: '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>', // fallback value
        }
    },
}

exports.generarPDF = function (req, res, next) {
    let view = req.originalUrl.toLowerCase().includes("consultar") ? "pdfDraftGenerado" : "pdfCerrado"
    if (view === "pdfDraftGenerado") {
        req.session.submenu = "PDF"
    }
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (view === "pdfDraftGenerado" && (!res.locals.progDoc || !res.locals.departamentosResponsables)) {
        res.render(view, {
            estado: "Programación docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: res.locals.planEstudios,
            grupos: null
        })
    }
    else if (view === "pdfDraftGenerado" && estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] && estados.estadoProgDoc.listo !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']) {
        res.render(view, {
            estado: "Programación docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: res.locals.planEstudios,
            grupos: null
        })
    } else {
        let promises = [];
        let promises2 = [];
        let cursosConGrupos = [];
        let profesores = [];
        let asignaturas = [];
        let asignaturasViejas = [];
        let asignacionsExamen = [];
        let franjasExamen = [];
        let pdsAnteriores = [];
        let pdID;
        let anoFinal;
        let semestre;
        switch (view) {
            case "pdfDraftGenerado":
                //console.log(2);
                pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
                anoFinal = 2000 + Number(res.locals.progDoc['ProgramacionDocentes.anoAcademico'][4] + "" + res.locals.progDoc['ProgramacionDocentes.anoAcademico'][5])
                semestre = res.locals.progDoc['ProgramacionDocentes.semestre']
                res.locals.progDoc.semestre = res.locals.progDoc['ProgramacionDocentes.semestre']
                res.locals.progDoc.version = res.locals.progDoc['ProgramacionDocentes.version']
                res.locals.progDoc.anoAcademico = res.locals.progDoc['ProgramacionDocentes.anoAcademico']
                break;
            case "pdfCerrado":
                pdID = res.locals.progDoc['identificador']
                anoFinal = 2000 + Number(res.locals.progDoc['anoAcademico'][4] + "" + res.locals.progDoc['anoAcademico'][5])
                semestre = res.locals.progDoc['semestre']
                res.locals.progDoc.nombreCompleto = res.locals.progDoc['PlanEstudio.nombreCompleto']
                break;
        }
        return menuProgDocController.getProgramacionDocentesAnteriores(pdID.split("_")[1], pdID.split("_")[3], pdID.split("_")[2], pdID, null)
            .then((pdis) => {
                pdsAnteriores = pdis;
                let whereAsignaturas = {};
                whereAsignaturas['$or'] = [];
                whereAsignaturas['$or'].push(pdID);
                //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
                for (let i = 0; i < pdsAnteriores.length; i++) {
                    whereAsignaturas['$or'].push(pdsAnteriores[i].identificador)
                }
                switch (semestre) {
                    case "I":
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre (Enero " + anoFinal + ")", asignaturas: [], examenes: [] })
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre (Junio " + anoFinal + ")", asignaturas: [], examenes: [] })
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                        break;
                    case "1S":
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre (Enero " + anoFinal + ")", asignaturas: [], examenes: [] })
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                        break;
                    case "2S":
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre (Junio " + anoFinal + ")", asignaturas: [], examenes: [] })
                        asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                        break;
                    default:
                        break;
                }
                //obtengo los cursos que hay en el plan por las asignaturas que tiene el plan
                let promise1 = models.sequelize.query(query = 'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
                    { replacements: { pdID: pdID } }
                ).then(cursos => {
                    cursos[0].forEach(function (c) {
                        let nuevoCurso = {}
                        nuevoCurso.curso = Number(c.curso)
                        switch (pdID.split("_")[3]) {
                            case '1S':
                                nuevoCurso.semestres = [{ semestre: 1, grupos: [] }];
                                break;
                            case '2S':
                                nuevoCurso.semestres = [{ semestre: 2, grupos: [] }];
                                break;
                            default:
                                nuevoCurso.semestres = [{ semestre: 1, grupos: [] }, { semestre: 2, grupos: [] }];
                                break;
                        }

                        cursosConGrupos.push(nuevoCurso);
                    })
                    return models.Grupo.findAll({
                        where: {
                            ProgramacionDocenteId: pdID
                        },
                        include: [{
                            model: models.AsignacionProfesor, //obtengo los horarios + asignacion profesores
                        }],
                        order: [
                            [Sequelize.literal('"grupoId"'), 'ASC'],
                        ],
                        raw: true
                    }).each((g) => {
                        let curso = cursosConGrupos.find(function (obj) { return obj.curso === g.curso; });
                        if (curso) {
                            let semestre = curso.semestres.find(function (obj) { return obj.semestre === Number(g.nombre.split(".")[1]) })
                            if (semestre) {
                                let grupo = semestre.grupos.find(function (obj) { return obj.grupoId === Number(g.grupoId) })
                                if (!grupo) {
                                    let newGrupo = {};
                                    newGrupo.grupoId = g.grupoId;
                                    newGrupo.nombre = g.nombre;
                                    newGrupo.capacidad = g.capacidad;
                                    newGrupo.curso = g.curso;
                                    newGrupo.aula = g.aula;
                                    newGrupo.nombreItinerario = g.nombreItinerario;
                                    newGrupo.idioma = g.idioma;
                                    newGrupo.horarios = [];
                                    newGrupo.asignaturas = [];
                                    semestre.grupos.push(newGrupo)
                                    grupo = semestre.grupos.find(function (obj) { return obj.grupoId === Number(g.grupoId) })
                                } let asignatura = grupo.asignaturas.find(function (obj) { return obj.asignaturaId === Number(g['AsignacionProfesors.AsignaturaId']) })
                                if (!asignatura && (g['AsignacionProfesors.ProfesorId'] !== null || (g['AsignacionProfesors.Dia'] !== null || (g['AsignacionProfesors.Nota'] && g['AsignacionProfesors.AsignaturaId'] )))) {
                                    let newAsignatura = {};
                                    newAsignatura.asignaturaId = Number(g['AsignacionProfesors.AsignaturaId'])
                                    newAsignatura.asignacions = [];
                                    grupo.asignaturas.push(newAsignatura)
                                    asignatura = grupo.asignaturas.find(function (obj) { return obj.asignaturaId === Number(g['AsignacionProfesors.AsignaturaId']) })
                                } if (g['AsignacionProfesors.ProfesorId'] !== null) {
                                    asignatura.asignacions.push(g['AsignacionProfesors.ProfesorId'])

                                } if (g['AsignacionProfesors.Dia'] !== null || g['AsignacionProfesors.Nota']) {
                                    let newHorario = {};
                                    newHorario.asignaturaId = g['AsignacionProfesors.AsignaturaId']
                                    newHorario.dia = g['AsignacionProfesors.Dia']
                                    newHorario.horaInicio = g['AsignacionProfesors.HoraInicio']
                                    newHorario.duracion = g['AsignacionProfesors.Duracion']
                                    newHorario.nota = g['AsignacionProfesors.Nota']
                                    grupo.horarios.push(newHorario);
                                }

                            }
                        }
                    })
                        .then((grupos) => {

                        })
                })
                //busco las asignaturas con departamento responsable ya que son las que entran en los exámene
                let promise2 = models.Asignatura.findAll({
                    where: {
                        ProgramacionDocenteIdentificador: whereAsignaturas,
                        DepartamentoResponsable: {
                            [op.ne]: null,
                        }
                    },
                    order: [
                        [Sequelize.literal('"ProgramacionDocenteIdentificador"'), 'DESC'], //asi si hay asignaturas repes de 1S y 2S se queda con el 2S para el tribunal
                        [Sequelize.literal('"curso"'), 'ASC'],
                        [Sequelize.literal('"Examens.periodo"'), 'ASC'],
                        [Sequelize.literal('"codigo"'), 'ASC']
                    ],
                    raw: true,
                    include: [{
                        //left join 
                        model: models.Examen,
                    }]
                })
                    .each(function (ej) {
                        if (ej['ProgramacionDocenteIdentificador'] === pdID) {
                            let as = asignaturas.find(function (x) { return x.identificador === ej.identificador; })
                            if (!as) {
                                //TODO solo pasar las cosas que me interesan
                                asignaturas.push(ej)
                            }
                            let periodoExamen = ej['Examens.periodo']
                            let p = asignacionsExamen.find(function (obj) { return obj.periodo === periodoExamen; });
                            if (p) {
                                let nuevoExamen = {};
                                nuevoExamen.asignatura = ej['acronimo'] !== null ? ej['acronimo'] : ej['nombre'];
                                nuevoExamen.curso = ej['curso'];
                                //debo convertir la fecha a formato dd/mm/yyyy
                                nuevoExamen.fecha = ej['Examens.fecha'].split("-")[2] + "/" + ej['Examens.fecha'].split("-")[1] + "/" + ej['Examens.fecha'].split("-")[0];
                                nuevoExamen.horaInicio = ej['Examens.horaInicio']
                                nuevoExamen.duracion = ej['Examens.duracion']
                                p.examenes.push(nuevoExamen)
                            }
                        } else {
                            let as = asignaturasViejas.find(function (x) { return (x.identificador === ej.identificador && x.curso === ej.curso && x.creditos === ej.creditos && x.semestre === ej.semestre) })
                            if (!as) {
                                //TODO solo pasar las cosas que me interesan
                                asignaturasViejas.push(ej)
                            }
                        }

                    })
                    .then(() => {
                    })
                let promise3 = models.Persona.findAll({
                    attributes: ['identificador', 'email', 'nombre', 'apellido'],
                    include: [{
                        model: models.Profesor,
                        required: true,
                    }],
                    raw: true
                })
                    .each(function (profesor) {
                        let nombre = profesor['apellido'] + ", " + profesor['nombre']
                        let correo = profesor['email']
                        let profesorId = profesor['identificador']
                        let identificador = profesor['identificador']
                        nombre = funciones.primerasMayusc(nombre);
                        let prof = { nombre: nombre, correo: correo, profesorId: profesorId, identificador: identificador }
                        profesores.push(prof);

                    })
                    .then(function (params) {


                    })

                let promise4 = examenController.getFranjasExamenes(pdID)
                    .then((franjas) => {
                        franjasExamen = franjas
                    })
                promises.push(promise1);
                promises.push(promise2);
                promises.push(promise3);
                promises.push(promise4);
                Promise.all(promises)
                    .then(() => {
                        promises2.push(
                            new Promise(function (resolve, reject) {
                                //console.log("11");
                                if(req.calendario.estado === 0){
                                    ejs.renderFile("./views/pdfs/pdfAsignaturas.ejs",
                                    {
                                        asignaturas: asignaturas,
                                        asignaturasViejas: asignaturasViejas,
                                        cursosConGrupos: cursosConGrupos,
                                        profesores: profesores,
                                        calendario: [],
                                        array_dias: [],
                                        anoSeleccionado: req.ano,
                                        estadoCalendario: 0,
                                        progDoc: res.locals.progDoc
                                    },
                                    function (err, str) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(str);
                                        }
                                    }
                                )
                                }else{
                                    ejs.renderFile("./views/pdfs/pdfAsignaturas.ejs",
                                    {
                                        asignaturas: asignaturas,
                                        asignaturasViejas: asignaturasViejas,
                                        cursosConGrupos: cursosConGrupos,
                                        profesores: profesores,
                                        calendario: req.calendario.calendario,
                                        array_dias: req.calendario.array_dias,
                                        anoSeleccionado: req.ano,
                                        estadoCalendario: 1,
                                        progDoc: res.locals.progDoc
                                    },
                                    function (err, str) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(str);
                                        }
                                    }
                                )
                                }
                                
                            })
                        )
                        promises2.push(
                            new Promise(function (resolve, reject) {
                                //console.log("22");
                                ejs.renderFile("./views/pdfs/pdfGruposyHorarios.ejs",
                                    {
                                        asignaturas: asignaturas,
                                        cursosConGrupos: cursosConGrupos,
                                        profesores: profesores,
                                        pdID: pdID
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
                        )
                        promises2.push(
                            new Promise(function (resolve, reject) {
                                //console.log("33");      
                                asignacionsExamen.forEach(function (as, index) {
                                    let fr = franjasExamen.find(function (obj) { return obj.periodo === as.periodo; });
                                    as.franjas = fr.franjas
                                    as.examenes.forEach(function (ex,index){
                                        if(fr.franjas.length === 0){
                                            ex.franja = '-'
                                        }else{
                                            ex.franja = isExamenInFranjas(ex,fr.franjas)
                                        }
                                    })
                                })
                                ejs.renderFile("./views/pdfs/pdfExamenes.ejs",
                                    {
                                        asignacionsExamen: asignacionsExamen,
                                        franjasExamen : franjasExamen,
                                        cursosConGrupos: cursosConGrupos,
                                        pdID: pdID,
                                        periodos: enumsPD.periodoPD,
                                    },
                                    function (err, str) {
                                        if (err) {
                                            console.log("error");
                                            reject(err);
                                        } else {
                                            //console.log("éxito!");
                                            resolve(str);
                                        }
                                    }
                                )
                            })
                        )
                        Promise.all(promises2)
                            .then(function (datos) {
                                //ojo el css del header y el footer no puede ir en el fichero pq no carga debe ir en el propio html
                                let html = `<html><head>
                    <link rel='stylesheet' href='stylesheets/pdf.css' />
                </head>
                    `
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
                 `
                                datos.forEach(function (d) {
                                    html += d;

                                })
                                //las imagenes que use en el encabezado o footer debo cargarlas antes y deben ser obtenidas de una url pq lo que te carga la dirección local es después del footer.
                                // html += `<img src="images/politecnica.jpg" alt="Politécnica" width="50" height="33">`
                                html += `<img style="display:none" src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg">`

                                html += `</body></html>`
                                let file = req.originalUrl.toLowerCase().includes("consultar") ? pdID + '_borrador.pdf' : pdID + '.pdf'
                                let borrador = req.originalUrl.toLowerCase().includes("consultar") ? 'borrador/' : ''
                                file = menuProgDocController.getAnoPd(pdID) + "/" + menuProgDocController.getTipoPd(pdID) + "/" + menuProgDocController.getPlanPd(pdID) + "/" + menuProgDocController.getVersionPd(pdID) + "/"  + borrador + file
                                //console.log("the fileç: ", file);
                                let ruta = app.pathPDF+'/pdfs/' + file
                                let options = {
                                    'text': 'draft',
                                    'dstPath': ruta
                                }
                                let configPdfOptions = req.originalUrl.toLowerCase().includes("consultar") ? configPdfDraft : configPdfCerrado
                                //console.log(html);
                                //console.log(configPdfOptions);
                                //console.log(ruta);
                                pdf.create(html, configPdfOptions).toFile(ruta, function (err, resp) {
                                    if (err) return console.log(err);
                                    //console.log("eeee" ,view);
                                    switch (view) {
                                        case "pdfDraftGenerado":
                                            //console.log("not next");
                                            res.render(view,
                                                {
                                                    file: file,
                                                    planID: req.session.planID,
                                                    planEstudios: res.locals.planEstudios,
                                                    pdID: pdID,
                                                    menu: req.session.menu,
                                                    submenu: req.session.submenu,
                                                    estado: null,
                                                });
                                            break;

                                        case "pdfCerrado":
                                            
                                            next();
                                            break;
                                    }

                                    /*res.render('pdfAsignaturas',{
                                        asignaturas: asignaturas,
                                        cursosConGrupos: cursosConGrupos,
                                        profesores: profesores
                                    },)*/
                                })
                            })
                            .catch(function (error) {
                                console.log("Error:", error);
                                next(error);
                            });
                    }).catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            }).catch(function (error) {
                console.log("Error:", error);
                next(error);
            });

    }
}

function isExamenInFranjas(examen, franjas) {    
    let duracion = +examen.duracion;
    let horaInicial = moment.duration(examen.horaInicio)
    let horaFinal = (moment.duration(horaInicial).add(duracion, "m"));
    if (franjas.length === 0) {
        //en este caso no hay franjas
        return false;
    }
    for (let i = 0; i < franjas.length; i++) {
        //encaja con un examen si la horaInicial es posterior o igual a la hora inicial de la period
        //y la hora final es anterior o igual a la hora de la period
        if ((horaInicial - moment.duration(franjas[i].horaInicio) >= 0) &&
            (horaFinal - moment.duration(franjas[i].horaInicio).add(franjas[i].duracion, "m") <= 0)) {
            return i + 1;
        }
    }
    return false;
}