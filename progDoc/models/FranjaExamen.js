// Definicion del modelo FranjaExamen:
const enumsPD = require('../enumsPD');

module.exports = function(sequelize, DataTypes) {
  const FranjaExamen = sequelize.define(
    'FranjaExamen',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      // si no hay fecha signfica que es una franja horaria
      horaInicio: {
        type: DataTypes.TIME
      },
      duracion: {
        type: DataTypes.FLOAT
      },
      curso: {
        type: DataTypes.NUMERIC()
      },
      // los periodos pueden ser ordinario o extraordinario y se separan tambien por semestre
      periodo: {
        type: DataTypes.ENUM(
          enumsPD.periodoPD.S1_O,
          enumsPD.periodoPD.S1_E,
          enumsPD.periodoPD.S2_O,
          enumsPD.periodoPD.S2_E
        )
      }
    },
    {
      timestamps: false
    }
  );
  FranjaExamen.removeAttribute('id');
  return FranjaExamen;
};
