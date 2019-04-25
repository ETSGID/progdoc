let models = require('../models');
let Sequelize = require('sequelize');
let app = require('../app');
let enumsPD = require('../enumsPD');

//comprueba el rol o si es delegado de dicho rol en función del estado de la PD pasada
exports.comprobarRols = function (req, res, next) {
    let rols = req.session.user.rols;
    let rolsCoincidentes = [];
    let pdID = req.session.pdID;
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID } }).then(pd => {
        //cambio en la bbdd remiendo
        if (pd) {
            pd['reabierto'] === null ? pd['reabierto'] = 0 : pd['reabierto'] = pd['reabierto']
        }
        res.locals.rols.forEach(function (r, index) {
            let rolExistente = rols.find(function (obj) { return ((obj.rol === r.rol || enumsPD.delegacion[r.rol] && enumsPD.delegacion[r.rol].includes(obj.rol))   
                && obj.PlanEstudioCodigo === r.PlanEstudioCodigo && obj.DepartamentoCodigo === r.DepartamentoCodigo) });
            if (rolExistente) {
                let cumple = true;
                if(rolExistente.rol === "JefeEstudios"){
                    req.isJefeDeEstudios = true;
                }else{
                    req.isJefeDeEstudios = false;
                }
                if (Array.isArray(r.condiciones)) {
                    for (let i = 0; i < r.condiciones.length; i++) {
                        let condic = r.condiciones[i].condicion.trim().split('[')
                        switch (condic.length) {
                            case 1:
                                //hay que comprobar que existe pd
                                if (!pd || ("" + pd[condic[0]] !== "" + r.condiciones[i].resultado)) {
                                    cumple = false;
                                }
                                break;
                            case 2:
                                //hay que comprobar que existe pd
                                if (!pd || ("" + pd[condic[0]][condic[1]] !== "" + r.condiciones[i].resultado)) {
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
    })
    

}

//comprobamos que solo pueden acceder profesores 
exports.comprobarRolYPersona = function (req, res, next) {
    let role = req.session.user.employeetype;
    let id = req.session.user.PersonaId;
    //comprobamos en la tabla de persona si esta o no esta
        if (id !== null) {
            next();
        }
        if (id === null) {
            //profesor que no está en el sistema pero puede ver las cosas
            if (req.session.user.employeetype && typeof req.session.user.employeetype === "string" && req.session.user.employeetype.includes("D")) {
                next();
            }
            else{
                    res.render('noPermitido', {
                    contextPath: app.contextPath,
                    layout: false
                });
            }
        }
};

