let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');

exports.getPlanes = function (req, res, next) {
    let planID = req.query.planID;
    if (!planID) {
        planID = req.session.planID
    }
    if (!planID) {
        planID = "09TT"
    }
    let departamentoID = req.query.departamentoID;
    if (!departamentoID) {
        departamentoID = req.session.departamentoID
    }
    req.session.planID = planID
    req.session.departamentoID = departamentoID

    models.PlanEstudio.findAll({
        attributes: ["codigo", "nombre", "nombreCompleto"],
        raw: true
    }).then(function (planesBBDD) {
        res.locals.planEstudios = planesBBDD.sort(funciones.sortPlanes);
        next();
    })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });
}

exports.getProgramacionDocente = function (req, res, next) {
    let planID = req.query.planID;
    if (!planID) {
        planID = req.session.planID
    }
    if (!planID) {
        planID = "09TT"
    }
    let departamentoID = req.query.departamentoID;
    if (!departamentoID) {
        departamentoID = req.session.departamentoID
    }
    req.session.planID = planID
    req.session.departamentoID = departamentoID;
    //separar con un if el rol en el que el where afecta
    let wherePD = {};
    wherePD['$or'] = [];
    //solo puede haber una abierta y una en incidencia como maximo en un plan
    wherePD['$or'].push({ estadoProGDoc: estados.estadoProgDoc.abierto });
    wherePD['$or'].push({ estadoProGDoc: estados.estadoProgDoc.listo });
    wherePD['$or'].push({ estadoProGDoc: estados.estadoProgDoc.incidencia });
    //el planID si no existe acronimo sera el código, por eso el or


    models.PlanEstudio.findAll({
        attributes: ['nombre', 'codigo'],
        where: Sequelize.or(
            { nombre: planID },
            { codigo: planID }
        )
        ,
        include: [{
            model: models.ProgramacionDocente,
            where: wherePD
        }],
        raw: true
    })
        .then(function (params) {
            let progDocIncidencia = null;
            let progDocAbierta = null;
            params.forEach(function (param) {
                req.session.planID = param['codigo'];
                res.locals.pdSemestre = param['ProgramacionDocentes.semestre']
                switch (param['ProgramacionDocentes.estadoProGDoc']) {
                    case estados.estadoProgDoc.abierto:
                        progDocAbierta = param;
                        break;
                    case estados.estadoProgDoc.listo:
                        progDocAbierta = param;
                        break;
                    case estados.estadoProgDoc.incidencia:
                        progDocIncidencia = param;
                        break;
                }
            })
            if (progDocIncidencia !== null) {
                res.locals.progDoc = progDocIncidencia;
                req.session.pdID = progDocIncidencia['ProgramacionDocentes.identificador']
            } else if (progDocAbierta !== null) {
                res.locals.progDoc = progDocAbierta;
                req.session.pdID = progDocAbierta['ProgramacionDocentes.identificador']
            } else{
                req.session.pdID = null
            }
            if (res.locals.progDoc) {
                let query = 'SELECT distinct  "DepartamentoResponsable", public."Departamentos".nombre, public."Departamentos".acronimo FROM public."Asignaturas" p  inner join public."Departamentos" on p."DepartamentoResponsable" = public."Departamentos".codigo WHERE p."ProgramacionDocenteIdentificador" = :pdId ';
                return models.sequelize.query(query = query,
                    { replacements: { pdId: res.locals.progDoc['ProgramacionDocentes.identificador'] } },
                ).then(departamentosResponsables => {
                    let depResponsables = [];
                    departamentosResponsables[0].forEach(function (d) {
                        let newDepartamento = {};
                        newDepartamento.nombre = d.nombre;
                        newDepartamento.acronimo = d.acronimo;
                        newDepartamento.codigo = d.DepartamentoResponsable;
                        depResponsables.push(newDepartamento)
                    })
                    if (depResponsables.length >= 0) {
                        res.locals.departamentosResponsables = depResponsables.sort(funciones.sortDepartamentos);
                        if (!departamentoID) {
                            if (depResponsables.length > 0) {
                                req.session.departamentoID = depResponsables[0].codigo;
                            } else {
                                req.session.departamentoID = null;
                            }
                        }
                    }

                    next();

                })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            } else {
                next();
            }
        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });



}

