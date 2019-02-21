let app = require('../app');
let models = require('../models');
let funciones = require('../funciones');
let Sequelize = require('sequelize');
let menuProgDocController = require('../controllers/menuProgDoc_controller')



//funcion de getRoles para directores de departamentos jefe de estudios y subdirector de posgrado
exports.getRoles = function (req, res, next) {
    req.session.submenu = "Roles"
    let responsablesDocentes = [];
    let profesores = [];
    let departamentosList = [];
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
        .then(function (cargos) {
            //aqui llamar a la funcion de sacar los nombres de cada id
            getDirectoresDepartamentos(cargos);

        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
        });


    //funcion para sacar los nombres de los responsable de los roles
    function getDirectoresDepartamentos(cargos) {

        return menuProgDocController.getPersonas()
            .then(function (profesors) {
                profesores = profesors;
            })
            .then(function (prof) {
                //de esta manera puedes sacar los string al anidar los includes de las tablas
                //getResponsablesDocentes(cargos);
                getDepartmentos(cargos);

            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
    }
    //query donde sacar la lista de departamentos 
    function getDepartmentos(cargos) {
        return models.Departamento.findAll({
            attributes: ['codigo', 'nombre', 'acronimo'],

            raw: true
        })
            .each(function (departamentos) {
                let codigoDepartamento = departamentos['codigo'];
                let nombreDepartamento = departamentos['nombre'];
                let acronimoDepartamento = departamentos['acronimo'];
                let departamento = { codigo: codigoDepartamento, nombre: nombreDepartamento, acronimo: acronimoDepartamento }
                departamentosList.push(departamento);

            })
            .then(function (departamentos) {
                getResponsablesDocentes(cargos, departamentos)
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });
    }
    function getResponsablesDocentes(cargos, departamentos) {

        return models.ProgramacionDocente.findAll({
            attributes: ['identificador', 'fechaProgDoc', 'PlanEstudioId'],

            raw: true
        })
            .each(function (programacionesDoc) {
                let indentificador = programacionesDoc['identificador'];
                let fechaProgDoc = programacionesDoc['fechaProgDoc'];
                let PlanEstudioId = programacionesDoc['PlanEstudioId'];
                let pd = { indentificador: indentificador, fechaProgDoc: fechaProgDoc, PlanEstudioId: PlanEstudioId }
                programacionesDocentes.push(pd);

            })
            .then(function (programacionesDoc) {
                //hacer un metodo  que le pasas programaciones y te guarda en un array las + nuevas
                //despues otro metodo que llama a tabla de asignaturas de cada indentificador de PD y guarda en un array con los departamentos de cada indentificador de PD
                //ahora ya tienes los departamentos que intervienen
                //compruebas en la tabla de roles si estos estan o no, si no estan los creas
                let nuevopath = "" + req.baseUrl + "/gestionRoles/guardarRoles";
                let cancelarpath = "" + req.baseUrl + "/gestionRoles";
                let view = req.originalUrl.toLowerCase().includes("consultar") ? "rolesConsultar" : "gestionRoles"
                res.render(view, {
                    contextPath: app.contextPath,
                    roles: cargos.sort(funciones.sortRolesporDepartamento),
                    profesores: profesores,
                    nuevopath: nuevopath,
                    cancelarpath: cancelarpath,
                    submenu: req.session.submenu,
                    departamentos: departamentos.sort(funciones.sortDepartamentos),
                    planID: req.session.planID,
                    planEstudios: res.locals.planEstudios,
                    programacionesDocentes: programacionesDocentes,
                    menu: req.session.menu
                });
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });

    }

}

//query para guardar los cambios del sistema
exports.guardarRoles = function (req, res, next) {
    if (!res.locals.permisoDenegado) {
        req.session.submenu = "Roles"
        delete req.session.user.rols; //para asi luego obligarle a volver a buscarlos por los cambios que hayan
        //sacar name del rol  guardar
        //id del rol a actualizar
        let toActualizar = req.body.actualizar;

        let profesorId = toActualizar.split("_")[1];

        //id y cargo del rol anterior => atento cuando undefined
        let rolToActualizar = req.body.rol;
        let idRolAntiguo = req.body.PersonaId;
        let PlanEstudioCodigo = req.body.PlanEstudioCodigo;
        let DepartamentoCodigo = req.body.DepartamentoCodigo;
        if (PlanEstudioCodigo !== null && PlanEstudioCodigo !== undefined){
            req.session.planID = PlanEstudioCodigo
        }
    

        //actualizar el id de PersonaId si se ha escrito algo
        //actualizamos subposgrado jefeestudios secretario
        if (PlanEstudioCodigo === undefined && DepartamentoCodigo === undefined && !isNaN(profesorId)) {
            return models.Rol.update(
                { PersonaId: profesorId }, /* set attributes' value */
                { where: { rol: rolToActualizar } } /* where criteria */
            ).then(() => {
                next();
            });
        }
        //actualizar cargos de coordinadores de titulacion
        else if (PlanEstudioCodigo !== undefined && DepartamentoCodigo !== undefined && !isNaN(profesorId)) {
            if (PlanEstudioCodigo !== null && DepartamentoCodigo.length === 0) {
                return models.Rol.update(
                    { PersonaId: profesorId }, /* valor a cambiar */
                    { where: { DepartamentoCodigo: null, PlanEstudioCodigo: PlanEstudioCodigo } } /* criterio dentro de la tabla */
                ).then(() => {
                    next();
                })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            }
            // actualizamos directores de departamento
            else if (PlanEstudioCodigo.length === 0 && DepartamentoCodigo !== null && profesorId) {
                return models.Rol.update(
                    { PersonaId: profesorId }, /*valor a cambiar */
                    { where: { DepartamentoCodigo: DepartamentoCodigo, PlanEstudioCodigo: null } } /* criterio dentro de la tabla */
                ).then(() => {
                    next(); 
                })
                .catch(function (error) {
                    console.log("Error:", error);
                    next(error);
                });
            }
            // actualizamos Responsables Docentes
            else if (PlanEstudioCodigo.length > 0 && DepartamentoCodigo.length > 0 && profesorId){
                return models.Rol.update(
                    { PersonaId: profesorId }, /*valor a cambiar */
                    { where: { DepartamentoCodigo: DepartamentoCodigo, PlanEstudioCodigo: PlanEstudioCodigo } } /* criterio dentro de la tabla */
                ).then(() => {
                    next();
                })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });
            }
        }
        else {

            next();
            //si no se ha escrito nada en la celda
        }
    }else{
        req.session.save(function () {
            res.redirect("" + req.baseUrl)
        })
    }
    //atento al hacer el insert al sistema, buscar como hacerlo

    //metodo en el caso de un solo, pensar ademas en como hacer la query para responsables docentes de cada titulacion y departamento

    //volver a cargar la pagina de gestionRoles, volver a hacer la carga de la pagina de roles, volver  a hcer la llamada
}

exports.redir = function (req, res, next) {
    req.session.save(function(){
        res.redirect("" + req.baseUrl + "/gestionRoles")
    })

}


exports.deleteRoles = function (req, res, next) {
    return models.sequelize.query(query = `DELETE FROM public."Rols" r  WHERE r."rol" = 'DirectorDepartamento' and r."PlanEstudioCodigo" = '09AT'
    and r."DepartamentoCodigo" = 'D550';`
    ).then(() => {
        next();
    }).catch(function (err) {
        next(err);
    })
}



