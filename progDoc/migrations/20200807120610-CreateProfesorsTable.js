module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Profesors', {
      ProfesorId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'Personas',
          key: 'identificador'
        }
      },
      DepartamentoCodigo: {
        type: Sequelize.STRING,
        references: {
          model: 'Departamentos',
          key: 'codigo'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Profesors');
  }
};
