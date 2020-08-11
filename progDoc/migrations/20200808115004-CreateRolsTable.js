module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Rols', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      rol: {
        type: Sequelize.STRING,
        allowNull: false
      },
      PlanEstudioCodigo: {
        type: Sequelize.STRING,
        references: {
          model: 'PlanEstudios',
          key: 'codigo'
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
      },
      PersonaId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Personas',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Rols');
  }
};
