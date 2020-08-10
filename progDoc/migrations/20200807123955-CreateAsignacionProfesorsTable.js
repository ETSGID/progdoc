module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AsignacionProfesors', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      Dia: {
        type: Sequelize.ENUM('L', 'M', 'X', 'J', 'V', 'S', 'D')
      },
      HoraInicio: {
        type: Sequelize.TIME
      },
      Duracion: {
        type: Sequelize.FLOAT
      },
      Nota: {
        type: Sequelize.TEXT
      },
      ProfesorId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        }
      },
      AsignaturaId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Asignaturas',
          key: 'identificador'
        }
      },
      GrupoId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Grupos',
          key: 'grupoId'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('AsignacionProfesors');
  }
};
