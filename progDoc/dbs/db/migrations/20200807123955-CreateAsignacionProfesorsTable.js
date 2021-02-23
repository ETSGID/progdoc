module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AsignacionProfesors', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      Dia: {
        type: Sequelize.ENUM('L', 'M', 'X', 'J', 'V', 'S', 'D')
      },
      HoraInicio: {
        type: Sequelize.TIME
      },
      Duracion: {
        type: Sequelize.FLOAT
      },
      Nota: {
        type: Sequelize.TEXT
      },
      ProfesorId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      AsignaturaId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Asignaturas',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      GrupoId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Grupos',
          key: 'grupoId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: async queryInterface => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('AsignacionProfesors', { transaction: t });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_AsignacionProfesors_Dia";',
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
