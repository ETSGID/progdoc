// updates due to add aulas table
module.exports = {
  up: async queryInterface => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('Examens', 'aulas', { transaction: t });
      // modify names of aulas
      // not down because doesn't change squeleton only data
      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET aula = REPLACE(aula, '-', '') WHERE aula IS NOT NULL;`,
        { transaction: t }
      );
      // delete aulas without name
      await queryInterface.sequelize.query(
        `UPDATE "Grupos" SET aula = null WHERE aula = '';`,
        { transaction: t }
      );
      // insert to aulas table
      await queryInterface.sequelize.query(
        `INSERT INTO "Aulas" (identificador)
        SELECT DISTINCT(aula) FROM "Grupos"
        WHERE aula IS NOT NULL;`,
        { transaction: t }
      );
      // crate foreign key in table grupos
      await queryInterface.addConstraint('Grupos', {
        fields: ['aula'],
        type: 'FOREIGN KEY',
        name: 'Grupos_aula_fkey',
        references: {
          table: 'Aulas',
          field: 'identificador'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        transaction: t
      });
      await t.commit();
    } catch (error) {
      console.error(error);
      await t.rollback();
      throw error;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint('Grupos', 'Grupos_aula_fkey', {
        transaction: t
      });
      await queryInterface.bulkDelete('Aulas', {}, { transaction: t });
      await queryInterface.addColumn(
        'Examens',
        'aulas',
        Sequelize.ARRAY(Sequelize.STRING),
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
