const { rols } = require('../../../enumsPD');

module.exports = {
  up: async queryInterface => {
    queryInterface.sequelize.query(
      `UPDATE "Rols" SET rol = '${rols.Admin}' WHERE rol = 'SubdirectorPosgrado';`
    );
  },

  down: async queryInterface => {
    queryInterface.sequelize.query(
      `UPDATE "Rols" SET rol = 'SubdirectorPosgrado' WHERE rol = '${rols.Admin}';`
    );
  }
};
