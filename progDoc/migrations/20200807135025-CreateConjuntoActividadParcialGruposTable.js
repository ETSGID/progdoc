module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ConjuntoActividadParcialGrupos', {
      ConjuntoParcialId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'ConjuntoActividadParcials',
          key: 'identificador'
        }
      },
      GrupoId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'Grupos',
          key: 'grupoId'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('ConjuntoActividadParcialGrupos');
  }
};
