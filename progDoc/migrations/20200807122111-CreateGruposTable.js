module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Grupos', {
      grupoId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nombre: {
        type: Sequelize.STRING
      },
      capacidad: {
        type: Sequelize.INTEGER
      },
      curso: {
        type: Sequelize.INTEGER
      },
      aula: {
        type: Sequelize.STRING
      },
      idioma: {
        type: Sequelize.ENUM('ES', 'EN') // español o ingles
      },
      nombreItinerario: {
        // en un principio los itinerarios se
        // incluyen aquí en un futuro igual con la entidad itinerario
        type: Sequelize.STRING
      },
      ProgramacionDocenteId: {
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
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('Grupos');
  }
};
