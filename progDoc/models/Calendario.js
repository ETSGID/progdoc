

module.exports = function (sequelize, DataTypes) {
    let Calendario = sequelize.define('Calendario',
        {
            identificador: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            ano: {
                type: DataTypes.INTEGER
            },
            estado: {
                type: DataTypes.INTEGER
            }

        },
        {
            timestamps: false
        });
    Calendario.removeAttribute('id');
    return Calendario;
};
