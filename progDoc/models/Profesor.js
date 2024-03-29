// Definicion del modelo Profesor:

module.exports = (sequelize, DataTypes) => {
  const Profesor = sequelize.define(
    'Profesor',
    {
      ProfesorId: {
        type: DataTypes.INTEGER,
        primaryKey: true
      }
    },
    {
      timestamps: false
    }
  );
  Profesor.removeAttribute('id');
  return Profesor;
};
