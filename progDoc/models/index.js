/* global DEV, DOCKER */
const path = require('path');
const Sequelize = require('sequelize');

// Cargar ORM

//    DATABASE_URL = postgres://user:passwd@host:port/database
// eslint-disable-next-line no-unneeded-ternary
const logs = DEV === 'true' ? false : false;
let sequelize;
let sequelizeSession;
const DB_USERNAME = process.env.DB_USERNAME || 'progdoc';
const DB_PASSWORD = process.env.DB_PASSWORD || 'progdoc';
const DB_HOST = process.env.DB_HOST || 'db';
const POSTGRES_DB = process.env.POSTGRES_DB || 'progdoc';
const DBSESSION_USERNAME = process.env.DBSESSION_USERNAME || 'progdoc';
const DBSESSION_PASSWORD = process.env.DBSESSION_PASSWORD || 'progdoc';
const POSTGRESSESION_DB = process.env.POSTGRESSESION_DB || 'progdocsession';
if (DOCKER === 'true') {
  sequelize = new Sequelize(
    `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${POSTGRES_DB}`,
    { logging: logs }
  );
  sequelizeSession = new Sequelize(
    `postgres://${DBSESSION_USERNAME}:${DBSESSION_PASSWORD}@dbsession:5432/${POSTGRESSESION_DB}`,
    { logging: logs }
  );
} else {
  sequelize = new Sequelize(
    `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${POSTGRES_DB}`,
    { logging: logs }
  );
  sequelizeSession = new Sequelize(
    `postgres://${DBSESSION_USERNAME}:${DBSESSION_PASSWORD}@${DB_HOST}:5432/${POSTGRESSESION_DB}`,
    { logging: logs }
  );
}

// Importar la definicion de las tablas
const Departamento = sequelize.import(path.join(__dirname, 'Departamento'));
const Asignatura = sequelize.import(path.join(__dirname, 'Asignatura'));
const Examen = sequelize.import(path.join(__dirname, 'Examen'));
const Grupo = sequelize.import(path.join(__dirname, 'Grupo'));
const Persona = sequelize.import(path.join(__dirname, 'Persona'));
const PlanEstudio = sequelize.import(path.join(__dirname, 'PlanEstudio'));
const Profesor = sequelize.import(path.join(__dirname, 'Profesor'));
const AsignacionProfesor = sequelize.import(
  path.join(__dirname, 'AsignacionProfesor')
);
const ProgramacionDocente = sequelize.import(
  path.join(__dirname, 'ProgramacionDocente')
);
const Rol = sequelize.import(path.join(__dirname, 'Rol'));
const Itinerario = sequelize.import(path.join(__dirname, 'Itinerario'));
const FranjaExamen = sequelize.import(path.join(__dirname, 'FranjaExamen'));

const EventoGeneral = sequelize.import(path.join(__dirname, 'EventoGeneral'));
const EventoPlan = sequelize.import(path.join(__dirname, 'EventoPlan'));
const Calendario = sequelize.import(path.join(__dirname, 'Calendario'));

const ConjuntoActividadParcial = sequelize.import(
  path.join(__dirname, 'ConjuntoActividadParcial')
);
const ConjuntoActividadParcialGrupo = sequelize.import(
  path.join(__dirname, 'ConjuntoActividadParcialGrupo')
);
const ActividadParcial = sequelize.import(
  path.join(__dirname, 'ActividadParcial')
);

const Session = sequelizeSession.import(path.join(__dirname, 'Session'));

// ----- PERSONAL-----//

// Relacion 1 a 1 entre Profesor y Persona:
Persona.hasOne(Profesor, { foreignKey: 'ProfesorId' });
Profesor.belongsTo(Persona, { foreignKey: 'ProfesorId' });

// Relacion 1 a N entre Departamento y Profesor:
Departamento.hasMany(Profesor, { foreignKey: 'DepartamentoCodigo' });
Profesor.belongsTo(Departamento, { foreignKey: 'DepartamentoCodigo' });

// -----PROGRAMACION DOCENTE-----//

// Relacion 1 a N entre Departamento y Asignatura:
Departamento.hasMany(Asignatura, { foreignKey: 'DepartamentoResponsable' });
Asignatura.belongsTo(Departamento, { foreignKey: 'DepartamentoResponsable' });

