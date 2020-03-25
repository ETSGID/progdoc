const models = require('../models');
const funciones = require('../funciones');

async function getPeople(onlyProfesor) {
  const profesores = [];
  const required = onlyProfesor === true;
  // eslint-disable-next-line no-useless-catch
  try {
    const profesores2 = await models.Persona.findAll({
      attributes: ['identificador', 'email', 'nombre', 'apellido'],
      include: [
        {
          model: models.Profesor,
          required
        }
      ],
      raw: true
    });
    profesores2.forEach(profesor => {
      const nombre = `${profesor.apellido} ${profesor.nombre}`;
      let nombreCorregido = `${profesor.apellido}, ${profesor.nombre}`;
      nombreCorregido = funciones.primerasMayusc(nombreCorregido);
      const correo = profesor.email;
      const { identificador } = profesor;
      const prof = {
        nombre,
        correo,
        nombreCorregido,
        identificador
      };
      profesores.push(prof);
    });
    return profesores;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
}

async function getPersonCorreo(onlyProfesor, correo) {
  const required = onlyProfesor === true;
  // eslint-disable-next-line no-useless-catch
  try {
    const pers = await models.Persona.findOne({
      attributes: ['identificador', 'email', 'nombre', 'apellido'],
      where: {
        email: correo
      },
      include: [
        {
          model: models.Profesor,
          required
        }
      ],

      raw: true
    });
    if (pers) {
      const nombre = `${pers.apellido} ${pers.nombre}`;
      let nombreCorregido = `${pers.apellido}, ${pers.nombre}`;
      nombreCorregido = funciones.primerasMayusc(nombreCorregido);
      // eslint-disable-next-line no-param-reassign
      correo = pers.email;
      const { identificador } = pers;
      const persona = {
        nombre,
        correo,
        nombreCorregido,
        identificador
      };
      return persona;
    }
    return null;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
}

// te da las ultimas pds existentes para el plan, tipoPD y ano
// en caso de pasar la pdIDNoIncluir te obvia esa, se utiliza para el pdf
exports.getPersonas = async function() {
  // eslint-disable-next-line no-useless-catch
  try {
    const personas = await getPeople(false);
    return personas;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// get profesores
exports.getProfesores = async function() {
  // eslint-disable-next-line no-useless-catch
  try {
    const profesores = await getPeople(true);
    return profesores;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.getProfesorCorreo = async function(correo) {
  // eslint-disable-next-line no-useless-catch
  try {
    const prof = await getPersonCorreo(true, correo);
    return prof;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.getPersonaCorreo = async function(correo) {
  // eslint-disable-next-line no-useless-catch
  try {
    const person = await getPersonCorreo(false, correo);
    return person;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// anadir un profesor o persona
exports.anadirProfesor = async function(req, res) {
  try {
    let id = '';
    const nuevaPersona = await models.Persona.findOrCreate({
      where: { email: req.body.email },
      defaults: {
        email: req.body.email,
        nombre: req.body.nombre.toUpperCase(),
        apellido: req.body.apellido.toUpperCase()
      }
    });
    const prof = {};
    prof.ProfesorId = nuevaPersona[0].identificador;
    id = prof.ProfesorId;
    if (req.body.isProfesor === true) {
      const profesorToAnadir = models.Profesor.build(prof);
      await profesorToAnadir.save();
    }
    res.json({ success: true, identificador: id });
  } catch (error) {
    console.log('Error:', error);
    res.json({ success: false });
  }
};
