let app = require('../app');
let models = require('../models');
let funciones = require('../funciones');
let Sequelize = require('sequelize');
let menuProgDocController = require('../controllers/menuProgDoc_controller')
let enumsPD = require('../enumsPD');

//funcion de getRoles para directores de departamentos jefe de estudios y subdirector de posgrado
exports.getRoles = function (req, res, next) {
    req.session.submenu = "Roles"
    let responsablesDocentes = [];
    let profesores = [];
    let cargos = []
    let programacionesDocentes = [];
    //responsables docentes
    return models.Rol.findAll({
        attributes: ['rol', 'PlanEstudioCodigo', 'PersonaId', 'DepartamentoCodigo'],
        include: [{
            model: models.Persona,
            attributes: ['nombre', 'apellido'],
            required: false,
            nested: true
        }],
        raw: true
    })
        .each(function (persona, roles) {
            let rol = roles['rol'];
            let PersonaId = roles['PersonaId'];
            let PlanEstudioCodigo = roles['PlanEstudioCodigo'];
            let DepartamentoCodigo = roles['DepartamentoCodigo'];
            let cargos = { rol: rol, PlanEstudioCodigo: PlanEstudioCodigo, PersonaId: PersonaId, DepartamentoCodigo: DepartamentoCodigo }
            responsablesDocentes.push(cargos);

        })
        .then(function (cargs) {
            cargos = cargs
            return menuProgDocController.getPersonas()
        }).then(function (profesors) {
            profesores = profesors;
            return menuProgDocController.getAllDepartamentos()
        }).then(function(departs){
            //aqui llamar a la funcion de sacar los nombres de cada id
            let nuevopath = "" + req.baseUrl + "/gestionRoles/guardarRoles";
            let cancelarpath = "" + req.baseUrl + "/gestionRoles";
            let view = req.originalUrl.toLowerCase().includes("consultar") ? "rolesConsultar" : "gestionRoles"
            //foco al cambiar de plan desde la view para que vuelva a ese punto
            let foco = req.query.foco ? true : false
            res.render(view, {
                roles: cargos.sort(funciones.sortRolesporDepartamento),
                rolesEnum: enumsPD.rols,
                profesores: profesores,
                nuevopath: nuevopath,
                cancelarpath: cancelarpath,
                submenu: req.session.submenu,
                foco:foco,
                departamentos: departs.sort(funciones.sortDepartamentos),
                planID: req.session.planID,
                planEstudios: res.locals.planEstudios,
                menu: req.session.menu,
                //para añadir una persona al sistema no tiene por que ser un profesor.
                onlyProfesor: false
            });
        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });


    
}




//query para guardar los cambios del sistema
exports.guardarRoles = function (req, res, next) {
    //si no tiene permiso o no hay rol
    if (!res.locals.permisoDenegado || !req.body.rol || !req.body.rol.split("_")[0]) {
        req.session.submenu = "Roles"
        let profesoresAnadidos = res.profesoresAnadidos;
        delete req.session.user.rols; //para asi luego obligarle a volver a buscarlos por los cambios que hayan
        //sacar name del rol  guardar
        let personaId;
        //si hay que eliminarlo sigue existiendo el rol pero no asignado a nadie.
        let toActualizar = req.body.actualizar;
        if (!toActualizar){
            toActualizar = req.body.eliminar
            personaId = null;
        }else{
            personaId = toActualizar.split("_")[1];
        } 
        

        //rol 
        let rolToActualizar = req.body.rol.split("_")[0];
        let PlanEstudioCodigo = req.body.rol.split("_")[1];
        let DepartamentoCodigo = req.body.rol.split("_")[2];
        if (rolToActualizar.trim() === "" ) rolToActualizar = null
        if (PlanEstudioCodigo.trim() === "") PlanEstudioCodigo = null
        if (DepartamentoCodigo.trim() === "") DepartamentoCodigo = null
        if (PlanEstudioCodigo !== null){
            req.session.planID = PlanEstudioCodigo
        }
        let filtro = {}
        filtro.rol = rolToActualizar;
        filtro.DepartamentoCodigo = DepartamentoCodigo;
        filtro.PlanEstudioCodigo = PlanEstudioCodigo;
        return models.Rol
            .findOne({ where: filtro })
            .then(function (obj) {
                if (obj) {
                    return obj.update({ PersonaId: personaId });
                }
                else {
                    if (Object.values(enumsPD.rols).includes(rolToActualizar) === true){
                        return models.Rol.create({ rol: rolToActualizar, DepartamentoCodigo: DepartamentoCodigo, PlanEstudioCodigo: PlanEstudioCodigo, PersonaId: personaId })
                    }
                    else {
                        return null
                    }
                }
            })
            .then(() => {
                next()
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
    }else{
        next()
    }
}


exports.redir = function (req, res, next) {
    req.session.save(function () {
        res.redirect("" + req.baseUrl + "/gestionRoles")
    })

}




