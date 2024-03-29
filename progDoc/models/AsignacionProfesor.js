// Definicion del modelo AsignacionProfesor:

module.exports = (sequelize, DataTypes) => {
  const AsignacionProfesor = sequelize.define(
    'AsignacionProfesor',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      Dia: {
        type: DataTypes.ENUM('L', 'M', 'X', 'J', 'V', 'S', 'D')
      },
      HoraInicio: {
        type: DataTypes.TIME
      },
      Duracion: {
        type: DataTypes.FLOAT
      },
      Nota: {
        type: DataTypes.TEXT
      }
    },
    {
      timestamps: false
    }
  );
  return AsignacionProfesor;
};
