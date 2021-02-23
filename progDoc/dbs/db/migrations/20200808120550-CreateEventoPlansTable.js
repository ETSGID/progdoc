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
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      EventoGeneralId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'EventoGenerals',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('EventoPlans');
  }
};