//te da las ultimas pds existentes para el plan, tipoPD y ano
//en caso de pasar la pdIDNoIncluir te obvia esa, se utiliza para el pdf 
exports.getProgramacionDocentesAnteriores = function (plan, tipoPD, ano, pdIDNoIncluir) {
    let s1 = false;
    let s2 = false;
    let I = false;
    let pds = [];
    return models.ProgramacionDocente.findAll({
        attributes: ["identificador", "semestre", "estadoProfesores", "reabierto"],
        where: {
            PlanEstudioId: plan,
            identificador: {
                [op.ne]: pdIDNoIncluir,
            }
        },
        order: [
            [Sequelize.literal('identificador'), 'DESC'],
        ],
        raw: true
    })
        .then(function (pd) {
            for (let i = 0; i < pd.length; i++) {
                //el segundo elemento del if es para que me coja la pd anterior o igual por si quiero modificar una cuando ya abri otra mas nueva
                if (tipoPD === '1S' && ano >= pd[i]["identificador"].split("_")[2]) {
                    if (pd[i].semestre === '1S' || pd[i].semestre === 'I') {
                        pds.push(pd[i]);
                        break;
                    }
                }
                if (tipoPD === '2S' && ano >= pd[i]["identificador"].split("_")[2]) {
                    if (pd[i].semestre === '2S' || pd[i].semestre === 'I') {
                        pds.push(pd[i]);
                        break;
                    }
                }
                if (tipoPD === 'I' && ano >= pd[i]["identificador"].split("_")[2]) {
                    if (pd[i].semestre === 'I' && I === false) {
                        pds.push(pd[i]);
                        I = true;
                        break;
                    } else {
                        if (pd[i].semestre === '1S' && s1 === false && ano >= pd[i]["identificador"].split("_")[2]) {
                            pds.push(pd[i]);
                            s1 = true;
                        }
                        if (pd[i].semestre === '2S' && s2 === false && ano >= pd[i]["identificador"].split("_")[2]) {
                            pds.push(pd[i]);
                            s2 = true;
                        }
                        if (s1 && s2) {
                            break;
                        }
                    }
                }
            }
            //caso raro que haya varias I y s1 por ejemplo si tengo s1 I s2 se va a dar. En ese caso me quedo con la anual
            if (I && s1 || I && s2) {
                let index = pds.length - 1;
                while (index >= 0) {
                    if (pds[index].semestre === '2S' || pds[index].semestre === '1S') {
                        pds.splice(index, 1);
                    }

                    index -= 1;
                }

            }
            return pds;
        })
}
//debo pasarle en la sesión la progDoc
//mw para recuperar las asignaturas de una progdoc 
exports.getAsignaturasProgDoc = function (req, res, next) {
    let pdID = req.session.pdID
    if(pdID){
        return models.Asignatura.findAll({
            where: {
                ProgramacionDocenteIdentificador: pdID,
            },
            attributes: ['identificador','codigo', 'nombre', 'acronimo', 'nombreIngles', 'creditos',
                'acronimo', 'curso', 'semestre', 'tipo', 'DepartamentoResponsable'],
            order: [
                [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                [Sequelize.literal('"Asignatura"."codigo"'), 'ASC'],
            ],
            raw: true
        }).then(function (asign) {
            res.locals.asignaturas = asign;
            next();
        })
            .catch(function (error) {
                console.log('Error: ' + error);
                next(error);
            });
    }else{
        res.locals.asignaturas = null;
        next();
    }              
}


//te devuelve todos los departamentos que hay en el sistmea
exports.getAllDepartamentos = function (req, res, next) {
    
    return models.Departamento.findAll({
        attributes: ['codigo', 'nombre', 'acronimo'],
        raw: true
    }).then(function (deps) {
        res.locals.departamentos = deps;
        next();
    })
        .catch(function (error) {
            console.log('Error: ' + error);
            next(error);
        });
    
}


function getPeople(onlyProfesor) {
    let profesores = [];
    let required = onlyProfesor === true ? true : false;
    return models.Persona.findAll({
        attributes: ['identificador', 'email', 'nombre', 'apellido'],
        include: [{
            model: models.Profesor,
            required: required,
        }],
        raw: true
    })
        .each(function (profesor) {
            let nombre = profesor['apellido'] + " " + profesor['nombre']
            let nombreCorregido = profesor['apellido'] + ", " + profesor['nombre']
            nombreCorregido = funciones.primerasMayusc(nombreCorregido)
            let correo = profesor['email']
            let identificador = profesor['identificador']
            let prof = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido, identificador: identificador }
            profesores.push(prof);
        })
        .then(function () {
            return profesores;
        })
}

