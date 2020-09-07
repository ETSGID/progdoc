const Sequelize = require('sequelize');
const models = require('../models');
const helpers = require('../lib/helpers');
const progDocController = require('./progDoc_controller');
const departamentoController = require('./departamento_controller');
const personaYProfesorController = require('./personaYProfesor_controller');
const enumsPD = require('../enumsPD');

const op = Sequelize.Op;

const getRolsPersona = async personaId => {
  // eslint-disable-next-line no-useless-catch
  try {
    if (personaId) {
      return await models.Rol.findAll({
        attributes: ['rol', 'PlanEstudioCodigo', 'DepartamentoCodigo'],
        where: {
          PersonaId: personaId
        },
        // left join
        include: [
          {
            model: models.PlanEstudio,
            attributes: ['nombre', 'nombreCompleto']
          },
          {
            model: models.Departamento,
            attributes: ['nombre', 'acronimo']
          }
        ],
        raw: true
      });
    }
    return [];
  } catch (error) {
    // se propaga el error lo captura el middleware
    throw error;
  }
};

exports.getRolsPersonaView = async (req, res, next) => {
  try {
    req.session.user.rols = await getRolsPersona(req.session.user.PersonaId);
    res.render('index', {
      rolsSistema: enumsPD.rols,
      rolsDelegados: enumsPD.delegacion
    });
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// comprueba el rol o si es delegado de dicho rol en función del estado de la PD pasada
// comprueba ademas condiciones previas (array de condiciones con resultado booleano)
// comprueba condiciones en funcion del estado de la programacion docente
exports.comprobarRols = async (req, res, next) => {
  try {
    req.session.user.rols = await getRolsPersona(req.session.user.PersonaId);
    const { rols } = req.session.user;
    const rolsCoincidentes = [];
    // de esta forma también se evita que se cierre una programacion docente y justo alguien edite
    const { pdID } = req.session;
    const plan = progDocController.getPlanPd(pdID);
    const pd = await models.PlanEstudio.findOne({
      where: { codigo: plan },
      raw: true,
      include: [
        {
          // incluye las asignaciones de profesores y los horarios.
          model: models.ProgramacionDocente,
          where: { identificador: pdID },
          // left join
          required: false
        }
      ]
    });
    // cambio en la bbdd remiendo
    if (pd) {
      res.locals.progDoc = pd;
      // eslint-disable-next-line no-unused-expressions
      if (pd['ProgramacionDocentes.reabierto'] === null) {
        pd['ProgramacionDocentes.reabierto'] = 0;
      }
    }
    res.locals.rols.forEach(r => {
      const rolExistente = rols.find(
        obj =>
          (obj.rol === r.rol ||
            (enumsPD.delegacion[r.rol] &&
              enumsPD.delegacion[r.rol].includes(obj.rol))) &&
          obj.PlanEstudioCodigo === r.PlanEstudioCodigo &&
          obj.DepartamentoCodigo === r.DepartamentoCodigo
      );
      if (rolExistente) {
        let cumple = true;
        if (Array.isArray(r.condicionesPrevias)) {
          for (let i = 0; i < r.condicionesPrevias.length; i++) {
            if (!r.condicionesPrevias[i].resultado) {
              cumple = false;
            }
          }
        }
        if (Array.isArray(r.condiciones)) {
          for (let i = 0; i < r.condiciones.length; i++) {
            const condic = r.condiciones[i].condicion;
            switch (condic.length) {
              case 1:
                // hay que comprobar que existe pd
                if (
                  !pd ||
                  `${pd[`ProgramacionDocentes.${condic[0]}`]}` !==
                    `${r.condiciones[i].resultado}`
                ) {
                  cumple = false;
                }
                break;
              case 2:
                // hay que comprobar que existe pd
                if (
                  !pd ||
                  `${pd[`ProgramacionDocentes.${condic[0]}`][condic[1]]}` !==
                    `${r.condiciones[i].resultado}`
                ) {
                  cumple = false;
                }
                break;
              default:
                // no codition to probe
                break;
            }
          }
        }
        // type de permiso en principio sera consultar o cumplimentar
        if (r.tipo) {
          rolExistente.tipo = enumsPD.permisions[r.tipo];
        }
        // si cumple las condiciones o no hay condiciones
        if (cumple) {
          rolsCoincidentes.push(rolExistente);
        }
      }
    });
    if (rolsCoincidentes.length === 0) {
      res.locals.permisoDenegado =
        'No tiene permiso contacte con Jefatura de Estudios si debería tenerlo';
    }
    res.locals.rolsCoincidentes = rolsCoincidentes;
    next();
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// puede acceder todo el mundo
// comprobar roles para pintar menu
exports.comprobarRolYPersona = async (req, res, next) => {
  const role = req.session.user.employeetype;
  if (role.includes('F') || role.includes('L')) {
    req.session.portal = 'pas';
  } else if (role.includes('D')) {
    req.session.portal = 'pdi';
  } else {
    req.session.portal = 'pdi';
  }
  next();
};

// funcion de getRoles para directores de departamentos jefe de estudios y subdirector de posgrado
exports.getRoles = async (req, res, next) => {
  const responsablesDocentes = [];
  let profesores;
  let cargos;
  let departs;
  const wherePlan = {};
  wherePlan.PlanEstudioCodigo = [null, req.session.planID];
  try {
    // responsables docentes
    cargos = await models.Rol.findAll({
      attributes: [
        'rol',
        'PlanEstudioCodigo',
        'PersonaId',
        'DepartamentoCodigo'
      ],
      where: {
        PlanEstudioCodigo: {
          [op.or]: wherePlan.PlanEstudioCodigo
        }
      },
      include: [
        {
          model: models.Persona,
          attributes: ['nombre', 'apellido'],
          required: false,
          nested: true
        }
      ],
      raw: true
    });
    cargos.forEach((persona, roles) => {
      const { rol } = roles;
      const { PersonaId } = roles;
      const { PlanEstudioCodigo } = roles;
      const { DepartamentoCodigo } = roles;
      const cargo = {
        rol,
        PlanEstudioCodigo,
        PersonaId,
        DepartamentoCodigo
      };
      responsablesDocentes.push(cargo);
    });
    profesores = await personaYProfesorController.getPersonas();
    departs = await departamentoController.getAllDepartamentos();
    // aqui llamar a la funcion de sacar los nombres de cada id
    const nuevopath = req.baseUrl;
    const cancelarpath = req.baseUrl;
    const view =
      req.session.menuBar === enumsPD.menuBar.consultar.nombre
        ? 'roles/rolesConsultar'
        : 'roles/gestionRoles';
    // foco al cambiar de plan desde la view para que vuelva a ese punto
    const foco = !!req.query.foco;
    res.render(view, {
      roles: cargos.sort(helpers.sortRolesporDepartamento),
      rolesEnum: enumsPD.rols,
      profesores,
      nuevopath,
      cancelarpath,
      foco,
      departamentos: departs.sort(helpers.sortDepartamentos),
      planEstudios: res.locals.planEstudios,

      departamentosResponsables: res.locals.departamentosResponsables,
      progDoc: res.locals.progDoc,
      // para añadir una persona al sistema no tiene por que ser un profesor.
      onlyProfesor: false
    });
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// query para guardar los cambios del sistema
exports.guardarRoles = async (req, res, next) => {
  // si no tiene permiso o no hay rol
  if (
    !res.locals.permisoDenegado ||
    !req.body.rol ||
    !req.body.rol.split('_')[0]
  ) {
    try {
      // sacar name del rol  guardar
      let personaId;
      // si hay que eliminarlo sigue existiendo el rol pero no asignado a nadie.
      let toActualizar = req.body.actualizar;
      if (!toActualizar) {
        toActualizar = req.body.eliminar;
        personaId = null;
      } else {
        // eslint-disable-next-line prefer-destructuring
        personaId = toActualizar.split('_')[1];
      }

      // rol
      let rolToActualizar = req.body.rol.split('_')[0];
      let PlanEstudioCodigo = req.body.rol.split('_')[1];
      let DepartamentoCodigo = req.body.rol.split('_')[2];
      if (rolToActualizar.trim() === '') rolToActualizar = null;
      if (PlanEstudioCodigo.trim() === '') PlanEstudioCodigo = null;
      if (DepartamentoCodigo.trim() === '') DepartamentoCodigo = null;
      if (PlanEstudioCodigo !== null) {
        req.session.planID = PlanEstudioCodigo;
      }
      const filtro = {};
      filtro.rol = rolToActualizar;
      filtro.DepartamentoCodigo = DepartamentoCodigo;
      filtro.PlanEstudioCodigo = PlanEstudioCodigo;
      const obj = await models.Rol.findOne({ where: filtro });
      if (obj) {
        await obj.update({ PersonaId: personaId });
      } else if (
        Object.values(enumsPD.rols).includes(rolToActualizar) === true
      ) {
        await models.Rol.create({
          rol: rolToActualizar,
          DepartamentoCodigo,
          PlanEstudioCodigo,
          PersonaId: personaId
        });
      } else {
        // nothing
      }
      next();
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  } else {
    next();
  }
};

exports.redir = (req, res) => {
  req.session.save(() => {
    res.redirect(req.baseUrl);
  });
};

exports.getRolsPersona = getRolsPersona;
