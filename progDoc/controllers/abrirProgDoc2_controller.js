let models = require('../models');
let Sequelize = require('sequelize');
let estados = require('../estados');
const axios = require('axios');
let progDocController = require('./progDoc_controller');
let planController = require('./plan_controller')
let apiUpmController = require('./apiUpm_controller');
let funciones = require('../funciones');


exports.gestionProgDoc = async function (req, res, next) {
    req.session.submenu = "AbrirCerrar"
    let pds = [];
    //las susceptibles a incidencia son las anteriores. Lo importante es el orden. La unica excepcion es si la pd está cerrada o en incidencia que esta es la anterior
    let pdsAnteriores = [];
    let promises2 = [];
    let anos = [];
    try {
        //borras si hay algun error las pds que puedan tenerlos
        borrarPdsWithErrores();
        //la incidencia se marca sobre la pd anterior (no la versión anterior)
        let pdsBBDD = await models.ProgramacionDocente.findAll({
            order: [
                [Sequelize.literal('"PlanEstudioId"'), 'DESC'],
                [Sequelize.literal('"anoAcademico"'), 'DESC'],
                [Sequelize.literal('semestre'), 'DESC'],
                [Sequelize.literal('version'), 'DESC']
            ],
            raw: true
        })
        pdsBBDD.forEach(function (pdBBDD) {
            let existentePD = pds.find(function (obj) { return obj.PlanEstudioId === pdBBDD.PlanEstudioId });
            if (!existentePD) {
                pds.push({
                    PlanEstudioId: pdBBDD.PlanEstudioId, identificador: pdBBDD.identificador, estadoProGDoc: pdBBDD.estadoProGDoc, reabierto: pdBBDD.reabierto,
                    anoAcademico: pdBBDD.anoAcademico, siguienteAnoAcademico: funciones.siguienteAnoAcademico(pdBBDD.anoAcademico), semestre: pdBBDD.semestre,
                });
                //TODO: cuando se añadan las otras funciones hay que ponerlas aquí
                //para comprobar si la pd se puede marcar como lista para que el jefe de estudios la cierre
                //aqui lo hago por si manualmente cambio algo de las otras partes para que al acceder a gestión cambie
                if (pdBBDD['estadoProGDoc'] === estados.estadoProgDoc.abierto
                    && progDocController.CumpleTodos(estados.estadoProfesor.aprobadoDirector, pdBBDD['estadoProfesores'])
                    && progDocController.CumpleTodos(estados.estadoTribunal.aprobadoDirector, pdBBDD['estadoTribunales'])
                    && pdBBDD['estadoHorarios'] === estados.estadoHorario.aprobadoCoordinador
                    && pdBBDD['estadoExamenes'] === estados.estadoExamen.aprobadoCoordinador
                    && pdBBDD['estadoCalendario'] === estados.estadoCalendario.aprobadoCoordinador
                ) {
                    promises2.push(models.ProgramacionDocente.update(
                        { estadoProGDoc: estados.estadoProgDoc.listo }, /* set attributes' value */
                        { where: { identificador: pdBBDD.identificador } } /* where criteria */
                    )
                    )
                }
            } else {
                let existentePDAnterior = pdsAnteriores.find(function (obj) { return obj.PlanEstudioId === pdBBDD.PlanEstudioId });
                //solo habrá una pd susceptible de incidencia como mucho y no debe coincidir con el mismo año o semestre, esto es por si hay varias versiones. Además si la pdActual está cerrada o incidencia ya será la pdActual la de incidencia
                if (!existentePDAnterior && (pdBBDD.anoAcademico !== existentePD.anoAcademico || pdBBDD.semestre !== existentePD.semestre) && existentePD.estadoProgDoc !== estados.estadoProgDoc.cerrado && existentePD.estadoProgDoc !== estados.estadoProgDoc.incidencia) {
                    pdsAnteriores.push({
                        PlanEstudioId: pdBBDD.PlanEstudioId, identificador: pdBBDD.identificador, estadoProGDoc: pdBBDD.estadoProGDoc,
                        anoAcademico: pdBBDD.anoAcademico, semestre: pdBBDD.semestre,
                    });
                }
            }
        })
        // puede haber planes sin pd, como los nuevos planes u otras cosas
        res.locals.planEstudios.forEach(function (plan) {
            let existentePD = pds.find(function (obj) { return obj.PlanEstudioId === plan.codigo });
            if (existentePD) {
                existentePD.nombre = plan.nombre;
                existentePD.nombreCompleto = plan.nombreCompleto;
            }
            else {
                pds.push({
                    PlanEstudioId: plan.codigo, identificador: null, estadoProGDoc: estados.estadoProgDoc.cerrado, nombre: plan.nombre, nombreCompleto: plan.nombreCompleto,
                    anoAcademico: null, siguienteAnoAcademico: null, semestre: null
                }) //estado cerrado en caso de que no haya ninguan pd en el sistema
            }
        })
        //solo se van a mostrar los planes con acronimo
        pds = pds.filter(pd => pd.nombre && pd.nombre.trim() !== "");
        let year = new Date().getFullYear();
        let siguiente = year + 1;
        let siguiente2 = year + 2;
        anos.push("" + year + "" + siguiente.toString().substr(-2));
        anos.push("" + siguiente + "" + siguiente2.toString().substr(-2));
        await Promise.all(promises2)
        //si cambie alguna asignatura por el caso ese raro se deberá volver para obtener los datos.
        if (promises2.length > 0) {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        } else {
            res.render("gestionPlanes/abrirCerrarPds", {
                planes: res.locals.planEstudios,
                pds: pds,
                permisoDenegado: res.locals.permisoDenegado,
                pdsAnteriores: pdsAnteriores,
                estadosProgDoc: estados.estadoProgDoc,
                anos: anos,
                consultarpath: "" + req.baseUrl + "/consultar",
                abrirpath: "" + req.baseUrl + "/abrirProgDoc",
                cerrarpath: "" + req.baseUrl + "/cerrarProgDoc",
                abririncidenciapath: "" + req.baseUrl + "/abrirIncidenciaProgDoc",
                cerrarincidenciapath: "" + req.baseUrl + "/cerrarIncidenciaProgDoc",
                reabrirpath: "" + req.baseUrl + "/reabrirProgDoc",
                submenu: req.session.submenu,
                menu: req.session.menu,
                planID: req.session.planID,
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}


//se completa con lo que hay en el controller de abrirProgDoc_controller
//TODO a medida que aparezcan mas funciones hay que inicializar sus estados aquí
exports.abrirProgDoc = async function (req, res, next) {
    let estadoProfesores = {};
    let estadoTribunales = {};
    let nuevaEntrada = {};
    try {
        if (!res.locals.permisoDenegado) {
            res.locals.departamentosResponsables.forEach(function (element) {
                estadoProfesores[element] = estados.estadoProfesor.abierto;
                estadoTribunales[element] = estados.estadoTribunal.abierto;
            })
            nuevaEntrada.estadoProfesores = estadoProfesores;
            nuevaEntrada.fechaProfesores = new Date();
            nuevaEntrada.estadoTribunales = estadoTribunales;
            nuevaEntrada.fechaTribunales = new Date();
            nuevaEntrada.estadoHorarios = estados.estadoHorario.abierto;
            nuevaEntrada.fechaHorarios = new Date();
            nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.abierto;
            nuevaEntrada.fechaProgDoc = new Date();
            nuevaEntrada.fechaGrupos = new Date();
            nuevaEntrada.estadoExamenes = estados.estadoExamen.abierto;
            nuevaEntrada.fechaExamenes = new Date();
            nuevaEntrada.estadoCalendario = estados.estadoCalendario.abierto;
            nuevaEntrada.fechaCalendario = new Date();
            await models.ProgramacionDocente.update(
                nuevaEntrada, /* set attributes' value */
                { where: { identificador: res.locals.identificador } } /* where criteria */
            )
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}
//obtener la pd que se va a cerrar
exports.cerrarProgDoc = async function (req, res, next) {
    try {
        if (!res.locals.permisoDenegado) {
            let pdID = req.body.pdIdentificador.split("-")[1];
            let pd = await models.ProgramacionDocente.findOne(
                {
                    where: { identificador: pdID },
                    include: [{
                        model: models.PlanEstudio,
                        attributes: ['nombre', 'nombreCompleto'],
                    }],
                    raw: true
                }
            )
            res.locals.progDoc = pd
            next()

        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}
//TODO a medida que aparezcan mas funciones hay que inicializar sus estados aquí
exports.abrirIncidenciaProgDoc = async function (req, res, next) {
    try {
        if (!res.locals.permisoDenegado) {
            let estadoProfesores = {};
            let estadoTribunales = {};
            let nuevaEntrada = {};
            res.locals.departamentosResponsables.forEach(function (element) {
                estadoProfesores[element] = estados.estadoProfesor.aprobadoDirector;
                estadoTribunales[element] = estados.estadoProfesor.aprobadoDirector;
            })
            nuevaEntrada.estadoProfesores = estadoProfesores;
            nuevaEntrada.estadoTribunales = estadoTribunales;
            nuevaEntrada.estadoHorarios = estados.estadoHorario.aprobadoCoordinador;
            nuevaEntrada.estadoExamenes = estados.estadoExamen.aprobadoCoordinador;
            nuevaEntrada.estadoCalendario = estados.estadoCalendario.aprobadoCoordinador;
            nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.incidencia;
            nuevaEntrada.fechaProgDoc = new Date();
            nuevaEntrada.fechaProfesores = new Date();
            nuevaEntrada.fechaTribunales = new Date();
            nuevaEntrada.fechaHorarios = new Date()
            nuevaEntrada.fechaGrupos = new Date();
            nuevaEntrada.fechaExamenes = new Date();
            nuevaEntrada.fechaCalendario = new Date();
            await models.ProgramacionDocente.update(
                nuevaEntrada, /* set attributes' value */
                { where: { identificador: res.locals.identificador } } /* where criteria */
            )
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}
exports.cerrarIncidenciaProgDoc = async function (req, res, next) {
    try {
        if (!res.locals.permisoDenegado) {
            let pdID = req.body.pdIdentificador.split("-")[1];
            //debo guardarla para generar los csv de los examenes
            req.session.pdID = pdID
            let pd = await models.ProgramacionDocente.findOne(
                {
                    where: { identificador: pdID },
                    include: [{
                        model: models.PlanEstudio,
                        attributes: ['nombre', 'nombreCompleto'],
                    }],
                    raw: true
                }
            )
            res.locals.progDoc = pd
            next()
        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

exports.reabrirProgDoc = async function (req, res, next) {
    //debo quitar de la sesión el pdID que puse antes para ver los permisos por si hay algun error y no se reabre.
    req.session.pdID = null;
    let estadoProfesores = {};
    let estadoTribunales = {};
    try {
        if (!res.locals.permisoDenegado) {
            let nuevaEntrada = {};
            res.locals.departamentosResponsables.forEach(function (element) {
                estadoProfesores[element] = estados.estadoProfesor.abierto;
                estadoTribunales[element] = estados.estadoProfesor.abierto;
            })
            nuevaEntrada.estadoProfesores = estadoProfesores;
            nuevaEntrada.fechaProfesores = new Date();
            nuevaEntrada.estadoTribunales = estadoTribunales;
            nuevaEntrada.fechaTribunales = new Date();
            nuevaEntrada.estadoHorarios = estados.estadoHorario.abierto;
            nuevaEntrada.fechaHorarios = new Date();
            nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.abierto;
            nuevaEntrada.fechaProgDoc = new Date();
            nuevaEntrada.fechaGrupos = new Date();
            nuevaEntrada.estadoExamenes = estados.estadoExamen.abierto;
            nuevaEntrada.fechaExamenes = new Date();
            nuevaEntrada.estadoCalendario = estados.estadoCalendario.abierto;
            nuevaEntrada.fechaCalendario = new Date();
            nuevaEntrada.reabierto = 1;
            await models.ProgramacionDocente.update(
                nuevaEntrada, /* set attributes' value */
                { where: { identificador: res.locals.identificador } } /* where criteria */
            )
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        } else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }

}

//cerrar la progdoc
exports.cerrarProgDoc2 = async function (req, res, next) {
    try {
        let pdID = res.locals.progDoc['identificador']
        await models.ProgramacionDocente.update(
            {
                estadoProGDoc: estados.estadoProgDoc.cerrado,
                fechaProgDoc: new Date(),
                HistorialID: "url_" + pdID
            }, /* set attributes' value */
            { where: { identificador: pdID } } /* where criteria */
        )
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/AbrirCerrar")
        })
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

borrarPdsWithErrores = async function() {
    //borra todos las programaciones docentes con errores que no deberia haberlas y lo vacio que no deberia estar
    await models.sequelize.query(query = `DELETE FROM public."ProgramacionDocentes" p  WHERE p."estadoProGDoc" = -1; 
        DELETE FROM public."Grupos" g WHERE g."ProgramacionDocenteId" is null; 
        DELETE FROM public."Asignaturas" asign WHERE asign."ProgramacionDocenteIdentificador" is null; 
        DELETE FROM public."AsignacionProfesors" a WHERE a."GrupoId" is null;
        DELETE FROM public."Examens" e WHERE e."AsignaturaIdentificador" is null;
        DELETE FROM public."FranjaExamens" f WHERE f."ProgramacionDocenteId" is null;
        DELETE FROM public."ConjuntoActividadParcials" c WHERE c."ProgramacionDocenteId" is null;
        DELETE FROM public."ActividadParcials" act WHERE act."ConjuntoActividadParcialId" is null;`)
}

exports.borrarPdsWithErrores = borrarPdsWithErrores

