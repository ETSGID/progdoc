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
        }
      },
      AsignaturaId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Asignaturas',
          key: 'identificador'
        }
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('ActividadParcials');
  }
};
