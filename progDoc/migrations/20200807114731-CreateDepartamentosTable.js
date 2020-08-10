module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Departamentos', {
      codigo: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING
      },
      acronimo: {
        type: Sequelize.STRING(5)
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Departamentos');
  }
};
