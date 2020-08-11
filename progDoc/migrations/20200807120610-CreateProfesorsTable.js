module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Profesors', {
      ProfesorId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'Personas',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      DepartamentoCodigo: {
        type: Sequelize.STRING,
        references: {
          model: 'Departamentos',
          key: 'codigo'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Profesors');
  }
};
