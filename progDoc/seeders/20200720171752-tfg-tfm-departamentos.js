module.exports = {
  up: async (queryInterface, Sequelize) => {
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
      console.error(error);
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
