module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProgramacionDocentes', {
      identificador: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      version: {
        type: Sequelize.INTEGER
      },
      anoAcademico: {
        type: Sequelize.STRING
      },
      semestre: {
        type: Sequelize.ENUM('1S', '2S', 'I')
      },
      estadoProGDoc: {
        type: Sequelize.INTEGER
      },
      fechaProgDoc: {
        type: Sequelize.DATE
      },
      // estado actualización de las actividades parciales
      estadoGrupos: {
        type: Sequelize.INTEGER
      },
      // fecha actualización de las actividades parciales
      fechaGrupos: {
        type: Sequelize.DATE
      },
      estadoProfesores: {
        type: Sequelize.JSONB
      },
      // fecha actualización de profesores
      fechaProfesores: {
        type: Sequelize.DATE
      },
      estadoTribunales: {
        type: Sequelize.JSONB
      },
      // fecha actualización de tribunales
      fechaTribunales: {
        type: Sequelize.DATE
      },
      estadoHorarios: {
        type: Sequelize.INTEGER
      },
      // fecha actualización de horarios
      fechaHorarios: {
        type: Sequelize.DATE
      },
      estadoExamenes: {
        type: Sequelize.INTEGER
      },
      // fecha actualización de examenes
      fechaExamenes: {
        type: Sequelize.DATE
      },
      // calenadario de actividades
      estadoCalendario: {
        type: Sequelize.INTEGER
      },
      // fecha actualización de calendario de actividades
      fechaCalendario: {
        type: Sequelize.DATE
      },
      archivo: {
        type: Sequelize.JSONB
      },
      // uri donde se almacena el pdf al cerrar
      HistorialID: {
        type: Sequelize.STRING
      },
      // veo si estaba reabierta, solo se puede reabrir una vez y en tipo 'I'
      reabierto: {
        type: Sequelize.INTEGER
      },
      PlanEstudioId: {
        type: Sequelize.STRING,
        references: {
          model: 'PlanEstudios',
          key: 'codigo'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('ProgramacionDocentes');
  }
};
