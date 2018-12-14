let models = require('../models');
let Sequelize = require('sequelize');
let app = require('../app');


exports.comprobarRols = function (req, res, next) {
    let rols = req.session.user.rols;
    let rolsCoincidentes = [];
    let pdID = req.session.pdID;
    console.log(pdID)
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID } }).then(pd => {
        //cambio en la bbdd remiendo
        if (pd) {
            pd['reabierto'] === null ? pd['reabierto'] = 0 : pd['reabierto'] = pd['reabierto']
        }
        res.locals.rols.forEach(function (r, index) {
            let rolExistente = rols.find(function (obj) { return (obj.rol === r.rol && obj.PlanEstudioCodigo === r.PlanEstudioCodigo && obj.DepartamentoCodigo === r.DepartamentoCodigo) });
            if (rolExistente) {
                let cumple = true;
                if (Array.isArray(r.condiciones)) {
                    for (let i = 0; i < r.condiciones.length; i++) {
                        let condic = r.condiciones[i].condicion.trim().split('[')
                        switch (condic.length) {
                            case 1:
                                if ("" + pd[condic[0]] !== "" + r.condiciones[i].resultado) {
                                    cumple = false;
                                }
                                break;
                            case 2:
                                if ("" + pd[condic[0]][condic[1]] !== "" + r.condiciones[i].resultado) {
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
            res.locals.permisoDenegado = "No tiene permiso contacte el Jefe de Estudios si debería tenerlo"
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
    models.Persona.findById(id).then(persona => {
        if (persona) {
            next();
        }
        if (!persona) {
            res.render('noPermitido', {
                contextPath: app.contextPath,
                layout: false
            });
        }
    })

};

