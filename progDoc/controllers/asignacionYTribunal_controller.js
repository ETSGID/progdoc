let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');
let progDocController = require('./progDoc_controller');
let asignaturaController = require('./asignatura_controller');
let personaYProfesorController = require('./personaYProfesor_controller');
let grupoController = require('./grupo_controller');



// GET /respDoc/:pdID/:departamentoID
exports.getAsignaciones = async function (req, res, next) {
    req.session.submenu = "Profesores"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionProfesores/asignacionesConsultar" : "asignacionProfesores/asignacionesCumplimentar"
        res.render(view, {
            existe: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosProfesor: estados.estadoProfesor,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: res.locals.planEstudios
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (!comprobarEstadoCumpleUno(estados.estadoProfesor.abierto, res.locals.progDoc['ProgramacionDocentes.estadoProfesores'])
        && !comprobarEstadoCumpleUno(estados.estadoProfesor.aprobadoResponsable, res.locals.progDoc['ProgramacionDocentes.estadoProfesores'])
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("asignacionProfesores/asignacionesCumplimentar", {
            estado: "Asignación de profesores ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y el Jefe de Estudios la apruebe",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosProfesor: estados.estadoProfesor,
            estadosProgDoc: estados.estadoProgDoc,
            estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
            planEstudios: res.locals.planEstudios
        })
    } else {
        let asignacions;
        let gruposBBDD;
        let pdID = req.session.pdID;
        let departamentoID = req.session.departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });
        let profesores;
        if (!departamentoExisteEnElPlan) {
            let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionProfesores/asignacionesConsultar" : "asignacionProfesores/asignacionesCumplimentar"
            res.render(view, {
                existe: "El departamento seleccionado no es responsable de ninguna asignatura del plan, por favor escoja otro departamento en el cuadro superior",
                permisoDenegado: res.locals.permisoDenegado,
                profesores: null,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                departamentoID: req.session.departamentoID,
                departamentosResponsables: res.locals.departamentosResponsables,
                estadosProfesor: estados.estadoProfesor,
                estadosProgDoc: estados.estadoProgDoc,
                estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                planEstudios: res.locals.planEstudios
            })
        }
        else {
            if (res.locals.permisoDenegado) {
                let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionProfesores/asignacionesConsultar" : "asignacionProfesores/asignacionesCumplimentar"
                res.render(view, {
                    permisoDenegado: res.locals.permisoDenegado,
                    asignacion: null,
                    profesores: null,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    estadosProfesor: estados.estadoProfesor,
                    estadosProgDoc: estados.estadoProgDoc,
                    estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                    planEstudios: res.locals.planEstudios
                })
            }
            else {
                try {
                    gruposBBDD = await grupoController.getGrupos2(pdID);
                    profesores = await personaYProfesorController.getProfesores();
                    asignacions = await getAsignacion(pdID, departamentoID, profesores, pdID, gruposBBDD);
                    let nuevopath = "" + req.baseUrl + "/respdoc/editAsignacion"
                    //se usa cambiopath para cambiar a la asignacions de profesores por grupo o comun
                    let cambiopath = "" + req.baseUrl + "/respdoc/editAsignacion/cambioModo"
                    let view = req.originalUrl.toLowerCase().includes("consultar") ? "asignacionProfesores/asignacionesConsultar" : "asignacionProfesores/asignacionesCumplimentar"
                    res.render(view,
                        {
                            profesores: profesores,
                            asignacion: asignacions,
                            nuevopath: nuevopath,
                            cambiopath: cambiopath,
                            aprobarpath: "" + req.baseUrl + "/respDoc/aprobarAsignacion",
                            planID: req.session.planID,
                            estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                            estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                            pdID: pdID,
                            menu: req.session.menu,
                            submenu: req.session.submenu,
                            permisoDenegado: res.locals.permisoDenegado,
                            departamentoID: req.session.departamentoID,
                            departamentosResponsables: res.locals.departamentosResponsables,
                            estadosProfesor: estados.estadoProfesor,
                            estadosProgDoc: estados.estadoProgDoc,
                            planEstudios: res.locals.planEstudios
                        })
                }
                catch (error) {
                    console.log("Error:", error);
                    next(error);
                }
            }
        }

    }

}

