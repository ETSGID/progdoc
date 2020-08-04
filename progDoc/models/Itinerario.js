// Definicion del modelo Itinerario:

module.exports = (sequelize, DataTypes) => {
  const Itinerario = sequelize.define(
    'Itinerario',
    {
      identificador: {
        // ejemplo de nombre itineario GITST_Electrónica
        // (PLAN_Itinerario) para garantizar que es único
        type: DataTypes.STRING,
        primaryKey: true
      }
    },
    {
      timestamps: false
    }
  );
  Itinerario.removeAttribute('id');
  return Itinerario;
};
