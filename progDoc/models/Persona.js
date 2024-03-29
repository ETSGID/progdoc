// Definicion del modelo Persona:

module.exports = (sequelize, DataTypes) => {
  const Persona = sequelize.define(
    'Persona',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      nombre: {
        type: DataTypes.STRING
      },
      apellido: {
        type: DataTypes.STRING
      }
    },
    {
      timestamps: false
    }
  );
  Persona.removeAttribute('id');
  return Persona;
};