function getPersonCorreo(onlyProfesor, correo) {
    let required = onlyProfesor === true ? true : false;
    return models.Persona.findOne({
        attributes: ['identificador', 'email', 'nombre', 'apellido'],
        where: {
            email: correo,
        },
        include: [{
            model: models.Profesor,
            required: required,
        }],
        
        raw: true,
    })
        .then(function (pers) {
            if(pers){
                let nombre = pers['apellido'] + " " + pers['nombre']
                let nombreCorregido = pers['apellido'] + ", " + pers['nombre']
                nombreCorregido = funciones.primerasMayusc(nombreCorregido)
                let correo = pers['email']
                let identificador = pers['identificador']
                let persona = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido, identificador: identificador }
                return persona;
            }else{
                return null;
            }

        })
}

//te da las ultimas pds existentes para el plan, tipoPD y ano
//en caso de pasar la pdIDNoIncluir te obvia esa, se utiliza para el pdf 
exports.getPersonas = function () {
    return getPeople(false);
}

//get profesores
exports.getProfesores = function () {
    return getPeople(true);
}

exports.getProfesorCorreo = function(correo){
    return getPersonCorreo(true,correo);
}

exports.getPersonaCorreo = function (correo) {
    return getPersonCorreo(false, correo);
}

exports.getGrupos = function (req, res, next) {
    if (res.locals.progDoc) {
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        models.Grupo.findAll({
            attributes: ["nombre", "curso", "grupoId", "nombreItinerario"],
            where: { ProgramacionDocenteId: pdID },
            order: [

                [Sequelize.literal("curso"), 'ASC'],
                [Sequelize.literal("nombre"), 'ASC']
            ],
            raw: true
        }).then(function (grupos) {
            res.locals.grupos = grupos;
            next();
        })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
    } else {
        next();
    }

}


exports.getHistorial = function (req, res, next) {
    res.render('historial', {
        contextPath: app.contextPath,
        menu: req.session.menu,
        planID: req.session.planID,
        departamentosResponsables: res.locals.departamentosResponsables,
        planEstudios: res.locals.planEstudios,
        PDsWithPdf: res.locals.PDsWithPdf,
        anosExistentes: res.locals.anosExistentes,
        pdSeleccionada: res.locals.pdSeleccionada
    })
}

