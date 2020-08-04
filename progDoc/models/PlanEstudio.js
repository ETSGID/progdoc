// Definicion del modelo PlanEstudio:

module.exports = (sequelize, DataTypes) => {
  const PlanEstudio = sequelize.define(
    'PlanEstudio',
    {
      codigo: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      nombre: {
        type: DataTypes.STRING
      },
      nombreCompleto: {
        type: DataTypes.STRING
      }
    },
    {
      timestamps: false
    }
  );
  PlanEstudio.removeAttribute('id');
  return PlanEstudio;
};
