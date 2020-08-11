module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ConjuntoActividadParcialGrupos', {
      ConjuntoParcialId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'ConjuntoActividadParcials',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      GrupoId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'Grupos',
          key: 'grupoId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('ConjuntoActividadParcialGrupos');
  }
};
