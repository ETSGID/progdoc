
module.exports = function (sequelize, DataTypes) {
  const EventoGeneral = sequelize.define('EventoGeneral',
    {
      identificador: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      evento: {
        type: DataTypes.STRING,
      },
      color: {
        type: DataTypes.STRING,
      },
      fechaInicio: {
        type: DataTypes.DATEONLY,
      },
      fechaFin: {
        type: DataTypes.DATEONLY,
      },
      editable: {
        type: DataTypes.INTEGER,
      },

    },
    {
      timestamps: false,
    });
  EventoGeneral.removeAttribute('id');
  return EventoGeneral;
};
