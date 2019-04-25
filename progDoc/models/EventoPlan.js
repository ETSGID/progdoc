

module.exports = function (sequelize, DataTypes) {
    let EventoPlan = sequelize.define('EventoPlan',
        {
            identificador: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            evento: {
                type: DataTypes.STRING
            },
            color: {
                type: DataTypes.STRING
            },
            fechaInicio: {
                type: DataTypes.DATEONLY
            },
            fechaFin: {
                type: DataTypes.DATEONLY
            }

        },
        {
            timestamps: false
        });
    EventoPlan.removeAttribute('id');
    return EventoPlan;
};
