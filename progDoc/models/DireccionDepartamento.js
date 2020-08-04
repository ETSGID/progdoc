// Definicion del modelo DireccionDepartamento:

module.exports = (sequelize, DataTypes) => {
  const DireccionDepartamento = sequelize.define(
    'DireccionDepartamento',
    {
      Departamento: {
        type: DataTypes.STRING,
        primaryKey: true,
        validate: { notEmpty: { msg: 'Falta Código Departamento' } }
      }
    },
    {
      timestamps: false
    }
  );
  return DireccionDepartamento;
};
