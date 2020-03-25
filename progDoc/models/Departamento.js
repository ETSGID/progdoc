// Definicion del modelo Departamento:

module.exports = function(sequelize, DataTypes) {
  const Departamento = sequelize.define(
    'Departamento',
    {
      codigo: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      nombre: {
        type: DataTypes.STRING,
        validate: { notEmpty: { msg: 'Falta nombre' } }
      },
      acronimo: {
        type: DataTypes.STRING(5)
      }
    },
    {
      timestamps: false
    }
  );
  Departamento.removeAttribute('id');
  return Departamento;
};
