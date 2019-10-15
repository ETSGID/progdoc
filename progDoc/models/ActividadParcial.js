// Definicion del modelo ActividadParcial:

module.exports = function (sequelize, DataTypes) {
    let ActividadParcial = sequelize.define('ActividadParcial',
        {
            identificador: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            horaInicio: {
                type: DataTypes.TIME
            },
            duracion: {
                type: DataTypes.FLOAT
            },
            descripcion: {
                type: DataTypes.TEXT
            },
            fecha: {
                type: DataTypes.DATEONLY
            },
            tipo: {
                type: DataTypes.ENUM('act', 'eval', 'otro'), //tres tipos act: actividad; eval:evaluacion; otr: otro 
                validate: { notEmpty: { msg: "Falta tipo" } }
            },
        },
        {
            timestamps: false
        });
    ActividadParcial.removeAttribute('id');
    return ActividadParcial;
};