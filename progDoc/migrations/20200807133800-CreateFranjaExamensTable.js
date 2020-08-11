const enumsPD = require('../enumsPD');

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FranjaExamens', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      // si no hay fecha signfica que es una franja horaria
      horaInicio: {
        type: Sequelize.TIME
      },
      duracion: {
        type: Sequelize.FLOAT
      },
      curso: {
        type: Sequelize.NUMERIC()
      },
      // los periodos pueden ser ordinario o extraordinario y se separan tambien por semestre
      periodo: {
        type: Sequelize.ENUM(
          enumsPD.periodoPD.S1_O,
          enumsPD.periodoPD.S1_E,
          enumsPD.periodoPD.S2_O,
          enumsPD.periodoPD.S2_E
        )
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
    return queryInterface.dropTable('FranjaExamens');
  }
};
