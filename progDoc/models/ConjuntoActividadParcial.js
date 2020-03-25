// Definicion del modelo ConjuntoActividadParcial:

module.exports = function(sequelize, DataTypes) {
  const ConjuntoActividadParcial = sequelize.define(
    'ConjuntoActividadParcial',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      notaInicial: {
        type: DataTypes.TEXT
      },
      semestre: {
        type: DataTypes.ENUM('1S', '2S', '1S-2S', 'A', 'I'),
        validate: { notEmpty: { msg: 'Falta semestre' } }
      },
      curso: {
        type: DataTypes.NUMERIC(),
        validate: { notEmpty: { msg: 'Falta curso' } }
      },
      // dia inicio
      fechaInicio: {
        type: DataTypes.DATEONLY
      },
      // dia fin
      fechaFin: {
        type: DataTypes.DATEONLY
      }
    },
    {
      timestamps: false
    }
  );
  return ConjuntoActividadParcial;
};
