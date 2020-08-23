module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Asignaturas', {
      identificador: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      anoAcademico: {
        type: Sequelize.STRING
      },
      codigo: {
        type: Sequelize.STRING
      },

      nombre: {
        type: Sequelize.STRING
      },
      nombreIngles: {
        type: Sequelize.STRING
      },
      acronimo: {
        type: Sequelize.STRING(5)
      },
      curso: {
        type: Sequelize.NUMERIC()
      },
      semestre: {
        type: Sequelize.ENUM('1S', '2S', '1S-2S', 'A', 'I')
      },
      // para diferenciar si guardarla como grupo comun (N)
      // o por grupo individual (S) en la asignacion de profesores
      estado: {
        type: Sequelize.ENUM('S', 'N')
      },
      tipo: {
        type: Sequelize.ENUM('bas', 'obl', 'opt', 'obl-itn', 'opt-itn')
      },
      creditos: {
        type: Sequelize.NUMERIC
      },
      cupo: {
        type: Sequelize.FLOAT()
      },
      FechaInicio: {
        type: Sequelize.DATEONLY
      },
      FechaFin: {
        type: Sequelize.DATEONLY
      },
      DepartamentoResponsable: {
        type: Sequelize.STRING,
        references: {
          model: 'Departamentos',
          key: 'codigo'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      CoordinadorAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ProgramacionDocenteIdentificador: {
        type: Sequelize.STRING,
        references: {
          model: 'ProgramacionDocentes',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ItinerarioIdentificador: {
        type: Sequelize.STRING,
        references: {
          model: 'Itinerarios',
          key: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      PresidenteTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      VocalTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      SecretarioTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      SuplenteTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: async queryInterface => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('Asignaturas', { transaction: t });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Asignaturas_semestre";',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Asignaturas_estado";',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Asignaturas_tipo";',
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
