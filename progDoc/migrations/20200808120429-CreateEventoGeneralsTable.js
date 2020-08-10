module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('EventoGenerals', {
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
      editable: {
        type: Sequelize.INTEGER
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('EventoGenerals');
  }
};
