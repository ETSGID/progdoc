module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Itinerarios', {
      identificador: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      PlanEstudioCodigo: {
        type: Sequelize.STRING,
        references: {
          model: 'PlanEstudios',
          key: 'codigo'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Itinerarios');
  }
};
