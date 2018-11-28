let path = require('path');
let app = require('../app')


// Cargar ORM
let Sequelize = require('sequelize');

//    DATABASE_URL = postgres://user:passwd@host:port/database

let sequelize;
let sequelizeSession;
if (process.env.DOCKER === 'true'){
    sequelize = new Sequelize('postgres://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@db:5432/' + process.env.POSTGRES_DB);
    sequelizeSession = new Sequelize('postgres://' + process.env.DBSESSION_USERNAME + ':' + process.env.DBSESSION_PASSWORD + '@dbsession:5432/' + process.env.POSTGRESSESION_DB);
}
else{
    sequelize = new Sequelize('postgres://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@localhost:5432/' + process.env.POSTGRES_DB);
    sequelizeSession = new Sequelize('postgres://' + process.env.DBSESSION_USERNAME + ':' + process.env.DBSESSION_PASSWORD + '@localhost:5432/' + process.env.POSTGRESSESION_DB)
}



// Importar la definicion de las tablas 
let Departamento = sequelize.import(path.join(__dirname, 'Departamento'));
let Asignatura = sequelize.import(path.join(__dirname, 'Asignatura'));
let Examen  = sequelize.import(path.join(__dirname,'Examen'));
let Grupo = sequelize.import(path.join(__dirname, 'Grupo'));
let Persona = sequelize.import(path.join(__dirname, 'Persona'));
let PlanEstudio = sequelize.import(path.join(__dirname, 'PlanEstudio'));
let Profesor = sequelize.import(path.join(__dirname, 'Profesor'));
let AsignacionProfesor = sequelize.import(path.join(__dirname, 'AsignacionProfesor'));
let ProgramacionDocente = sequelize.import(path.join(__dirname, 'ProgramacionDocente'));
let Rol = sequelize.import(path.join(__dirname, 'Rol'));
let Itinerario = sequelize.import(path.join(__dirname, 'Itinerario'));


let Session = sequelizeSession.import(path.join(__dirname, 'Session'));

// Relacion 1 a 1 entre Profesor y Persona:
Persona.hasOne(Profesor, {foreignKey: 'ProfesorId'});

//Relacion 1 a N entre Departamento y Profesor:
Departamento.hasMany(Profesor, {foreignKey:'DepartamentoCodigo'})
Profesor.belongsTo(Departamento, {foreignKey:'DepartamentoCodigo'})


//Relacion 1 a N entre Departamento y Asignatura:
Departamento.hasMany(Asignatura, {foreignKey:'DepartamentoResponsable'})
Asignatura.belongsTo(Departamento,{foreignKey:'DepartamentoResponsable'})


//Relacion 1 a N entre Asignatura y Examen
Asignatura.hasMany(Examen)
Examen.belongsTo(Asignatura)

//Relacion 1 a N entre programacion docente y grupo
ProgramacionDocente.hasMany(Grupo, { foreignKey: 'ProgramacionDocenteId' })
Grupo.belongsTo(ProgramacionDocente, { foreignKey: 'ProgramacionDocenteId' })

//Relacion 1 a N entre Profesor y Asignatura:
Profesor.hasMany(Asignatura, { foreignKey: 'CoordinadorAsignatura'})
Asignatura.belongsTo(Profesor, { as: 'Coordinador',foreignKey: 'CoordinadorAsignatura'})

//Relacion N a N a N entre Profesor,Asignatura y Grupo a través de AsignacionProfesor:
Profesor.hasMany(AsignacionProfesor, { foreignKey: 'ProfesorId' })
AsignacionProfesor.belongsTo(Profesor, { foreignKey: 'ProfesorId' })

Asignatura.hasMany(AsignacionProfesor, { foreignKey: 'AsignaturaId' })
AsignacionProfesor.belongsTo(Asignatura, { foreignKey: 'AsignaturaId' })

Grupo.hasMany(AsignacionProfesor, { foreignKey: 'GrupoId' })
AsignacionProfesor.belongsTo(Grupo, { foreignKey: 'GrupoId' })


//Relacion 1 a N PlanEstudio y ProgramacionDocente
PlanEstudio.hasMany(ProgramacionDocente, { foreignKey: 'PlanEstudioId' });
ProgramacionDocente.belongsTo(PlanEstudio, { foreignKey: 'PlanEstudioId' });

//Relacion 1 a N Programacion Docente y Asignatura si hay varias prog doc en un año se repetiran las asignaturas en labbdd
ProgramacionDocente.hasMany(Asignatura);
Asignatura.belongsTo(ProgramacionDocente);


//Relación 1 a N entre PlanEstudio y rol
PlanEstudio.hasMany(Rol)
Rol.belongsTo(PlanEstudio)

//Relación 1 a N entre Departamento y rol
Departamento.hasMany(Rol)
Rol.belongsTo(Departamento)

//Relación 1 a N entre persona y rol
Persona.hasMany(Rol,{ foreignKey: 'PersonaId' })
Rol.belongsTo(Persona,{ foreignKey: 'PersonaId' })

//Relación 1 a N entre Plan e Itinerario -> ojo si se elimina un plan de estudio en la bbdd debe quedar para ver los de los años anteriores
PlanEstudio.hasMany(Itinerario);
Itinerario.belongsTo(PlanEstudio);

//Relación 1 a N entre Itinerario y Asignatura
Itinerario.hasMany(Asignatura);
Asignatura.belongsTo(Itinerario);

//Relación 1 a N entre Itineario y Grupo
Itinerario.hasMany(Grupo);
Grupo.belongsTo(Itinerario);

//Relacion 1 a N  entre profesor Asignatura (para Presidente, Secretario, Vocal y suplente)
Profesor.hasMany(Asignatura, { foreignKey: 'PresidenteTribunalAsignatura' });
Asignatura.belongsTo(Profesor, { as: 'Presidente', foreignKey: 'PresidenteTribunalAsignatura' });

Profesor.hasMany(Asignatura, { foreignKey: 'VocalTribunalAsignatura' });
Asignatura.belongsTo(Profesor, { as: 'Vocal', foreignKey: 'VocalTribunalAsignatura' });

Profesor.hasMany(Asignatura, { foreignKey: 'SecretarioTribunalAsignatura' });
Asignatura.belongsTo(Profesor, { as: 'Secretario', foreignKey: 'SecretarioTribunalAsignatura' });

Profesor.hasMany(Asignatura, { foreignKey: 'SuplenteTribunalAsignatura' });
Asignatura.belongsTo(Profesor, { as: 'Suplente', foreignKey: 'SuplenteTribunalAsignatura' });




sequelize.sync();
sequelizeSession.sync();

//Exportamos modelos
exports.Profesor = Profesor; // exportar definición de tabla Profesor
exports.AsignacionProfesor = AsignacionProfesor; //exportar definición de tabla AsignaciónProfesor
exports.Persona = Persona;   // exportar definición de tabla Persona
exports.Departamento = Departamento; // exportar definición de tabla Departamento
exports.Asignatura = Asignatura; // exportar definición de tabla Asignatura
exports.Grupo = Grupo; // exportar definición de tabla Grupo
exports.PlanEstudio = PlanEstudio; // exportar definición de tabla PlanEstudio
exports.ProgramacionDocente = ProgramacionDocente; // exportar definición de tabla ProgramacionDocente
exports.Examen = Examen; // exportar definición de tabla Examen
exports.Rol = Rol; //exportar definición de tabla Rol
exports.Itinerario = Itinerario; //exportar definición de tabla Itinerario
exports.Session = Session; //exportar definición de tabla Session
exports.sequelize = sequelize;
exports.sequelizeSession = sequelizeSession;
