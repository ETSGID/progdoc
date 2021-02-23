const { UniqueConstraintError } = require('sequelize');

module.exports = {
  up: async queryInterface => {
    try {
      await queryInterface.bulkInsert('Departamentos', [
        {
          codigo: 'TFG',
          nombre: 'Trabajo de fin de Grado',
          acronimo: 'TFG'
        },
        {
          codigo: 'TFM',
          nombre: 'Trabajo de fin de Máster',
          acronimo: 'TFM'
        }
      ]);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        console.warn('Los departamentos ya existen');
      } else {
        console.error(error);
      }
    }
  },
  down: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize;
    try {
      await queryInterface.bulkDelete(
        'Departamentos',
        { codigo: { [Op.in]: ['TFG', 'TFM'] } },
        {}
      );
    } catch (error) {
      console.error(error);
    }
  }
};
