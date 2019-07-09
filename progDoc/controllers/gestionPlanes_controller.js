let app = require('../app');
let models = require('../models');
let funciones = require('../funciones');
let estados = require('../estados');
const axios = require('axios');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let menuProgDocController = require('./menuProgDoc_controller')
let JEcontroller = require('./JE_controller')

exports.getGestionPlanes= function (req, res, next) {
    req.session.submenu = "Planes"
    let actualizarpath = "" + req.baseUrl + "/gestion/actualizarPlanApi"
    let cambioEstadopath = "" + req.baseUrl + "/gestion/cambiarEstadoProgDoc"
    let path = "" + req.baseUrl + "/gestion/planes"
    let estado = null;
    let pdID = null;     
    if (!res.locals.progDoc ||
        (estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']
        && estados.estadoProgDoc.listo !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'])
        && estados.estadoProgDoc.incidencia !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']) {
        estado = "Programación docente no abierta. Debe abrir una nueva o cerrar la actual si está preparada para ser cerrada"
    } else {
        pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
    }
    return menuProgDocController.getAllDepartamentos()
    .then(function (departamentos) {
        res.render("gestionPlanes", {
            estado: estado,
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planID: req.session.planID,
            planEstudios: res.locals.planEstudios,
            actualizarpath: actualizarpath,
            cambioEstadopath: cambioEstadopath, 
            departamentos: departamentos,
            path: path,
            pdID: pdID,
            progDoc: res.locals.progDoc,
            //gestionar los estados
            estadosProfesor: estados.estadoProfesor,
            estadosTribunal: estados.estadoTribunal,
            estadosHorario: estados.estadoHorario,
            estadosExamen: estados.estadoExamen,
            estadosCalendario: estados.estadoCalendario,
            estadosProgDoc: estados.estadoProgDoc,
            //cuando se hace redirect de updateAsignaturasApiUPM no valen null
            desapareceAsignaturas: res.locals.desapareceAsignaturas,
            cambioAsignaturas: res.locals.cambioAsignaturas,
            cambioAsignaturasAntigua: res.locals.cambioAsignaturasAntigua,
            nuevasAsignaturas: res.locals.nuevasAsignaturas,
            //se manda cuando ha pasado por actualizar
            actualizar: res.locals.actualizar,
            //para diferenciar entre pantalla mostrar el estado o poder cambiarlo en gestionPlanes
            verEstado: false
        })
    }).catch(function (error) {
        console.log("Error:", error);
        next(error);
    });
}

exports.updateAsignaturasApiUpm = function (req, res, next) {
    let pdID = req.session.pdID
    let apiAsignaturas = [];
    let nuevasAsignaturas = [];
    let viejasAsignaturas = [];
    let cambioAsignaturas = [];
    let cambioAsignaturasAntigua = [];
    let desapareceAsignaturas = [];
    /**update AsignaturasApiUpm se hace en dos estados (mostrar)
    *1: solo muestra los cambios
    *2: aplica los cambios
    */
    let mostrar = req.body.aplicarCambios
    if (!res.locals.permisoDenegado && mostrar) {
    //las asignacions se meten la copia de los profesores a los grupos nuevos
    let asignacions = [];
    let grupos;
    let plan = menuProgDocController.getPlanPd(pdID);
    let ano = menuProgDocController.getAnoPd(pdID);
    let tipoPD = menuProgDocController.getTipoPd(pdID);
    let planBBDD = res.locals.planEstudios.find(function (obj) { return obj.codigo === plan; });
    let promisesUpdate = [];

    //si aparece una asignatura de un departamento que no tenia asignado debo meterla y al reves, igual se tiene que eliminar un departamento
    let departamentosResponsables = []
    
    //el set para no tener elementos repetidos
    //los profesores se deben copiar a los nuevos grupos si cambia de semestre o año
    let copiarProfesores = new Set();
    //las cosas que se van a eliminar de la base de datos
    let whereEliminarAsignatura = {}
    whereEliminarAsignatura.identificador = []

    let whereEliminarProfesor = {}
    whereEliminarProfesor.AsignaturaId = []

    let whereEliminarHorario = {}
    whereEliminarHorario.AsignaturaId = []

    let whereEliminarExamen = {}
    whereEliminarExamen.AsignaturaIdentificador = []


    axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/plan.json/" + plan + "/asignaturas?anio=" + ano)
        .then(function (response) {
            apiAsignaturas = response.data;
            return menuProgDocController.getGrupos(pdID)
        })
        .then(function(g){
            //los grupos de las nuevas asignatuas
            grupos = g
            return models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdID,
                },
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.AsignacionProfesor,
                    //left join
                    required: false
                }
                ],
                raw: true

            })
        })
        .then(function (asignaturasBBDD){
            asignaturasBBDD.forEach(function(asignBBDD){
                let identificador = asignBBDD.identificador
                let nuevaAsignatura = nuevasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                let viejaAsignatura = viejasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                let cambioAsignatura = cambioAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                let desapareceAsignatura = desapareceAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                //asignatura que no está catalogada debo catalogarla
                if (!nuevaAsignatura && !viejaAsignatura && !cambioAsignatura && !desapareceAsignatura) {
                    //actualizo o eliminar las asignaturas que hayan cambiado o desaparecido
                    if (apiAsignaturas[asignBBDD.codigo]) {
                        apiAsignatura = apiAsignaturas[asignBBDD.codigo]
                        let as = {}
                        as.codigo = asignBBDD.codigo
                        let hasCurso = true;
                        let hasDepartamento = true;
                        let hasSemestre = true;

                        let nombreCambio = asignBBDD.nombre === apiAsignatura["nombre"] ? false : true
                        as.nombre = apiAsignatura["nombre"]

                        apiAsignatura["nombre_ingles"] === "" ? asignBBDD.nombreIngles = asignBBDD.nombreIngles : asignBBDD.nombreIngles = apiAsignatura["nombre_ingles"];
                        let nombreInglesCambio = asignBBDD.nombreIngles === apiAsignatura["nombre_ingles"] ? false : true
                        as.nombreIngles = apiAsignatura["nombre_ingles"]

                        let creditosCambio = asignBBDD.creditos === funciones.convertCommaToPointDecimal(apiAsignatura['credects']) ? false : true
                        as.creditos = funciones.convertCommaToPointDecimal(apiAsignatura['credects'])

                        switch (apiAsignatura["codigo_tipo_asignatura"]) {
                            case "T":
                                as.tipo = 'bas';
                                break;
                            case "B":
                                as.tipo = 'obl';
                                break;
                            case "O":
                                as.tipo = 'opt';
                                break;
                            case "P":
                                as.tipo = 'obl';
                                break;
                            default:
                                //hay un tipo E que a veces se usa para prácticas
                                as.tipo = null;
                                break;
                        }
                        let tipoCambio = as.tipo === asignBBDD.tipo ? false : true

                        let apiDepartamentos = apiAsignatura['departamentos']
                        if (apiDepartamentos.length === 0) {
                            if (apiAsignatura["codigo_tipo_asignatura"] === "P" && (planBBDD["nombreCompleto"].toUpperCase().includes("MASTER") || planBBDD["nombreCompleto"].toUpperCase().includes("MÁSTER"))) {
                                as.DepartamentoResponsable = "TFM"
                            }
                            else if (apiAsignatura["codigo_tipo_asignatura"] === "P" && planBBDD["nombreCompleto"].toUpperCase().includes("GRADO")) {
                                as.DepartamentoResponsable = "TFG"
                            } else {
                                as.DepartamentoResponsable = null;
                                hasDepartamento = false; //no lo uso pq las practicas si que la quiero y no tiene departamento
                            }
                        }
                        apiDepartamentos.forEach(function (element, index) {
                            if (element["responsable"] === "S" || element["responsable"] === "") {
                                as.DepartamentoResponsable = element["codigo_departamento"]
                            }
                        });
                        let departamentoResponsableCambio = as.DepartamentoResponsable === asignBBDD.DepartamentoResponsable ? false : true;
                        if (apiAsignatura['curso'] === "") {
                            hasCurso = false;
                        } else {
                            as.curso = apiAsignatura["curso"];
                        }
                        let cursoCambio = as.curso === asignBBDD.curso ? false : true;

                        let imparticion = apiAsignatura["imparticion"];
                        if (imparticion['1S'] && imparticion['2S']) {
                            as.semestre = "1S-2S"
                        } else if (imparticion['1S']) {
                            as.semestre = "1S"
                        } else if (imparticion['2S']) {
                            as.semestre = "2S"
                        } else if (imparticion['I']) {
                            as.semestre = "I"
                        } else if (imparticion['A']) {
                            as.semestre = "A"
                        } else {
                            as.semestre = "";
                            hasSemestre = false;
                        }
                        let semestreCambio = as.semestre === asignBBDD.semestre ? false : true;
                        if (!hasCurso || !hasSemestre) {
                            desapareceAsignaturas.push(as);
                            whereEliminarAsignatura.identificador.push(identificador)
                            whereEliminarProfesor.AsignaturaId.push(identificador)
                            whereEliminarHorario.AsignaturaId.push(identificador)
                            whereEliminarExamen.AsignaturaIdentificador.push(identificador)
                        } else if (nombreCambio || nombreInglesCambio || creditosCambio || tipoCambio || departamentoResponsableCambio || cursoCambio || semestreCambio) {
                            //añado el departamentoResponsable si no estaba. Solo en las asignaturas nuevas que se añaden o las que permanecen
                            let index = departamentosResponsables.indexOf(as.DepartamentoResponsable)
                            if (index < 0 && as.DepartamentoResponsable) {
                                departamentosResponsables.push(as.DepartamentoResponsable)
                            }
                            cambioAsignaturas.push(as)
                            cambioAsignaturasAntigua.push(asignBBDD)
                            if(cursoCambio){
                                whereEliminarHorario.AsignaturaId.push(identificador)
                                whereEliminarProfesor.AsignaturaId.push(identificador)
                                //los profesores hay que copiarlos a todos los grupos nuevos
                                copiarProfesores.add(identificador)
                            }
                            if(semestreCambio){
                                whereEliminarHorario.AsignaturaId.push(identificador)
                                whereEliminarProfesor.AsignaturaId.push(identificador)
                                whereEliminarExamen.AsignaturaIdentificador.push(identificador)
                                //los profesores hay que copiarlos a todos los grupos nuevos
                                copiarProfesores.add(identificador)
                            }
                            if(departamentoResponsableCambio){
                            }
                            if (mostrar == 2) {
                                promisesUpdate.push(models.Asignatura.update(
                                    as, /* set attributes' value */
                                    { where: { identificador: identificador } } /* where criteria */
                                ))
                            }
                            as.identificador = asignBBDD.identificador
                        
                        } else {
                            //añado el departamentoResponsable si no estaba. Solo en las asignaturas nuevas que se añaden o las que permanecen
                            let index = departamentosResponsables.indexOf(as.DepartamentoResponsable)
                            if (index < 0 && as.DepartamentoResponsable) {
                                departamentosResponsables.push(as.DepartamentoResponsable)
                            }
                            viejasAsignaturas.push(as)
                        }
                    } else {
                        desapareceAsignaturas.push(asignBBDD)
                        whereEliminarAsignatura.identificador.push(identificador)
                        whereEliminarProfesor.AsignaturaId.push(identificador)
                        whereEliminarHorario.AsignaturaId.push(identificador)
                        whereEliminarExamen.AsignaturaIdentificador.push(identificador)
                    }
            }
            //ahora ya estará guardada en la bbdd actualizo para ver si es una cambioAsignatura y si es así
            cambioAsignatura = cambioAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
            //hay que copiar los profesores en todos los grupos
            if (cambioAsignatura && copiarProfesores.has(cambioAsignatura.identificador)){
                if (asignBBDD["AsignacionProfesors.ProfesorId"]) {
                    for (let i = 0; i < grupos.length; i++) {
                        if (grupos[i].curso === Number(cambioAsignatura.curso)) {
                            let asignacion = {};
                            //el identificador de la asignatura es el mismo
                            asignacion.AsignaturaId = asignBBDD.identificador
                            asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                            asignacion.GrupoId = grupos[i].grupoId;
                            // no meto profesores repetidos
                            let asigExistente = asignacions.find(function (obj) { return (obj.GrupoId === asignacion.GrupoId && obj.AsignaturaId === asignacion.AsignaturaId && obj.ProfesorId === asignacion.ProfesorId) });
                            if (!asigExistente) {
                                asignacions.push(asignacion);
                            }
                        }


                    }

                }
            }
            

            })          
            //buscar las asignaturas nuevas en API upm
            for (let apiCodigo in apiAsignaturas) {
                let apiAsignEncontrada = apiAsignaturas[apiCodigo];
                let asignExisteBBDD = asignaturasBBDD.find(function (obj) { return obj.codigo === apiAsignEncontrada.codigo; });
                let semestre = ""
                let imparticion = apiAsignEncontrada["imparticion"];
                if (imparticion['1S'] && imparticion['2S']) {
                    semestre = "1S-2S"
                } else if (imparticion['1S']) {
                    semestre = "1S"
                } else if (imparticion['2S']) {
                    semestre = "2S"
                } else if (imparticion['I']) {
                    semestre = "I"
                } else if (imparticion['A']) {
                    semestre = "A"
                } else {
                    semestre = "";
                }
                let apiDepartamentos = apiAsignEncontrada['departamentos']
                let depResponsable = null
                if (apiDepartamentos.length === 0) {
                    if (apiAsignEncontrada["codigo_tipo_asignatura"] === "P" && (planBBDD["nombreCompleto"].toUpperCase().includes("MASTER") || planBBDD["nombreCompleto"].toUpperCase().includes("MÁSTER"))) {
                        depResponsable = "TFM"
                    }
                    else if (apiAsignEncontrada["codigo_tipo_asignatura"] === "P" && planBBDD["nombreCompleto"].toUpperCase().includes("GRADO")) {
                        depResponsable = "TFG"
                    } else {
                        depResponsable = null;
                    }
                }
                apiDepartamentos.forEach(function (element, index) {
                    if (element["responsable"] === "S" || element["responsable"] === "") {
                        depResponsable = element["codigo_departamento"]
                    }
                });
                // nueva asignatura a anadir. Es una asignatura si tiene curso, semestre y departamentoResponsable
                if (!asignExisteBBDD && apiAsignEncontrada['curso'] !== "" && semestre !== ""  && (tipoPD === "I" || (tipoPD === '1S' && semestre !== '2S') || (tipoPD === '2S' && semestre !== '1S'))) {
                    let nuevaAsign = {};
                    nuevaAsign.anoAcademico = ano;
                    nuevaAsign.codigo = apiAsignEncontrada.codigo;
                    nuevaAsign.nombre = apiAsignEncontrada.nombre;
                    nuevaAsign.nombreIngles = apiAsignEncontrada["nombre_ingles"];
                    nuevaAsign.curso = apiAsignEncontrada['curso'];
                    nuevaAsign.semestre = semestre;
                    nuevaAsign.DepartamentoResponsable = depResponsable;
                    //por defecto los profesores se asignan por grupo individual
                    nuevaAsign.estado = "S";
                    nuevaAsign.creditos = funciones.convertCommaToPointDecimal(apiAsignEncontrada['credects']);
                    nuevaAsign.ProgramacionDocenteIdentificador = pdID;
                    switch (apiAsignEncontrada["codigo_tipo_asignatura"]) {
                        case "T":
                            nuevaAsign.tipo = 'bas';
                            break;
                        case "B":
                            nuevaAsign.tipo = 'obl';
                            break;
                        case "O":
                            nuevaAsign.tipo = 'opt';
                            break;
                        case "P":
                            nuevaAsign.tipo = 'obl';
                            break;
                        default:
                            //hay un tipo E que a veces se usa para prácticas
                            nuevaAsign.tipo = null;
                            break;
                    }
                    //añado el departamentoResponsable si no estaba. Solo en las asignaturas nuevas que se añaden o las que permanecen
                    let index = departamentosResponsables.indexOf(depResponsable)
                    if (index < 0 && depResponsable) {
                        departamentosResponsables.push(depResponsable)
                    }
                    nuevasAsignaturas.push(nuevaAsign);
                }
            }
        })
        .then(() => {
            //modifico los estados de pd con los camibos que se han aplicado
            //¿pregutnar a gabriel?
            res.locals.desapareceAsignaturas = desapareceAsignaturas
            res.locals.cambioAsignaturas = cambioAsignaturas
            res.locals.cambioAsignaturasAntigua = cambioAsignaturasAntigua
            res.locals.nuevasAsignaturas = nuevasAsignaturas
            /**
            *actualizar es 1 cuando muestra los cambios
            * 2 cuando aplica los cambios
            * actualizar upm se hace en dos pasos primero muestra los cambios y después debe aplicarlos
            */
            if (mostrar == 1) {
            res.locals.actualizar = 1;
            next();
            }
            else{
            res.locals.actualizar = 2;
            //eliminar las asignaciones de profesores
            return models.AsignacionProfesor.destroy({
                where: {
                    ProfesorId: {
                        [op.ne]: null
                    },
                    AsignaturaId: {
                        [op.in]: whereEliminarProfesor.AsignaturaId
                    }
                }
            })
            .then(() => {
                //eliminar los horaios y notas
                return models.AsignacionProfesor.destroy({
                    where: {
                        [op.or]: [
                            { Nota: { [op.ne]: null } }, { Dia: { [op.ne]: null } }
                        ],
                        AsignaturaId: {
                            [op.in]: whereEliminarHorario.AsignaturaId
                        }
                    }
                })
            })
            .then(() => {
                //eliminar los examenes
                return models.Examen.destroy({
                    where: {
                        AsignaturaIdentificador: {
                            [op.in]: whereEliminarExamen.AsignaturaIdentificador
                        }
                    }
                })
            })
            .then(() => {
                //eliminar las asignaturas que desaparecen
                return models.Asignatura.destroy({
                    where: {
                        identificador: {
                            [op.in]: whereEliminarAsignatura.identificador
                        }
                    }
                })
            })
            .then(() => {
                //actualizo todas las asignaturas
                return Promise.all(promisesUpdate)
            })
            .then(() => {
                //creo las nuevas asignaturas
                return models.Asignatura.bulkCreate(
                    nuevasAsignaturas
                )
            })
            .then(() => {
                //añado los profesores a los nuevos grupos una vez que ya borre los anteriores
                return models.AsignacionProfesor.bulkCreate(
                    asignacions
                )
            })
            .then(() => {
                /**añado los nuevos o quito los departamentos que desaparecen en el plan. Si aparece uno nuevo se pone en cerrado
                * el jefe de estudios debería retraer su estado
                * si desaparece un departamentoResponsable también desaparecerá en el estado
                **/
                let estadoProfesores={}
                let estadoTribunales={}
                let nuevaEntrada = {};
                departamentosResponsables.forEach(function (element) {
                    estadoProfesores[element] = res.locals.progDoc['ProgramacionDocentes.estadoProfesores'][element] || estados.estadoProfesor.aprobadoDirector;
                    estadoTribunales[element] = res.locals.progDoc['ProgramacionDocentes.estadoTribunales'][element] || estados.estadoTribunal.aprobadoDirector;
                })
                nuevaEntrada.estadoProfesores = estadoProfesores;
                nuevaEntrada.fechaProfesores = new Date();
                nuevaEntrada.estadoTribunales = estadoTribunales;
                nuevaEntrada.fechaTribunales = new Date();
                return models.ProgramacionDocente.update(
                    nuevaEntrada, /* set attributes' value */
                    { where: { identificador: pdID } } /* where criteria */
                )    
            })
            .then(() => {
                next();
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
            }
        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });
    }else{
        next();
    }
}