// Relacion 1 a N entre Asignatura y Examen
Asignatura.hasMany(Examen);
Examen.belongsTo(Asignatura);

// Relacion 1 a N entre programacion docente y grupo
ProgramacionDocente.hasMany(Grupo, { foreignKey: 'ProgramacionDocenteId' });
Grupo.belongsTo(ProgramacionDocente, { foreignKey: 'ProgramacionDocenteId' });

// Relacion 1 a N entre Profesor y Asignatura:
Profesor.hasMany(Asignatura, { foreignKey: 'CoordinadorAsignatura' });
Asignatura.belongsTo(Profesor, {
  as: 'Coordinador',
  foreignKey: 'CoordinadorAsignatura'
});

// Relacion N a N a N entre Profesor,Asignatura y Grupo a través de AsignacionProfesor:
Profesor.hasMany(AsignacionProfesor, { foreignKey: 'ProfesorId' });
AsignacionProfesor.belongsTo(Profesor, { foreignKey: 'ProfesorId' });

Asignatura.hasMany(AsignacionProfesor, { foreignKey: 'AsignaturaId' });
AsignacionProfesor.belongsTo(Asignatura, { foreignKey: 'AsignaturaId' });

Grupo.hasMany(AsignacionProfesor, { foreignKey: 'GrupoId' });
AsignacionProfesor.belongsTo(Grupo, { foreignKey: 'GrupoId' });

// Relacion 1 a N PlanEstudio y ProgramacionDocente
PlanEstudio.hasMany(ProgramacionDocente, { foreignKey: 'PlanEstudioId' });
ProgramacionDocente.belongsTo(PlanEstudio, { foreignKey: 'PlanEstudioId' });

// Relacion 1 a N Programacion Docente y Asignatura
ProgramacionDocente.hasMany(Asignatura);
Asignatura.belongsTo(ProgramacionDocente);

// -----ROLES-----//

// Relación 1 a N entre PlanEstudio y rol
PlanEstudio.hasMany(Rol);
Rol.belongsTo(PlanEstudio);

// Relación 1 a N entre Departamento y rol
Departamento.hasMany(Rol);
Rol.belongsTo(Departamento);

// Relación 1 a N entre persona y rol
Persona.hasMany(Rol, { foreignKey: 'PersonaId' });
Rol.belongsTo(Persona, { foreignKey: 'PersonaId' });

// Relación 1 a N entre Plan e Itinerario ->
// ojo si se elimina un plan de estudio en la bbdd debe quedar para ver los de los años anteriores
PlanEstudio.hasMany(Itinerario);
Itinerario.belongsTo(PlanEstudio);

// -----ITINEARIOS-----//

// Relación 1 a N entre Itinerario y Asignatura
Itinerario.hasMany(Asignatura);
Asignatura.belongsTo(Itinerario);

// Relación 1 a N entre Itineario y Grupo
Itinerario.hasMany(Grupo);
Grupo.belongsTo(Itinerario);

// -----TRIBUNALES-----//

// Relacion 1 a N  entre profesor Asignatura (para Presidente, Secretario, Vocal y suplente)
Profesor.hasMany(Asignatura, { foreignKey: 'PresidenteTribunalAsignatura' });
Asignatura.belongsTo(Profesor, {
  as: 'Presidente',
  foreignKey: 'PresidenteTribunalAsignatura'
});

Profesor.hasMany(Asignatura, { foreignKey: 'VocalTribunalAsignatura' });
Asignatura.belongsTo(Profesor, {
  as: 'Vocal',
  foreignKey: 'VocalTribunalAsignatura'
});

Profesor.hasMany(Asignatura, { foreignKey: 'SecretarioTribunalAsignatura' });
Asignatura.belongsTo(Profesor, {
  as: 'Secretario',
  foreignKey: 'SecretarioTribunalAsignatura'
});

Profesor.hasMany(Asignatura, { foreignKey: 'SuplenteTribunalAsignatura' });
Asignatura.belongsTo(Profesor, {
  as: 'Suplente',
  foreignKey: 'SuplenteTribunalAsignatura'
});

