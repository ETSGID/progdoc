const models = require('../models');
const funciones = require('../funciones');

const getPeople = async onlyProfesor => {
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
};

const getPersonCorreo = async (onlyProfesor, correo) => {
  const required = onlyProfesor === true;
  // eslint-disable-next-line no-useless-catch
  try {
    return await models.Persona.findOne({
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
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

const getPeoplePagination = async (onlyProfesor, page, limit) => {
  const offset = 0 + (page - 1) * limit;
  const required = onlyProfesor === true;
  // eslint-disable-next-line no-useless-catch
  try {
    // includes
    const { count, rows } = await models.Persona.findAndCountAll({
      offset,
      limit,
      order: [['apellido', 'ASC']],
      include: [
        {
          model: models.Profesor,
          required
        }
      ],
      raw: true
    });
    return { count, personas: rows };
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.getPersonas = async () => {
  // eslint-disable-next-line no-useless-catch
  try {
    const personas = await getPeople(false);
    return personas;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.getPersonasPagination = async (req, res, next) => {
  req.session.submenu = 'Personal';
  // eslint-disable-next-line no-useless-catch
  try {
    const page = Number(req.query.page) || 1;
    const itemsPerPage = 50;
    const { count, personas } = await getPeoplePagination(
      false,
      page,
      itemsPerPage
    );
    const pages = Math.ceil(count / itemsPerPage);
    res.render('personas/personas', {
      count,
      permisoDenegado: res.locals.permisoDenegado || null,
      page,
      pages,
      personas,
      menu: req.session.menu,
      submenu: req.session.submenu,
      path: `${req.baseUrl}/Personal`
    });
  } catch (error) {
    // se propaga el error lo captura el middleware
    next(error);
  }
};

// get profesores
exports.getProfesores = async () => {
  // eslint-disable-next-line no-useless-catch
  try {
    const profesores = await getPeople(true);
    return profesores;
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

// anadir un profesor o persona
// TODO cambiar y usar la de abajo
exports.anadirProfesor = async (req, res) => {
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
    console.error('Error:', error);
    res.json({ success: false });
  }
};

// anadir un profesor o persona
exports.anadirPersonaAndProfesor = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      const [persona, created] = await models.Persona.findOrCreate({
        where: { email: req.body.email },
        defaults: {
          email: req.body.email,
          nombre: req.body.nombre.toUpperCase(),
          apellido: req.body.apellido.toUpperCase()
        }
      });
      if (!created) {
        res.json({
          success: false,
          msg: `Una persona con ese email ya está en el sistema se trata de ${persona.nombre} ${persona.apellido}`
        });
      } else {
        const prof = {};
        prof.ProfesorId = persona.identificador;
        if (req.body.isProfesor === true) {
          const profesorToAnadir = models.Profesor.build(prof);
          await profesorToAnadir.save();
        }
        res.json({
          success: true,
          persona: await getPersonCorreo(false, req.body.email)
        });
      }
    } catch (error) {
      console.error('Error:', error);
      res.json({ success: false });
    }
  } else {
    res.json({
      success: false,
      msg: 'No tiene permiso para realizar esta acción'
    });
  }
};

// update un profesor o persona
exports.updatePersonaAndProfesor = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      const { id } = req.params;
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(id) && id !== null) {
        await models.Persona.update(
          {
            email: req.body.email,
            nombre: req.body.nombre.toUpperCase(),
            apellido: req.body.apellido.toUpperCase()
          },
          { where: { identificador: id } }
        );
        if (req.body.isProfesor === true) {
          await models.Profesor.findOrCreate({
            where: { ProfesorId: id },
            defaults: {
              ProfesorId: id
            }
          });
        } else {
          /**
           borrar las asignaciones de profesores
           para evitar entradas de asignacion profesores con solo
           asignatura asignatura y grupo
           de asignatura se queda vacío si es coordinador o tribunal
           de roles se queda vacío ese rol
           */
          await models.AsignacionProfesor.destroy({
            where: {
              ProfesorId: id
            }
          });
          await models.Profesor.destroy({
            where: { ProfesorId: id }
          });
        }
        res.json({
          success: true,
          persona: await getPersonCorreo(false, req.body.email)
        });
      } else {
        res.json({
          success: false,
          msg: 'id de persona no encontrado'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      res.json({ success: false });
    }
  } else {
    res.json({
      success: false,
      msg: 'No tiene permiso para realizar esta acción'
    });
  }
};

// delete un profesor y persona
exports.deletePersonaAndProfesor = async (req, res) => {
  if (!res.locals.permisoDenegado) {
    try {
      const { id } = req.params;
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(id) && id !== null) {
        /**
          borrar las asignaciones de profesores
          para evitar entradas de asignacion profesores con solo
          asignatura asignatura y grupo
          de asignatura se queda vacío si es coordinador o tribunal
          de roles se queda vacío ese rol
          */
        await models.AsignacionProfesor.destroy({
          where: {
            ProfesorId: id
          }
        });
        await models.Profesor.destroy({
          where: { ProfesorId: id }
        });
        await models.Persona.destroy({
          where: { identificador: id }
        });
        res.json({
          success: true,
          persona: { identificador: Number(id) }
        });
      } else {
        res.json({
          success: false,
          msg: 'id de persona no encontrado'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      res.json({ success: false });
    }
  } else {
    res.json({
      success: false,
      msg: 'No tiene permiso para realizar esta acción'
    });
  }
};

exports.getPersonCorreo = getPersonCorreo;
