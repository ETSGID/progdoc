module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.createTable('PlanEstudios', {
      codigo: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING
      },
      nombreCompleto: {
        type: Sequelize.STRING
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('PlanEstudios');
  }
};
