let models = require('../models');
let Sequelize = require('sequelize');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');

//devuelve el tipo de la PD a partir del id
//PD_09TT_201819_I_v1
exports.getPlanPd = function (pdID) {
    return pdID ? pdID.split("_")[1] : null;
}

//devuelve el ano de la PD a partir del id
//PD_09TT_201819_I_v1
exports.getAnoPd = function (pdID) {
    return pdID ? pdID.split("_")[2] : null;
}

//devuelve el tipo de la PD a partir del id
//PD_09TT_201819_I_v1
exports.getTipoPd = function (pdID) {
    return pdID ? pdID.split("_")[3] : null;
}

//devuelve el version de la PD a partir del id v1
//PD_09TT_201819_I_v1
exports.getVersionPd = function (pdID) {
    return pdID ? pdID.split("_")[4] : null;
}

//devuelve el numero version de la PD a partir del id 1
//PD_09TT_201819_I_v1
exports.getVersionPdNumber = function (pdID) {
    return pdID ? Number(pdID.split("_")[4].split("v")[1]) : null
}

exports.getProgramacionDocenteById = async function (pdID) {
    if (pdID) {
        try {
            let pd = await models.ProgramacionDocente.findOne({
                attributes: ["identificador", "semestre", "estadoProfesores", "reabierto"],
                where: {
                    identificador: pdID
                },
                raw: true
            })
            return pd
        }
        catch (error) {
            //se propaga el error lo captura el middleware
            throw error;
        }
    } else {
        return null
    }
}

