// Definicion del modelo ProgramacionDocente:

module.exports = function(sequelize, DataTypes) {
  const ProgramacionDocente = sequelize.define(
    'ProgramacionDocente',
    {
      identificador: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      version: {
        type: DataTypes.INTEGER
      },
      anoAcademico: {
        type: DataTypes.STRING
      },
      semestre: {
        type: DataTypes.ENUM('1S', '2S', 'I')
      },
      estadoProGDoc: {
        type: DataTypes.INTEGER
      },
      fechaProgDoc: {
        type: DataTypes.DATE
      },
      // estado actualización de las actividades parciales
      estadoGrupos: {
        type: DataTypes.INTEGER
      },
      // fecha actualización de las actividades parciales
      fechaGrupos: {
        type: DataTypes.DATE
      },
      estadoProfesores: {
        type: DataTypes.JSONB
      },
      // fecha actualización de profesores
      fechaProfesores: {
        type: DataTypes.DATE
      },
      estadoTribunales: {
        type: DataTypes.JSONB
      },
      // fecha actualización de tribunales
      fechaTribunales: {
        type: DataTypes.DATE
      },
      estadoHorarios: {
        type: DataTypes.INTEGER
      },
      // fecha actualización de horarios
      fechaHorarios: {
        type: DataTypes.DATE
      },
      estadoExamenes: {
        type: DataTypes.INTEGER
      },
      // fecha actualización de examenes
      fechaExamenes: {
        type: DataTypes.DATE
      },
      estadoCalendario: {
        type: DataTypes.INTEGER
      },
      // fecha actualización de calendario
      fechaCalendario: {
        type: DataTypes.DATE
      },
      archivo: {
        type: DataTypes.JSONB
      },
      // uri donde se almacena el pdf al cerrar
      HistorialID: {
        type: DataTypes.STRING
      },
      // veo si estaba reabierta, solo se puede reabrir una vez y en tipo 'I'
      reabierto: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: false
    }
  );
  ProgramacionDocente.removeAttribute('id');
  return ProgramacionDocente;
};
