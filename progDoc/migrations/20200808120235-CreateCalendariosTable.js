module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Calendarios', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ano: {
        type: Sequelize.INTEGER
      },
      estado: {
        type: Sequelize.INTEGER
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Calendarios');
  }
};
