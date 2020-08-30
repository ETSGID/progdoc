const enumTipoGrupo = require('../enumsPD').tipoGrupo;

// update grupo table to add tipo and semestre
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'Grupos',
        'semestre',
        Sequelize.ENUM('1S', '2S', '1S-2S', 'A', 'I'),
        { transaction: t }
      );
      await queryInterface.addColumn('Grupos', 'tipo', Sequelize.INTEGER, {
        transaction: t
      });

      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET semestre = '1S' WHERE nombre LIKE '%.1';`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET semestre = '2S' WHERE nombre LIKE '%.2';`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET semestre = 'I' WHERE semestre IS NULL;`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET tipo = ${enumTipoGrupo.Optativa} WHERE nombre LIKE '%Optativa%';`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET tipo = ${enumTipoGrupo.General} WHERE tipo IS NULL`,
        { transaction: t }
      );
      await t.commit();
    } catch (error) {
      console.error(error);
      await t.rollback();
      throw error;
    }
  },
  down: async queryInterface => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('Grupos', 'tipo', { transaction: t });
      await queryInterface.removeColumn('Grupos', 'semestre', {
        transaction: t
      });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Grupos_semestre";',
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
