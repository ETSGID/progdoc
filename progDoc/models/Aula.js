// Definicion del modelo Aula:

module.exports = (sequelize, DataTypes) => {
  const Aula = sequelize.define(
    'Aula',
    {
      identificador: {
        type: DataTypes.STRING,
        primaryKey: true,
        autoIncrement: true
      },
      cupo: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: false
    }
  );
  Aula.removeAttribute('id');
  return Aula;
};