// GET respDoc/editAsignacion/:pdID/:departamentoID/:acronimo
exports.editAsignacion = async function (req, res, next) {
    req.session.submenu = "Profesores2";
    let pdID = req.session.pdID;
    let departamentoID = req.session.departamentoID;
    let asignacions;
    let gruposBBDD;
    let profesores;
    //por defecto es acronimo pero si no hay debe ser el nombre TODO: cambiar a codigo
    let asignaturaIdentificador = Number(req.query.asignatura)
    if (!res.locals.permisoDenegado) {
        try {
            gruposBBDD = await grupoController.getGrupos2(pdID);
            profesores = await personaYProfesorController.getProfesores();
            asignacions = await getAsignacion(pdID, departamentoID, profesores, pdID, gruposBBDD);
            let asign = asignacions.find(function (obj) { return (obj.identificador === asignaturaIdentificador) });
            res.render('asignacionProfesores/asignacionesCumplimentarAsignatura',
                {
                    asign: asign,
                    pdID: pdID,
                    cancelarpath: "" + req.baseUrl + "/respDoc/profesores?planID=" + req.session.planID + "&departamentoID=" + departamentoID,
                    nuevopath: "" + req.baseUrl + "/respDoc/guardarAsignacion",
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    profesores: profesores,
                    estadosProfesor: estados.estadoProfesor,
                    estadosProgDoc: estados.estadoProgDoc,
                    estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                    planEstudios: res.locals.planEstudios,
                    //desde esta ventana solo se pueden añadir profesores al sistema.
                    onlyProfesor: true
                })

        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID)
        })
    }
}
// GET respDoc/editAsignacion/cambioModo
/*
cuando quieres cambiar de asignacions indivudal a comun
el cambiar a grupo comun copia todos los profesores de forma no repetida (dentro del mismo grupo), en todos los grupos
curso y mismo semestre sin diferenciar si en ellos se imparte o no, eso se asigna en el horario
tambien cambia el estado a asignatura a "N" para indicar este modo
----
cuando quieres cambiar de grupo comun a individual solo cambia el parametro estado a "S" deja todos los
profesores en todos los grupos.
*/
exports.changeModeAsignacion = async function (req, res, next) {
    let pdID = req.session.pdID;
    let departamentoID = req.session.departamentoID;
    let gruposBBDD;
    let queryToAnadir = []
    let profesoresIdNoRepetidos = [];
    let profesores;
    let asignacions;
    //por defecto es acronimo pero si no hay debe ser el nombre TODO: cambiar a codigo
    let asignaturaIdentificador = Number(req.query.asignatura);
    let modo = req.query.modo;
    let asign;
    if (!res.locals.permisoDenegado) {
        try {
            gruposBBDD = await grupoController.getGrupos2(pdID);
            profesores = await personaYProfesorController.getProfesores();
            asignacions = await getAsignacion(pdID, departamentoID, profesores, pdID, gruposBBDD);
            asign = asignacions.find(function (obj) { return (obj.identificador === asignaturaIdentificador) });
            if (modo === "N") {
                //se rellena el array con los profesores no repetidos
                //si el estado es S no se hace nada simplemente se cambia el modo.
                asign.grupos.forEach(function (g) {
                    g.profesors.forEach(function (p) {
                        if (!profesoresIdNoRepetidos.includes(p.identificador)) profesoresIdNoRepetidos.push(p.identificador)
                    })
                })
                //se añaden los profesores que no estaban en los grupos en los que puede existir la asignatura
                asign.grupos.forEach(function (g) {
                    profesoresIdNoRepetidos.forEach(function (p) {
                        let coincide = g.profesors.find(function (obj) { return obj.identificador === p });
                        if (!coincide) {
                            let nuevaEntrada = {};
                            nuevaEntrada.AsignaturaId = asign.identificador;
                            nuevaEntrada.ProfesorId = p;
                            nuevaEntrada.GrupoId = g.GrupoId;
                            queryToAnadir.push(nuevaEntrada);
                        }
                    })
                })
                await models.AsignacionProfesor.bulkCreate(
                    queryToAnadir
                )
            }
            //cambio el modo.
            await models.Asignatura.update(
                {
                    estado: modo,
                },
                { where: { identificador: asign.identificador } }
            )
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/respDoc/profesores")
            })
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        req.session.save(function () {
            res.redirect("" + req.baseUrl + "/respDoc/profesores")
        })
    }
}

