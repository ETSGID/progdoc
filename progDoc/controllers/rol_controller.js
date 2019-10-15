let models = require('../models');
let funciones = require('../funciones');
let Sequelize = require('sequelize');
let progDocController = require('./progDoc_controller')
let departamentoController = require('./departamento_controller')
let personaYProfesorController = require('./personaYProfesor_controller')
let enumsPD = require('../enumsPD');
const op = Sequelize.Op;



//comprueba el rol o si es delegado de dicho rol en función del estado de la PD pasada
exports.comprobarRols = async function (req, res, next) {
    let rols = req.session.user.rols;
    let rolsCoincidentes = [];
    //de esta forma también se evita que se cierre una programacion docente y justo alguien edite
    let pdID = req.session.pdID;
    try {
        let plan = progDocController.getPlanPd(pdID)
        let pd = await models.PlanEstudio.findOne(
            {
                where: { codigo: plan },
                raw: true,
                include: [{
                    //incluye las asignaciones de profesores y los horarios.
                    model: models.ProgramacionDocente,
                    where: { identificador: pdID },
                    //left join
                    required: false
                }]
            }
        )
        //cambio en la bbdd remiendo
        if (pd) {
            res.locals.progDoc = pd
            pd['ProgramacionDocentes.reabierto'] === null ? pd['ProgramacionDocentes.reabierto'] = 0 : pd['ProgramacionDocentes.reabierto'] = pd['ProgramacionDocentes.reabierto']
        }
        res.locals.rols.forEach(function (r) {
            let rolExistente = rols.find(function (obj) {
                return ((obj.rol === r.rol || enumsPD.delegacion[r.rol] && enumsPD.delegacion[r.rol].includes(obj.rol))
                    && obj.PlanEstudioCodigo === r.PlanEstudioCodigo && obj.DepartamentoCodigo === r.DepartamentoCodigo)
            });
            if (rolExistente) {
                let cumple = true;
                if (rolExistente.rol === "JefeEstudios") {
                    req.isJefeDeEstudios = true;
                } else {
                    req.isJefeDeEstudios = false;
                }
                if (Array.isArray(r.condiciones)) {
                    for (let i = 0; i < r.condiciones.length; i++) {
                        let condic = r.condiciones[i].condicion.trim().split('[')
                        switch (condic.length) {
                            case 1:
                                //hay que comprobar que existe pd
                                if (!pd || ("" + pd['ProgramacionDocentes.' + condic[0]] !== "" + r.condiciones[i].resultado)) {
                                    cumple = false;
                                }
                                break;
                            case 2:
                                //hay que comprobar que existe pd
                                if (!pd || ("" + pd['ProgramacionDocentes.' + condic[0]][condic[1]] !== "" + r.condiciones[i].resultado)) {
                                    cumple = false;
                                }
                                break;
                        }
                    }
                }
                //si cumple las condiciones o no hay condiciones
                if (cumple) {
                    rolsCoincidentes.push(rolExistente);
                }
            }
        })
        if (rolsCoincidentes.length === 0) {
            res.locals.permisoDenegado = "No tiene permiso contacte con el Jefe de Estudios si debería tenerlo"
        }
        res.locals.rolsCoincidentes = rolsCoincidentes
        next();
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }


}

//comprobamos que solo pueden acceder profesores 
exports.comprobarRolYPersona = async function (req, res, next) {
    let role = req.session.user.employeetype;
    let id = req.session.user.PersonaId;
    if (role && typeof role === "string" && (role.includes("F") || role.includes("L"))) {
        req.session.portal = 'pas'
    }
    else if (role && typeof role === "string" && role.includes("D")) {
        req.session.portal = 'pdi'
    } else {
        req.session.portal = 'pdi'
    }
    //comprobamos en la tabla de persona si esta o no esta
    if (id !== null) {
        next();
    }
    if (id === null) {
        //profesor que no está en el sistema pero puede ver las cosas
        if (role && typeof role === "string" && (role.includes("D") || role.includes("F") || role.includes("L"))) {
            next();
        }
        else {
            res.render('menus/noPermitido', {
                layout: false
            });
        }
    }
};

