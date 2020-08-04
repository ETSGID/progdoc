// Definicion del modelo Asignatura:

module.exports = (sequelize, DataTypes) => {
  const Asignatura = sequelize.define(
    'Asignatura',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      anoAcademico: {
        type: DataTypes.STRING,
        validate: { notEmpty: { msg: 'Falta año académico' } }
      },
      codigo: {
        type: DataTypes.STRING,
        validate: { notEmpty: { msg: 'Falta código' } }
      },

      nombre: {
        type: DataTypes.STRING,
        validate: { notEmpty: { msg: 'Falta nombre asignatura español' } }
      },
      nombreIngles: {
        type: DataTypes.STRING,
        validate: { notEmpty: { msg: 'Falta nombre asignatura ingles' } }
      },
      acronimo: {
        type: DataTypes.STRING(5)
      },
      curso: {
        type: DataTypes.NUMERIC(),
        validate: { notEmpty: { msg: 'Falta curso' } }
      },
      semestre: {
        type: DataTypes.ENUM('1S', '2S', '1S-2S', 'A', 'I'),
        validate: { notEmpty: { msg: 'Falta semestre' } }
      },
      // para diferenciar si guardarla como grupo comun (N)
      // o por grupo individual (S) en la asignacion de profesores
      estado: {
        type: DataTypes.ENUM('S', 'N'),
        validate: { notEmpty: { msg: 'Falta estado' } }
      },
      tipo: {
        type: DataTypes.ENUM('bas', 'obl', 'opt', 'obl-itn', 'opt-itn'), // duda
        validate: { notEmpty: { msg: 'Falta tipo' } }
      },
      creditos: {
        type: DataTypes.NUMERIC,
        validate: { notEmpty: { msg: 'Falta créditos' } }
      },
      cupo: {
        type: DataTypes.FLOAT()
      },
      FechaInicio: {
        type: DataTypes.DATEONLY
      },
      FechaFin: {
        type: DataTypes.DATEONLY
      }
    },
    {
      timestamps: false
    }
  );
  Asignatura.removeAttribute('id');
  return Asignatura;
};
