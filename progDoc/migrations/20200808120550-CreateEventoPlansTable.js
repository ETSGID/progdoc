module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('EventoPlans', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      evento: {
        type: Sequelize.STRING
      },
      color: {
        type: Sequelize.STRING
      },
      fechaInicio: {
        type: Sequelize.DATEONLY
      },
      fechaFin: {
        type: Sequelize.DATEONLY
      },
      PlanEstudioId: {
        type: Sequelize.STRING,
        references: {
          model: 'PlanEstudios',
          key: 'codigo'
        }
      },
      EventoGeneralId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'EventoGenerals',
          key: 'identificador'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('EventoPlans');
  }
};
