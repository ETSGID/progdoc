// Definicion del modelo ConjuntoActividadParcialGrupo:

module.exports = function (sequelize, DataTypes) {
    let ConjuntoActividadParcialGrupo = sequelize.define('ConjuntoActividadParcialGrupo',
        {},
        {
            timestamps: false
        });
    return ConjuntoActividadParcialGrupo;
};