//funcion de getRoles para directores de departamentos jefe de estudios y subdirector de posgrado
exports.getRoles = async function (req, res, next) {
    req.session.submenu = "Roles"
    let responsablesDocentes = [];
    let profesores;
    let cargos;
    let departs;
    let wherePlan = {}
    wherePlan.PlanEstudioCodigo = [null, req.session.planID];
    try {
        //responsables docentes
        cargos = await models.Rol.findAll({
            attributes: ['rol', 'PlanEstudioCodigo', 'PersonaId', 'DepartamentoCodigo'],
            where: {
                PlanEstudioCodigo: {
                    [op.or]: wherePlan.PlanEstudioCodigo
                }
            },
            include: [{
                model: models.Persona,
                attributes: ['nombre', 'apellido'],
                required: false,
                nested: true
            }],
            raw: true
        })
        cargos.forEach(function (persona, roles) {
            let rol = roles['rol'];
            let PersonaId = roles['PersonaId'];
            let PlanEstudioCodigo = roles['PlanEstudioCodigo'];
            let DepartamentoCodigo = roles['DepartamentoCodigo'];
            let cargo = { rol: rol, PlanEstudioCodigo: PlanEstudioCodigo, PersonaId: PersonaId, DepartamentoCodigo: DepartamentoCodigo }
            responsablesDocentes.push(cargo);
        })
        profesores = await personaYProfesorController.getPersonas();
        departs = await departamentoController.getAllDepartamentos();
        //aqui llamar a la funcion de sacar los nombres de cada id
        let nuevopath = "" + req.baseUrl + "/gestionRoles/guardarRoles";
        let cancelarpath = "" + req.baseUrl + "/gestionRoles";
        let view = req.originalUrl.toLowerCase().includes("consultar") ? "roles/rolesConsultar" : "roles/gestionRoles"
        //foco al cambiar de plan desde la view para que vuelva a ese punto
        let foco = req.query.foco ? true : false
        res.render(view, {
            roles: cargos.sort(funciones.sortRolesporDepartamento),
            rolesEnum: enumsPD.rols,
            profesores: profesores,
            nuevopath: nuevopath,
            cancelarpath: cancelarpath,
            submenu: req.session.submenu,
            foco: foco,
            departamentos: departs.sort(funciones.sortDepartamentos),
            planID: req.session.planID,
            planEstudios: res.locals.planEstudios,
            menu: req.session.menu,
            departamentosResponsables: res.locals.departamentosResponsables,
            progDoc: res.locals.progDoc,
            //para añadir una persona al sistema no tiene por que ser un profesor.
            onlyProfesor: false
        });
    }
    catch (error) {
        console.log("Error:", error);
        next(error);
    }
}

//query para guardar los cambios del sistema
exports.guardarRoles = async function (req, res, next) {
    //si no tiene permiso o no hay rol
    if (!res.locals.permisoDenegado || !req.body.rol || !req.body.rol.split("_")[0]) {
        try {
            let profesoresAnadidos = res.profesoresAnadidos;
            delete req.session.user.rols; //para asi luego obligarle a volver a buscarlos por los cambios que hayan
            //sacar name del rol  guardar
            let personaId;
            //si hay que eliminarlo sigue existiendo el rol pero no asignado a nadie.
            let toActualizar = req.body.actualizar;
            if (!toActualizar) {
                toActualizar = req.body.eliminar
                personaId = null;
            } else {
                personaId = toActualizar.split("_")[1];
            }
    
    
            //rol 
            let rolToActualizar = req.body.rol.split("_")[0];
            let PlanEstudioCodigo = req.body.rol.split("_")[1];
            let DepartamentoCodigo = req.body.rol.split("_")[2];
            if (rolToActualizar.trim() === "") rolToActualizar = null
            if (PlanEstudioCodigo.trim() === "") PlanEstudioCodigo = null
            if (DepartamentoCodigo.trim() === "") DepartamentoCodigo = null
            if (PlanEstudioCodigo !== null) {
                req.session.planID = PlanEstudioCodigo
            }
            let filtro = {}
            filtro.rol = rolToActualizar;
            filtro.DepartamentoCodigo = DepartamentoCodigo;
            filtro.PlanEstudioCodigo = PlanEstudioCodigo;
            let obj = await models.Rol.findOne({ where: filtro });
            if (obj) {
                await obj.update({ PersonaId: personaId });
            }
            else {
                if (Object.values(enumsPD.rols).includes(rolToActualizar) === true) {
                    await models.Rol.create({ rol: rolToActualizar, DepartamentoCodigo: DepartamentoCodigo, PlanEstudioCodigo: PlanEstudioCodigo, PersonaId: personaId })
                }
                else {
                }
            }
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


exports.redir = function (req, res, next) {
    req.session.save(function () {
        res.redirect("" + req.baseUrl + "/gestionRoles")
    })

}




