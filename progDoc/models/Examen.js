// Definicion del modelo Examen:
const enumsPD = require('../enumsPD');

module.exports = function (sequelize, DataTypes) {
  const Examen = sequelize.define('Examen',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // si no hay fecha signfica que es una franja horaria
      fecha: {
        type: DataTypes.DATEONLY,
      },
      horaInicio: {
        type: DataTypes.TIME,
      },
      duracion: {
        type: DataTypes.FLOAT,
      },
      aulas: {
        type: DataTypes.ARRAY(DataTypes.STRING),
      },
      // los periodos pueden ser ordinario o extraordinario y se separan tambien por semestre
      // TODO cuando se defina el calendario se podrá acotar,
      // lo único que igual hay que llamar a la clave como
      // la pd + el enum del tipo de periodo para no tener que cambiar muchas cosas
      periodo: {
        type: DataTypes.ENUM(
          enumsPD.periodoPD.S1_O,
          enumsPD.periodoPD.S1_E,
          enumsPD.periodoPD.S2_O,
          enumsPD.periodoPD.S2_E,
        ),
        validate: { notEmpty: { msg: 'Falta periodo' } },
      },

    },
    {
      timestamps: false,
    });
  Examen.removeAttribute('id');
  return Examen;
};