exports.updateEstadoProgDoc = function(req,res,next){
    if (!res.locals.permisoDenegado) {
        let nuevaEntrada = {}
        let pdID = req.session.pdID
        switch (req.body.estadoNombre){
            case 'estadoProfesores':
                nuevaEntrada.estadoProfesores = res.locals.progDoc['ProgramacionDocentes.estadoProfesores']
                nuevaEntrada.estadoProfesores[req.body.departamentoId] = req.body.estadoNuevo;
                break;
            case 'estadoTribunales':
                nuevaEntrada.estadoTribunales = res.locals.progDoc['ProgramacionDocentes.estadoTribunales']
                nuevaEntrada.estadoTribunales[req.body.departamentoId] = req.body.estadoNuevo;
                break;
            case 'estadoHorarios':
                nuevaEntrada.estadoHorarios = req.body.estadoNuevo;
                break;
            case 'estadoExamenes':
                nuevaEntrada.estadoExamenes = req.body.estadoNuevo;
                break;        
    }
        models.ProgramacionDocente.update(
            nuevaEntrada, /* set attributes' value */
            { where: { identificador: pdID } }
        ).then(() => {
            JEcontroller.isPDLista(pdID, res.json({ success: true }))   
        })
            .catch(function (error) {
                console.log("Error:", error);
                res.json({ success: false, msg: "Ha habido un error la acción no se ha podido completar recargue la página para ver el estado en el que se encuentra la programación docente" })
            });
   
    }else {
        res.json({ success: false, msg: "No tiene permiso" })
    }
}