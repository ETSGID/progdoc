module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ActividadParcials', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      horaInicio: {
        type: Sequelize.TIME
      },
      duracion: {
        type: Sequelize.FLOAT
      },
      descripcion: {
        type: Sequelize.TEXT
      },
      fecha: {
        type: Sequelize.DATEONLY
      },
      tipo: {
        type: Sequelize.ENUM('act', 'eval', 'otro') // tres tipos act: actividad; eval:evaluacion; otr: otro
      },
      ConjuntoActividadParcialId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'ConjuntoActividadParcials',
          key: 'identificador'
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
      }
    });
  },

  down: async queryInterface => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('ActividadParcials', { transaction: t });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_ActividadParcials_tipo";',
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