//te devuelve la programacion docente sobre la que puede tocar una persona
exports.getProgramacionDocente = async function (req, res, next) {
    let planID = req.query.planID;
    if (!planID) {
        planID = req.session.planID;
    }
    if (!planID) {
        planID = "09TT";
    }
    let departamentoID = req.query.departamentoID;
    if (!departamentoID) {
        departamentoID = req.session.departamentoID;
    }
    try {
        req.session.planID = planID;
        req.session.departamentoID = departamentoID;
        //separar con un if el rol en el que el where afecta
        let wherePD = [];
        //solo puede haber una abierta y una en incidencia como maximo en un plan
        wherePD.push(estados.estadoProgDoc.abierto);
        wherePD.push(estados.estadoProgDoc.listo);
        wherePD.push(estados.estadoProgDoc.incidencia);
        //el planID si no existe acronimo sera el código, por eso el or
        let params = await models.PlanEstudio.findAll({
            attributes: ['nombre', 'codigo', 'nombreCompleto'],
            where: Sequelize.or(
                { nombre: planID },
                { codigo: planID }
            )
            ,
            include: [{
                model: models.ProgramacionDocente,
                where: {
                    estadoProGDoc: {
                        [op.in]: wherePD
                    }
                },
            }],
            raw: true
        })
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
        } else {
            req.session.pdID = null
        }
        if (res.locals.progDoc) {
            let query = 'SELECT distinct  "DepartamentoResponsable", public."Departamentos".nombre, public."Departamentos".acronimo FROM public."Asignaturas" p  inner join public."Departamentos" on p."DepartamentoResponsable" = public."Departamentos".codigo WHERE p."ProgramacionDocenteIdentificador" = :pdId ';
            let departamentosResponsables = await models.sequelize.query(query = query,
                { replacements: { pdId: res.locals.progDoc['ProgramacionDocentes.identificador'] } },
            )
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
        } else {
            next();
        }
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

//TODO: cuando se añadan las otras funciones hay que ponerlas aquí
//para comprobar si la pd se puede marcar como lista para que el jefe de estudios la cierre
exports.isPDLista = async function (progID, thenFunction) {
    try {
        let nuevoEstado;
        let prog = await models.ProgramacionDocente.findOne(
            {
                where: { identificador: progID },
                raw: true
            })
        if (prog['estadoProGDoc'] === estados.estadoProgDoc.abierto
            && CumpleTodos(estados.estadoProfesor.aprobadoDirector, prog['estadoProfesores'])
            && CumpleTodos(estados.estadoTribunal.aprobadoDirector, prog['estadoTribunales'])
            && prog['estadoHorarios'] === estados.estadoHorario.aprobadoCoordinador
            && prog['estadoExamenes'] === estados.estadoExamen.aprobadoCoordinador
            && prog['estadoCalendario'] === estados.estadoCalendario.aprobadoCoordinador
        ) {
            nuevoEstado = estados.estadoProgDoc.listo
        } else {
            nuevoEstado = estados.estadoProgDoc.abierto
        }
        await models.ProgramacionDocente.update(
            { estadoProGDoc: nuevoEstado }, /* set attributes' value */
            { where: { identificador: progID } } /* where criteria */
        )
        thenFunction
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

function CumpleTodos(estado, objeto) {
    for (variable in objeto) {
        if (objeto[variable] !== estado) {
            return false;
        }
    }
    return true;
}

//te da las ultimas pds existentes para el plan, tipoPD y ano
//en caso de pasar la pdIDNoIncluir te obvia esa, se utiliza para el pdf
//estadoPD en caso de que se quiera el estado de la programación docente, sino a null 
exports.getProgramacionDocentesAnteriores = async function (plan, tipoPD, ano, pdIDNoIncluir, estadoPD) {
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
    try {
        let progdocs = await models.ProgramacionDocente.findAll({
            attributes: ["identificador", "semestre", 'anoAcademico', "estadoProfesores", "reabierto", "version"],
            where: filtro,
            order: [
                [Sequelize.literal('"anoAcademico"'), 'DESC'],
                [Sequelize.literal('semestre'), 'DESC'],
                [Sequelize.literal('version'), 'DESC']
            ],
            raw: true
        })

        for (progdoc of progdocs) {
            //el segundo elemento del if es para que me coja la pd anterior o igual por si quiero modificar una cuando ya abri otra mas nueva
            if (tipoPD === '1S' && ano >= progdoc["identificador"].split("_")[2]) {
                if (progdoc.semestre === '1S' || progdoc.semestre === 'I') {
                    pds.push(progdoc);
                    break;
                }
            }
            if (tipoPD === '2S' && ano >= progdoc["identificador"].split("_")[2]) {
                if (progdoc.semestre === '2S' || progdoc.semestre === 'I') {
                    pds.push(progdoc);
                    break;
                }
            }
            if (tipoPD === 'I' && ano >= progdoc["identificador"].split("_")[2]) {
                if (progdoc.semestre === 'I' && I === false) {
                    pds.push(progdoc);
                    I = true;
                    break;
                } else {
                    if (progdoc.semestre === '1S' && s1 === false && ano >= progdoc["identificador"].split("_")[2]) {
                        pds.push(progdoc);
                        s1 = true;
                    }
                    if (progdoc.semestre === '2S' && s2 === false && ano >= progdoc["identificador"].split("_")[2]) {
                        pds.push(progdoc);
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
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

//te da las ultimas programaciones docentes de los planes pasados como array
//planes el codigo del plan
//tipoPD: 1S,2S no acepta I
//ano: 201819
exports.getAllProgramacionDocentes = async function (planes, tipoPD, ano) {
    let programacionDocentesPlan = {};
    planes.forEach(function (p) {
        programacionDocentesPlan[p] = []
    })
    try {
        let progdocs = await models.ProgramacionDocente.findAll({
            attributes: ["identificador", "semestre", 'PlanEstudioId', 'anoAcademico', 'version'],
            where: {
                PlanEstudioId: {
                    [op.in]: planes,
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
        for (progdoc of progdocs) {
            let pdsPlanes = programacionDocentesPlan[progdoc['PlanEstudioId']]
            if (pdsPlanes.length > 0) {
                continue;
            }
            //el segundo elemento del if es para que me coja la pd anterior o igual por si quiero modificar una cuando ya abri otra mas nueva
            if (tipoPD === '1S' && ano >= progdoc["identificador"].split("_")[2]) {
                if (progdoc.semestre === '1S' || progdoc.semestre === 'I') {
                    pdsPlanes.push(progdoc);
                    continue;
                }
            }
            if (tipoPD === '2S' && ano >= progdoc["identificador"].split("_")[2]) {
                if (progdoc.semestre === '2S' || progdoc.semestre === 'I') {
                    pdsPlanes.push(progdoc);
                    continue;
                }
            }
        }
        //caso raro que haya varias I y s1 por ejemplo si tengo s1 I s2 se va a dar. En ese caso me quedo con la anual
        return programacionDocentesPlan;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

exports.CumpleTodos = CumpleTodos


