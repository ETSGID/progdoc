module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Aulas', {
      identificador: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      cupo: {
        type: Sequelize.INTEGER
      }
    });
  },
  down: queryInterface => {
    return queryInterface.dropTable('Aulas');
  }
};
