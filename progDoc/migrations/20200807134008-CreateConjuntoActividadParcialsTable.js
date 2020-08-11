module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ConjuntoActividadParcials', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      notaInicial: {
        type: Sequelize.TEXT
      },
      semestre: {
        type: Sequelize.ENUM('1S', '2S', '1S-2S', 'A', 'I')
      },
      curso: {
        type: Sequelize.NUMERIC()
      },
      // dia inicio
      fechaInicio: {
        type: Sequelize.DATEONLY
      },
      // dia fin
      fechaFin: {
        type: Sequelize.DATEONLY
      },
      ProgramacionDocenteId: {
        type: Sequelize.STRING,
        references: {
          model: 'ProgramacionDocentes',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('ConjuntoActividadParcials');
  }
};