exports.anadirProfesor = function (req, res, next) {
    let personaToAnadir = [];
    let profesorToAnadir = [];
    let profesoresAnadidos = [];
    let profesoresNuevos = req.body.nuevoProfesor;
    let promises = [];

    if (Array.isArray(profesoresNuevos)) {
        //borro los profesores pq pueden haber nuevos.
        profesoresNuevos.forEach(function (value) {
            let nombre = value.split("_")[0]
            let apellido = value.split("_")[1];
            let correo = value.split("_")[2];
            let p = {};
            p.nombre = nombre;
            p.apellido = apellido;
            p.email = correo;
            personaToAnadir.push(p);
        })
    } else if (profesoresNuevos) {
        //borro los profesores pq pueden haber nuevos.
        let nombre = profesoresNuevos.split("_")[0]
        let apellido = profesoresNuevos.split("_")[1];
        let correo = profesoresNuevos.split("_")[2];
        let p = {};
        p.nombre = nombre;
        p.apellido = apellido;
        p.email = correo;
        personaToAnadir.push(p);   
    }
    personaToAnadir.forEach(function (per) {
        promises.push( models.Persona.findOrCreate({
            where: { email: per.email },
            defaults: { email: per.email, nombre: per.nombre, apellido: per.apellido }
        })
    
        .then((nuevaPersona)=>{
            let prof = {};
            let profe2 = {}
            profe2.ProfesorId = nuevaPersona[0].identificador;
            profe2.correo = nuevaPersona[0].email;
            profesoresAnadidos.push(profe2);
            prof.ProfesorId = nuevaPersona[0].identificador;
            profesorToAnadir.push(prof)
        }))
    })
    return Promise.all(promises)
        .then(() => {
            // Notice: There are no arguments here, as of right now you'll have to...
            return models.Profesor.bulkCreate(
                profesorToAnadir
            )
        })
        .then(() => {
            res.profesoresAnadidos = profesoresAnadidos;
            next();
        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });
}

exports.anadirUnaPersona = function (req, res, next){
    let personaToAnadir = {};
    personaToAnadir.nombre = req.query.nombreProfesor;
    personaToAnadir.apellido = req.query.apellidosProfesor;
    personaToAnadir.email = req.query.emailProfesor;
    if(personaToAnadir.nombre && personaToAnadir.apellido && personaToAnadir.email){
        let pToAnadir = models.Persona.build(
            personaToAnadir
        )
        return pToAnadir.save()
            .then(() => {
                next()
            })           
    }
    next();
}

//te da las ultimas programaciones docentes de los planes pasados como array
//planes el codigo del plan
//tipoPD: 1S,2S no acepta I
//ano: 201819
exports.getAllProgramacionDocentes = function (planes, tipoPD, ano){
    let programacionDocentesPlan = {}
    planes.forEach(function (p, index) {
        programacionDocentesPlan[p]=[]
    })
    return models.ProgramacionDocente.findAll({
        attributes: ["identificador", "semestre", 'PlanEstudioId'],
        where: {
            PlanEstudioId: {
                [op.or]: planes,
            },
            anoAcademico: ano
        },
        order: [
            [Sequelize.literal('identificador'), 'DESC'],
        ],
        raw: true
    })
        .then(function (pd) {
            for (let i = 0; i < pd.length; i++) {
                let pdsPlanes = programacionDocentesPlan[pd[i]['PlanEstudioId']]
                if(pdsPlanes.length>0){
                    continue;
                }
                //el segundo elemento del if es para que me coja la pd anterior o igual por si quiero modificar una cuando ya abri otra mas nueva
                if (tipoPD === '1S' && ano >= pd[i]["identificador"].split("_")[2]) {
                    if (pd[i].semestre === '1S' || pd[i].semestre === 'I') {
                        pdsPlanes.push(pd[i]);
                        continue;
                    }
                }
                if (tipoPD === '2S' && ano >= pd[i]["identificador"].split("_")[2]) {
                    if (pd[i].semestre === '2S' || pd[i].semestre === 'I') {
                        pdsPlanes.push(pd[i]);
                        continue;
                    }
                }
            }
            //caso raro que haya varias I y s1 por ejemplo si tengo s1 I s2 se va a dar. En ese caso me quedo con la anual
            return programacionDocentesPlan;
        })

}