async function getAsignacion(ProgramacionDocenteIdentificador, DepartamentoResponsable, profesores, pdID, gruposBBDD) {
    let asignacions = [];
    try {
        let asigns = await models.Asignatura.findAll({
            where: {
                //se obtendrá con req D510 1
                ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
                DepartamentoResponsable: DepartamentoResponsable,
                semestre: {
                    [op.ne]: null,
                }
            },
            attributes: ['acronimo', 'curso', 'CoordinadorAsignatura', 'identificador', 'nombre', 'semestre', 'codigo', 'estado'],
            order: [

                [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
                [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC']
            ],
            raw: true,
            include: [{
                //left join 
                model: models.AsignacionProfesor,
                required: false,
                attributes: ['ProfesorId', 'GrupoId', 'identificador', 'Dia', 'Nota'],
                include: [{
                    model: models.Grupo,
                    attributes: ['nombre', 'nombreItinerario'],
                }]
            }]
        })
        asigns.forEach((asigni) => {
            let asign = asignacions.find(function (obj) { return obj.nombre === asigni['nombre']; });
            if (!asign) {
                asign = {}
                let obj = profesores.find(function (obj) { return obj.identificador === asigni['CoordinadorAsignatura']; });
                if (!obj) {
                    obj = "No hay coordinador"
                }
                asign.acronimo = asigni.acronimo;
                asign.nombre = asigni.nombre;
                asign.codigo = asigni.codigo;
                asign.estado = asigni.estado;
                asign.identificador = asigni.identificador;
                asign.curso = asigni.curso;
                asign.coordinador = obj;
                asign.grupos = [];
                let s1 = asignaturaController.getSemestresAsignaturainPD(progDocController.getTipoPd(pdID), asigni.semestre)[0];
                let s2 = asignaturaController.getSemestresAsignaturainPD(progDocController.getTipoPd(pdID), asigni.semestre)[1];
                let coincidenciasGrupos = [];
                if (s1) {
                    coincidenciasGrupos = gruposBBDD.filter(
                        gr => (Number(gr.curso) === Number(asigni['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                    );
                }
                if (s2) {
                    coincidenciasGrupos = coincidenciasGrupos.concat(gruposBBDD.filter(
                        gr => (Number(gr.curso) === Number(asigni['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                    ));
                }
                for (let i = 0; i < coincidenciasGrupos.length; i++) {
                    let grupo = {};
                    grupo.GrupoNombre = coincidenciasGrupos[i].nombre
                    grupo.nombreItinerario = coincidenciasGrupos[i].nombreItinerario
                    grupo.grupoPerteneciente = false;
                    grupo.GrupoId = coincidenciasGrupos[i].grupoId
                    grupo.profesors = [];
                    asign.grupos.push(grupo)
                }
                asignacions.push(asign);
                asign = asignacions.find(function (obj) { return obj.nombre === asigni['nombre']; });
            }
            let grupo = asign['grupos'].find(function (obj) { return obj.GrupoId === asigni["AsignacionProfesors.GrupoId"]; });
            if (grupo) {
                if (asigni["AsignacionProfesors.Dia"] || asigni["AsignacionProfesors.Nota"]) {
                    grupo.grupoPerteneciente = true;
                }
                let profi = profesores.find(function (obj) { return obj.identificador === asigni["AsignacionProfesors.ProfesorId"]; });
                if (profi) {
                    let p = {};
                    p.identificador = profi.identificador;
                    p.nombre = profi.nombre;
                    p.nombreCorregido = profi.nombreCorregido;
                    p.asignacion = asigni["AsignacionProfesors.identificador"]
                    grupo.profesors.push(p)
                    grupo.profesors.sort(funciones.sortProfesorCorregido)
                }
            }
        })
        return asignacions;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

//POST respDoc/guardarAsignacion
exports.guardarAsignacion = async function (req, res, next) {
    let whereEliminar = {};
    let identificador = Number(req.body.asignaturaId);
    let pdID = req.session.pdID;
    let planID = req.session.planID;
    let departamentoID = req.session.departamentoID;
    let gruposBBDD = await grupoController.getGrupos2(pdID)
    let coordinador = req.body.coordinador ? Number(req.body.coordinador) : null
    try {
        let as = await models.Asignatura.findAll(
            {
                where: {
                    identificador: identificador,
                    ProgramacionDocenteIdentificador: pdID
                },
                attributes: ["identificador", "DepartamentoResponsable", "estado", "semestre", "curso"],
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.AsignacionProfesor,
                    //left join
                    required: false
                }],
                raw: true
            })
        //que es la progdoc correspondiente ya se ve en que debe de estar abierta / incidencia en el modulo de permisos
        if (!as[0] || !as[0].DepartamentoResponsable || as[0].DepartamentoResponsable !== departamentoID) {
            res.locals.permisoDenegado = "No tiene permiso contacte con el Jefe de Estudios si debería tenerlo" //lo unico que hara será saltarse lo siguiente 
        }
        if (!res.locals.permisoDenegado) {
            if (coordinador || !req.body.coordinador) {
                await models.Asignatura.update(
                    { CoordinadorAsignatura: coordinador }, /* set attributes' value */
                    { where: { identificador: identificador } } /* where criteria */
                )
            }
            paso2();
            async function paso2() {
                let toEliminar = req.body.eliminar
                if (toEliminar) {
                    //hago esto para comprobar que la condicion para borrar es que paso un id no otra condición, y además debo pasar un número. Además si le pasa algo a null nunca voy a tener la condición
                    if (!Array.isArray(toEliminar)) {
                        toEliminar = [toEliminar]
                    }
                    whereEliminar.identificador = [];
                    toEliminar.forEach(function (element, index) {
                        let asignacions = Number(element.split("_")[2])
                        let asig = as.find(function (obj) { return (asignacions && obj['AsignacionProfesors.identificador'] === asignacions) })
                        if (!asig || !asig['AsignacionProfesors.ProfesorId']) {
                            console.log("Intenta cambiar una nota o un horario")
                        } else {
                            //si esta la opcion de grupo comun
                            if (asig.estado === "N") {
                                //se deben coger todas las asignaciones de profesor de dicha asignatura
                                let coincidencias = as.filter(a => (a['AsignacionProfesors.ProfesorId'] === asig['AsignacionProfesors.ProfesorId']));
                                coincidencias.forEach(function (c, index) { whereEliminar.identificador.push(c['AsignacionProfesors.identificador']) })
                            } else {
                                whereEliminar.identificador.push(asignacions);
                            }
                        }
                    });

                    funciones.isEmpty(whereEliminar) === true ? whereEliminar.identificador = "Identificador erróneo" : whereEliminar = whereEliminar;
                    await models.AsignacionProfesor.destroy({
                        where: whereEliminar
                    })
                }
                paso3();
                async function paso3() {
                    let toAnadir = req.body.anadir;
                    let queryToAnadir = []
                    let asig = as.find(function (obj) { return (obj['identificador'] === identificador) })
                    let s1 = asignaturaController.getSemestresAsignaturainPD(progDocController.getTipoPd(pdID), asig.semestre)[0];
                    let s2 = asignaturaController.getSemestresAsignaturainPD(progDocController.getTipoPd(pdID), asig.semestre)[1];
                    //coincidencias de grupos a los que podria pertenecer la asignatura
                    let coincidencias = []
                    if (s1) {
                        coincidencias = gruposBBDD.filter(
                            gr => (Number(gr.curso) === Number(asig['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                        );
                    }
                    if (s2) {
                        coincidencias = coincidencias.concat(gruposBBDD.filter(
                            gr => (Number(gr.curso) === Number(asig['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                        ));

                    }
                    if (toAnadir) {
                        if (!Array.isArray(toAnadir)) {
                            toAnadir = [toAnadir]
                        }
                        toAnadir.forEach(function (element, index) {
                            let profesor = element.split("_")[3]
                            let grupoId = element.split("_")[2]
                            if (!isNaN(grupoId)) {
                                grupoId = Number(grupoId)
                                //si esta la opcion de grupo comun
                                if (asig.estado === "N") {
                                    coincidencias.forEach(function (c, index) {
                                        let nuevaEntrada = {};
                                        nuevaEntrada.AsignaturaId = identificador;
                                        nuevaEntrada.ProfesorId = profesor;
                                        nuevaEntrada.GrupoId = c.grupoId;
                                        queryToAnadir.push(nuevaEntrada);
                                    })
                                } else {
                                    let nuevaEntrada = {};
                                    nuevaEntrada.AsignaturaId = identificador;
                                    nuevaEntrada.ProfesorId = profesor;
                                    nuevaEntrada.GrupoId = grupoId;
                                    queryToAnadir.push(nuevaEntrada);
                                }
                            }
                        });
                    }
                    await models.AsignacionProfesor.bulkCreate(
                        queryToAnadir
                    )
                    req.session.save(function () {
                        res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planID=" + planID)
                    })
                }
            }
        }

        else {
            req.session.save(function () {
                res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planID=" + planID)
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }

}


// post respDoc/aprobarAsignacion:pdID
exports.aprobarAsignacion = async function (req, res, next) {
    let pdID = req.session.pdID;
    let departamentoID = req.session.departamentoID;
    let date = new Date();
    let estadoProfesores;
    try {
        let pd = await models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoProfesores"] })
        estadoProfesores = pd['estadoProfesores']
        if (!res.locals.permisoDenegado) {
            switch (estadoProfesores[departamentoID]) {
                case (estados.estadoProfesor.abierto):
                    estadoProfesores[departamentoID] = estados.estadoProfesor.aprobadoResponsable;
                    break;
                case (estados.estadoProfesor.aprobadoResponsable):
                    req.body.decision !== 'aceptar' ? estadoProfesores[departamentoID] = estados.estadoProfesor.abierto : estadoProfesores[departamentoID] = estados.estadoProfesor.aprobadoDirector
                    break;
            }
            await models.ProgramacionDocente.update(
                {
                    estadoProfesores: estadoProfesores,
                    fechaProfesores: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            )
            req.session.save(function () {
                progDocController.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/profesores"))
            })
        } else {
            req.session.save(function () {
                progDocController.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/profesores"))
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

// GET respDoc/tribunales:pdID/:departamentoID
exports.getTribunales = async function (req, res, next) {
    req.session.submenu = "Tribunales";
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunales/tribunalesConsultar" : "tribunales/tribunalesCumplimentar"
        res.render(view, {
            existe: "Programación docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosTribunal: estados.estadoTribunal,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: res.locals.planEstudios,
            //desde esta ventana solo se pueden añadir profesores al sistema.
            onlyProfesor: true
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (!comprobarEstadoCumpleUno(estados.estadoTribunal.abierto, res.locals.progDoc['ProgramacionDocentes.estadoTribunales'])
        && !comprobarEstadoCumpleUno(estados.estadoTribunal.aprobadoResponsable, res.locals.progDoc['ProgramacionDocentes.estadoTribunales'])
        && (res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto || res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.listo)
        && !req.originalUrl.toLowerCase().includes("consultar")) {
        res.render("tribunales/tribunalesCumplimentar", {
            estado: "Asignación de tribunales ya se realizó. Debe esperar a que se acabe de cumplimentar la programación docente y el Jefe de Estudios la apruebe",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosTribunal: estados.estadoTribunal,
            estadosProgDoc: estados.estadoProgDoc,
            estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
            planEstudios: res.locals.planEstudios,
            //desde esta ventana solo se pueden añadir profesores al sistema.
            onlyProfesor: true
        })
    }
    else {
        let pdID = req.session.pdID;
        let asignaturas = [];
        let asignaturasAntiguas = [];
        let whereAsignaturas = [];
        let departamentoID = req.session.departamentoID;
        try {
            let pdsAnteriores = await progDocController.getProgramacionDocentesAnteriores(progDocController.getPlanPd(pdID), progDocController.getTipoPd(pdID), progDocController.getAnoPd(pdID), pdID, null);
            whereAsignaturas.push(pdID);
            //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
            for (let i = 0; i < pdsAnteriores.length; i++) {
                whereAsignaturas.push(pdsAnteriores[i].identificador)
            }
            let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });
            if (!departamentoExisteEnElPlan) {
                let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunales/tribunalesConsultar" : "tribunales/tribunalesCumplimentar";
                res.render(view, {
                    existe: "El departamento seleccionado no es responsable de ninguna asignatura del plan, por favor escoja otro departamento en el cuadro superior",
                    permisoDenegado: res.locals.permisoDenegado,
                    profesores: null,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    departamentoID: req.session.departamentoID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    estadosTribunal: estados.estadoTribunal,
                    estadosProgDoc: estados.estadoProgDoc,
                    estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                    planEstudios: res.locals.planEstudios,
                    //desde esta ventana solo se pueden añadir profesores al sistema.
                    onlyProfesor: true
                })
            } else {
                if (res.locals.permisoDenegado) {
                    let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunales/tribunalesConsultar" : "tribunales/tribunalesCumplimentar"
                    res.render(view, {
                        permisoDenegado: res.locals.permisoDenegado,
                        profesores: null,
                        menu: req.session.menu,
                        submenu: req.session.submenu,
                        planID: req.session.planID,
                        departamentoID: req.session.departamentoID,
                        departamentosResponsables: res.locals.departamentosResponsables,
                        estadosTribunal: estados.estadoTribunal,
                        estadosProgDoc: estados.estadoProgDoc,
                        estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                        planEstudios: res.locals.planEstudios,
                        //desde esta ventana solo se pueden añadir profesores al sistema.
                        onlyProfesor: true
                    })
                }
                else {
                    let profesores = await personaYProfesorController.getProfesores();
                    getMiembrosTribunal(whereAsignaturas, departamentoID, profesores, pdID);
                }
                async function getMiembrosTribunal(ProgramacionDocentesIdentificador, DepartamentoResponsable, profesores, pdID) {
                    let asigns = await models.Asignatura.findAll({
                        where: {
                            //se obtendrá con req D510 1
                            ProgramacionDocenteIdentificador: {
                                [op.in]: ProgramacionDocentesIdentificador
                            },
                            DepartamentoResponsable: DepartamentoResponsable
                        },
                        attributes: ['acronimo', 'nombre', 'curso', 'codigo', 'semestre', 'identificador', 'PresidenteTribunalAsignatura', 'VocalTribunalAsignatura', 'SecretarioTribunalAsignatura', 'SuplenteTribunalAsignatura', 'ProgramacionDocenteIdentificador'],
                        order: [

                            [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                            [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
                            [Sequelize.literal('"Asignatura"."acronimo"'), 'ASC'],
                            [Sequelize.literal('"Asignatura"."nombre"'), 'ASC']

                        ],
                        raw: true,
                    })
                    asigns.forEach((asigni) => {
                        let presidente = profesores.find(function (obj) { return obj.identificador === asigni['PresidenteTribunalAsignatura']; });
                        if (presidente) {
                            asigni.presidenteNombre = presidente.nombreCorregido
                        }
                        let vocal = profesores.find(function (obj) { return obj.identificador === asigni['VocalTribunalAsignatura']; });
                        if (vocal) {
                            asigni.vocalNombre = vocal.nombreCorregido
                        }
                        let secretario = profesores.find(function (obj) { return obj.identificador === asigni['SecretarioTribunalAsignatura']; });
                        if (secretario) {
                            asigni.secretarioNombre = secretario.nombreCorregido
                        }
                        let suplente = profesores.find(function (obj) { return obj.identificador === asigni['SuplenteTribunalAsignatura']; });
                        if (suplente) {
                            asigni.suplenteNombre = suplente.nombreCorregido
                        }
                        asigni.tribunalId = asigni['identificador'];
                        if (asigni['ProgramacionDocenteIdentificador'] === pdID) {
                            asignaturas.push(asigni)

                        } else {
                            let as = {}
                            as.codigo = asigni['codigo']
                            as.presidente = asigni['presidenteNombre']
                            as.vocal = asigni['vocalNombre']
                            as.secretario = asigni['secretarioNombre']
                            as.suplente = asigni['suplenteNombre']
                            asignaturasAntiguas.push(as)
                        }
                    })
                    let view = req.originalUrl.toLowerCase().includes("consultar") ? "tribunales/tribunalesConsultar" : "tribunales/tribunalesCumplimentar"
                    let nuevopath = "" + req.baseUrl + "/respdoc/guardarTribunales"
                    let cancelarpath = "" + req.baseUrl + "/respdoc/tribunales?planID=" + req.session.planID + "&departamentoID=" + DepartamentoResponsable
                    res.render(view,
                        {
                            profesores: profesores,
                            tribunales: asignaturas,
                            tribunalesAntiguos: asignaturasAntiguas,
                            nuevopath: nuevopath,
                            aprobarpath: "" + req.baseUrl + "/respDoc/aprobarTribunales",
                            cancelarpath: cancelarpath,
                            planID: req.session.planID,
                            estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                            estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                            pdID: pdID,
                            submenu: req.session.submenu,
                            menu: req.session.menu,
                            permisoDenegado: res.locals.permisoDenegado,
                            departamentoID: req.session.departamentoID,
                            departamentosResponsables: res.locals.departamentosResponsables,
                            estadosTribunal: estados.estadoTribunal,
                            estadosProgDoc: estados.estadoProgDoc,
                            planEstudios: res.locals.planEstudios,
                            //desde esta ventana solo se pueden añadir profesores al sistema.
                            onlyProfesor: true
                        })
                }
            }
        }
        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    }
}

//POST respDoc/guardarTribunales
exports.guardarTribunales = async function (req, res, next) {
    let departamentoID = req.session.departamentoID;
    let pdID = req.session.pdID;
    let toActualizar = req.body.actualizar;
    if (toActualizar && !res.locals.permisoDenegado) {
        try {
            //debo de comprobar que estoy cambiando asignaturas de mi pd
            let as = await models.Asignatura.findAll(
                {
                    where: {
                        ProgramacionDocenteIdentificador: pdID
                    },
                    attributes: ["identificador", "DepartamentoResponsable"],
                    raw: true
                })
            if (!Array.isArray(toActualizar)) {
                toActualizar = [toActualizar]
            }
            let promises = [];
            let tribunalesToActualizar = [];
            toActualizar.forEach(function (element, index) {
                let tribunalToActualizar;
                let tribunalId = Number(element.split("_")[0])
                let asig = as.find(function (obj) { return (tribunalId && obj.identificador === tribunalId) })
                if (!asig || !asig.DepartamentoResponsable || asig.DepartamentoResponsable !== departamentoID) {
                    console.log("Ha intentado cambiar una asignatura que no puede")
                } else {
                    let profesorIdentificador = element.split("_")[1]
                    let puestoTribunal = element.split("_")[2] + "TribunalAsignatura"
                    tribunalToActualizar = tribunalesToActualizar.find(function (obj) { return obj.identificador === tribunalId; });
                    if (tribunalToActualizar) {
                        tribunalToActualizar.puestos[puestoTribunal] = profesorIdentificador;
                    }
                    else {
                        tribunalToActualizar = {}
                        tribunalToActualizar.identificador = tribunalId;
                        tribunalToActualizar.puestos = {}
                        tribunalToActualizar.puestos[puestoTribunal] = profesorIdentificador
                        tribunalesToActualizar.push(tribunalToActualizar)
                    }
                }
            });
            tribunalesToActualizar.forEach(function (element, index) {
                promises.push(models.Asignatura.update(
                    tribunalesToActualizar[index].puestos,
                    { where: { identificador: tribunalesToActualizar[index].identificador } }
                ))

            })
            await Promise.all(promises)
            next()
        }

        catch (error) {
            console.log("Error:", error);
            next(error);
        }
    } else {
        next()
    }
}

//get
exports.reenviar = function (req, res, next) {
    req.session.save(function () {
        res.redirect("" + req.baseUrl + "/respDoc/tribunales?departamentoID=" + req.session.departamentoID + "&planID=" + req.session.planID)
    })
}
// post respDoc/aprobarTribunales:pdID
exports.aprobarTribunales = async function (req, res, next) {
    let pdID = req.session.pdID;
    let departamentoID = req.session.departamentoID;
    let date = new Date();
    let estadoTribunales;
    try {
        let pd = await models.ProgramacionDocente.findOne({ where: { identificador: pdID }, attributes: ["estadoTribunales"] });
        estadoTribunales = pd['estadoTribunales']
        if (!res.locals.permisoDenegado) {
            switch (estadoTribunales[departamentoID]) {
                case (estados.estadoTribunal.abierto):
                    estadoTribunales[departamentoID] = estados.estadoTribunal.aprobadoResponsable;
                    break;
                case (estados.estadoTribunal.aprobadoResponsable):
                    req.body.decision !== 'aceptar' ? estadoTribunales[departamentoID] = estados.estadoTribunal.abierto : estadoTribunales[departamentoID] = estados.estadoTribunal.aprobadoDirector
                    break;
            }
            await models.ProgramacionDocente.update(
                {
                    estadoTribunales: estadoTribunales,
                    fechaTribunales: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            )
            req.session.save(function () {
                progDocController.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/tribunales"))
            })
        } else {
            req.session.save(function () {
                progDocController.isPDLista(pdID, res.redirect("" + req.baseUrl + "/respDoc/tribunales"))
            })
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

//funcion para ver el estado de profesores o tribunales si cumple uno el resto lo marca como cumplido
function comprobarEstadoCumpleUno(estado, objeto) {
    for (variable in objeto) {
        if (objeto[variable] === estado) {
            return true;
        }
    }
    return false;
}

