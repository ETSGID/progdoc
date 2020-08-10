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
        }
      },
      CoordinadorAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        }
      },
      ProgramacionDocenteIdentificador: {
        type: Sequelize.STRING,
        references: {
          model: 'ProgramacionDocentes',
          key: 'identificador'
        }
      },
      ItinerarioIdentificador: {
        type: Sequelize.STRING,
        references: {
          model: 'Itinerarios',
          key: 'identificador'
        }
      },
      PresidenteTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        }
      },
      VocalTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        }
      },
      SecretarioTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        }
      },
      SuplenteTribunalAsignatura: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Profesors',
          key: 'ProfesorId'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Asignaturas');
  }
};
