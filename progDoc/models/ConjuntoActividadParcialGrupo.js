// Definicion del modelo ConjuntoActividadParcialGrupo:

// eslint-disable-next-line no-unused-vars
module.exports = (sequelize, DataTypes) => {
  const ConjuntoActividadParcialGrupo = sequelize.define(
    'ConjuntoActividadParcialGrupo',
    {},
    {
      timestamps: false
    }
  );
  return ConjuntoActividadParcialGrupo;
};