// Relacion 1 a N entre ProgramacionDocente y FranjaExamen
ProgramacionDocente.hasMany(FranjaExamen, {
  foreignKey: 'ProgramacionDocenteId'
});
FranjaExamen.belongsTo(ProgramacionDocente, {
  foreignKey: 'ProgramacionDocenteId'
});

// -----CALENDADRIO-----//

// Relacion 1 a N entre PlanEstudio y EventoPlan
PlanEstudio.hasMany(EventoPlan, { foreignKey: 'PlanEstudioId' });
EventoPlan.belongsTo(PlanEstudio, { foreignKey: 'PlanEstudioId' });

// Relacion 1 a N entre EventoGeneral y EventoPlan
EventoGeneral.hasMany(EventoPlan, { foreignKey: 'EventoGeneralId' });
EventoPlan.belongsTo(EventoGeneral, { foreignKey: 'EventoGeneralId' });

// -----ACTIVIDADES PARCIALES-----//

// Relacion 1 a N entre ProgramacionDocente y ConjuntoActividadParcial
ProgramacionDocente.hasMany(ConjuntoActividadParcial, {
  foreignKey: 'ProgramacionDocenteId'
});
ConjuntoActividadParcial.belongsTo(ProgramacionDocente, {
  foreignKey: 'ProgramacionDocenteId'
});

// Relacion 1 a N entre ConjuntoActividadParcial y ActividadParcial
ConjuntoActividadParcial.hasMany(ActividadParcial, {
  foreignKey: 'ConjuntoActividadParcialId'
});
ActividadParcial.belongsTo(ConjuntoActividadParcial, {
  foreignKey: 'ConjuntoActividadParcialId'
});

// Relacion 1 a N entre Asignatura y ActividadParcial
Asignatura.hasMany(ActividadParcial, { foreignKey: 'AsignaturaId' });
ActividadParcial.belongsTo(Asignatura, { foreignKey: 'AsignaturaId' });

// Relacion N a N entre Grupo y ConjuntoActividadParcial
ConjuntoActividadParcial.belongsToMany(Grupo, {
  through: { model: ConjuntoActividadParcialGrupo },
  foreignKey: 'ConjuntoParcialId'
});
Grupo.belongsToMany(ConjuntoActividadParcial, {
  through: { model: ConjuntoActividadParcialGrupo },
  foreignKey: 'GrupoId'
});

sequelize.sync();
sequelizeSession.sync();

// Exportamos modelos
exports.Profesor = Profesor; // exportar definición de tabla Profesor
exports.AsignacionProfesor = AsignacionProfesor; // exportar definición de tabla AsignaciónProfesor
exports.Persona = Persona; // exportar definición de tabla Persona
exports.Departamento = Departamento; // exportar definición de tabla Departamento
exports.Asignatura = Asignatura; // exportar definición de tabla Asignatura
exports.Grupo = Grupo; // exportar definición de tabla Grupo
exports.PlanEstudio = PlanEstudio; // exportar definición de tabla PlanEstudio
exports.ProgramacionDocente = ProgramacionDocente; // exportar tabla ProgramacionDocente
exports.Examen = Examen; // exportar definición de tabla Examen
exports.Rol = Rol; // exportar definición de tabla Rol
exports.Itinerario = Itinerario; // exportar definición de tabla Itinerario
exports.Session = Session; // exportar definición de tabla Session
exports.FranjaExamen = FranjaExamen; // exportar definición de tabla Franja Examen
exports.EventoGeneral = EventoGeneral; // exportar definición de tabla EventoGeneral
exports.EventoPlan = EventoPlan; // exportar definición de tabla EventoPlan
exports.Calendario = Calendario; // exportar definición de tabla Calendario
exports.ConjuntoActividadParcial = ConjuntoActividadParcial; // ConjuntoActividadParcial
exports.ConjuntoActividadParcialGrupo = ConjuntoActividadParcialGrupo; // ConjuntoActividadParcialGrupo
exports.ActividadParcial = ActividadParcial; // exportar definicion de tabla ActividadParcial
exports.sequelize = sequelize;
exports.sequelizeSession = sequelizeSession;
