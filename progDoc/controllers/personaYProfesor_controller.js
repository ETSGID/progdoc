let models = require('../models');
let funciones = require('../funciones');

async function getPeople(onlyProfesor) {
    let profesores = [];
    let required = onlyProfesor === true ? true : false;
    try {
        let profesores2 = await models.Persona.findAll({
            attributes: ['identificador', 'email', 'nombre', 'apellido'],
            include: [{
                model: models.Profesor,
                required: required,
            }],
            raw: true
        })
        profesores2.forEach(function (profesor) {
            let nombre = profesor['apellido'] + " " + profesor['nombre']
            let nombreCorregido = profesor['apellido'] + ", " + profesor['nombre']
            nombreCorregido = funciones.primerasMayusc(nombreCorregido)
            let correo = profesor['email']
            let identificador = profesor['identificador']
            let prof = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido, identificador: identificador }
            profesores.push(prof);
        })
        return profesores;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

async function getPersonCorreo(onlyProfesor, correo) {
    let required = onlyProfesor === true ? true : false;
    try {
        let pers = await models.Persona.findOne({
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
        if (pers) {
            let nombre = pers['apellido'] + " " + pers['nombre']
            let nombreCorregido = pers['apellido'] + ", " + pers['nombre']
            nombreCorregido = funciones.primerasMayusc(nombreCorregido)
            let correo = pers['email']
            let identificador = pers['identificador']
            let persona = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido, identificador: identificador }
            return persona;
        } else {
            return null;
        }
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

//te da las ultimas pds existentes para el plan, tipoPD y ano
//en caso de pasar la pdIDNoIncluir te obvia esa, se utiliza para el pdf 
exports.getPersonas = async function () {
    try {
        let personas = await getPeople(false);
        return personas;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

//get profesores
exports.getProfesores = async function () {
    try {
        let profesores = await getPeople(true);
        return profesores;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

exports.getProfesorCorreo = async function (correo) {
    try {
        let prof = await getPersonCorreo(true, correo);
        return prof;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

exports.getPersonaCorreo = async function (correo) {
    try {
        let person = await getPersonCorreo(false, correo);
        return person;
    }
    catch (error) {
        //se propaga el error lo captura el middleware
        throw error;
    }
}

//anadir un profesor o persona
exports.anadirProfesor = async function (req, res, next) {
    try {
        let id = ""
        let nuevaPersona = await models.Persona.findOrCreate({
            where: { email: req.body.email },
            defaults: { email: req.body.email, nombre: req.body.nombre.toUpperCase(), apellido: req.body.apellido.toUpperCase() }
        })
        let prof = {};
        prof.ProfesorId = nuevaPersona[0].identificador;
        id = prof.ProfesorId
        if (req.body.isProfesor === true) {
            let profesorToAnadir = models.Profesor.build(
                prof
            )
            await profesorToAnadir.save()
        }
        res.json({ success: true, identificador: id });
    }
    catch (error) {
        console.log("Error:", error);
        res.json({ success: false })
    }
}
