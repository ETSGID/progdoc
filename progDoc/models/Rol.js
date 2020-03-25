// Definicion del modelo Rol:

module.exports = function(sequelize, DataTypes) {
  const Rol = sequelize.define(
    'Rol',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      rol: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      timestamps: false
    }
  );
  Rol.removeAttribute('id');
  return Rol;
};
