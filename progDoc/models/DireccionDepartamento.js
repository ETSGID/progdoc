// Definicion del modelo DireccionDepartamento:

module.exports = function (sequelize, DataTypes) {
    let DireccionDepartamento = sequelize.define('DireccionDepartamento',
        {
            Departamento: {
                type: DataTypes.STRING,
                primaryKey: true,
                validate: { notEmpty: { msg: "Falta Código Departamento" } }
            },

        },
        {
            timestamps: false
        });
    return DireccionDepartamento;
};