let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');
const fs = require('fs')
const path = require('path')



exports.ensureDirectoryExistence = function probar(filePath,notCreate) {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    if(notCreate){
        return false;
    }
    probar(dirname);
    fs.mkdirSync(dirname);
}


//devuelve el tipo de la PD a partir del id
//PD_09TT_201819_I_v1
exports.getPlanPd = function (pdID) {
    return pdID ? pdID.split("_")[1] : null;
}
//devuelve el ano de la PD a partir del id
//PD_09TT_201819_I_v1
exports.getAnoPd = function(pdID){
 return  pdID ? pdID.split("_")[2] : null;
}

//devuelve el tipo de la PD a partir del id
//PD_09TT_201819_I_v1
exports.getTipoPd = function (pdID) {
    return pdID ?  pdID.split("_")[3] : null;
}

//devuelve el version de la PD a partir del id v1
//PD_09TT_201819_I_v1
exports.getVersionPd = function (pdID) {
    return  pdID ? pdID.split("_")[4] : null;
}
//devuelve el numero version de la PD a partir del id 1
//PD_09TT_201819_I_v1
exports.getVersionPdNumber = function (pdID){
    return pdID ? Number(pdID.split("_")[4].split("v")[1]) : null
}



exports.getPlanes = function (req, res, next) {
   
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

exports.getProgramacionDocenteById = function (pdID){
    if(pdID){
        return models.ProgramacionDocente.findOne({
            attributes: ["identificador", "semestre", "estadoProfesores", "reabierto"],
            where: {
                identificador: pdID
            },
            raw: true
        })
        .then(function(pd){
            return pd
        })
    }else{
        return null
    }
}

//te devuelve la programacion docente sobre la que puede tocar una persona
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
        attributes: ['nombre', 'codigo' ,'nombreCompleto'],
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
//estadoPD en caso de que se quiera el estado de la programación docente, sino a null 
exports.getProgramacionDocentesAnteriores = function (plan, tipoPD, ano, pdIDNoIncluir,estadoPD) {
    let s1 = false;
    let s2 = false;
    let I = false;
    let pds = [];
    let filtro = {
        PlanEstudioId: plan,
        identificador: {
            [op.ne]: pdIDNoIncluir,
        }
    }
    if (estadoPD) filtro.estadoProGDoc = estadoPD;
    return models.ProgramacionDocente.findAll({
        attributes: ["identificador", "semestre", 'anoAcademico',"estadoProfesores", "reabierto", "version"],
        where: filtro,
        order: [
            [Sequelize.literal('"anoAcademico"'), 'DESC'],
            [Sequelize.literal('semestre'), 'DESC'],
            [Sequelize.literal('version'), 'DESC']
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
//recuperar las asignaturas de una progdoc 
exports.getAsignaturasProgDoc = function (pdID) {
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
            return asign
        })
    }else{
        return null
    }              
}


//te devuelve todos los departamentos que hay en el sistmea
exports.getAllDepartamentos = function () {
    return models.Departamento.findAll({
        attributes: ['codigo', 'nombre', 'acronimo'],
        raw: true
    }).then(function (deps) {
        return deps;
    })
    
}
//se pasa el tipoPD (1S, 2S o I) y el semestre de asignatura (1S, 1S-2S, A ...)
//devuelve si para semestre1 debaría estar en la PD (true) y lo mismo con semestre2
exports.getSemestresAsignaturainPD = function(tipoPD,semestre){
    let s1, s2
    switch (tipoPD) {
        case '1S':
            s1 = (semestre === '1S' || semestre === '1S-2S' || semestre === 'A' || semestre === 'I')
            s2 = false;
            break;
        case '2S':
            s1 = false;
            s2 = (semestre === '2S' || semestre === '1S-2S' || semestre === 'A' || semestre === 'I')
            break;
        default:
            s1 = (semestre === '1S' || semestre === '1S-2S' || semestre === 'A' || semestre === 'I')
            s2 = (semestre === '2S' || semestre === '1S-2S' || semestre === 'A' || semestre === 'I')
            break;
    }
    return [s1, s2]
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

//migrar a getGruposNuevo
exports.getGrupos = function (pdID) {
    if (pdID) {
        return models.Grupo.findAll({
            attributes: ["nombre", "curso", "grupoId", "nombreItinerario", "aula"],
            where: { ProgramacionDocenteId: pdID },
            order: [

                [Sequelize.literal("curso"), 'ASC'],
                [Sequelize.literal("nombre"), 'ASC']
            ],
            raw: true
        }).then(function (grupos) {
            return grupos
        })
    } else {
        return null
    }
}


exports.getHistorial = function (req, res, next) {
    res.render('historial', {
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
    let id = ""
    return models.Persona.findOrCreate({
            where: { email: req.body.email },
            defaults: { email: req.body.email, nombre: req.body.nombre.toUpperCase(), apellido: req.body.apellido.toUpperCase() }
        })
        .then((nuevaPersona)=>{
            let prof = {};
            prof.ProfesorId = nuevaPersona[0].identificador;
            id = prof.ProfesorId
            if(req.body.isProfesor === true){
                let profesorToAnadir = models.Profesor.build(
                    prof
                )
                return profesorToAnadir.save()
            }
        })
        .then(() => {
            res.json({ success:true, identificador : id});
        })
        .catch(function (error) {
            console.log("Error:", error);
            res.json({success:false})
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
        attributes: ["identificador", "semestre", 'PlanEstudioId', 'anoAcademico', 'version'],
        where: {
            PlanEstudioId: {
                [op.or]: planes,
            },
            anoAcademico: ano
        },
        order: [
            [Sequelize.literal('"PlanEstudioId"'), 'DESC'],
            [Sequelize.literal('"anoAcademico"'), 'DESC'],
            [Sequelize.literal('semestre'), 'DESC'],
            [Sequelize.literal('version'), 'DESC']
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

//te da todos los grupos de las programciones docentes pasadas como array
exports.getAllGruposConAula = async function (progDocs){
    let gruposPorProgramacionDocente = {

    }
    for(let i = 0; i<progDocs.length; i++){
        
        let grupos = await models.Grupo.findAll({
            where: {
                ProgramacionDocenteId: progDocs[i],
                aula: {
                    $ne: null,
                    $ne: ""
                }
            }
        })
        gruposPorProgramacionDocente[progDocs[i]] = grupos;
            
        
    }
    return gruposPorProgramacionDocente;
}
