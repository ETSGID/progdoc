const enumsPD = require('../../../enumsPD');

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Examens', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      // si no hay fecha signfica que es una franja horaria
      fecha: {
        type: Sequelize.DATEONLY
      },
      horaInicio: {
        type: Sequelize.TIME
      },
      duracion: {
        type: Sequelize.FLOAT
      },
      aulas: {
        type: Sequelize.ARRAY(Sequelize.STRING)
      },
      // los periodos pueden ser ordinario o extraordinario y se separan tambien por semestre
      // lo único que igual hay que llamar a la clave como
      // la pd + el enum del tipo de periodo para no tener que cambiar muchas cosas
      periodo: {
        type: Sequelize.ENUM(
          enumsPD.periodoPD.S1_O,
          enumsPD.periodoPD.S1_E,
          enumsPD.periodoPD.S2_O,
          enumsPD.periodoPD.S2_E
        )
      },
      AsignaturaIdentificador: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Asignaturas',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: async queryInterface => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('Examens', { transaction: t });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Examens_periodo";',
        { transaction: t }
      );
      await t.commit();
    } catch (error) {
      console.error(error);
      await t.rollback();
      throw error;
    }
  }
};
