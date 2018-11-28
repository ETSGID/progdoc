// Definicion del modelo Itinerario:

module.exports = function (sequelize, DataTypes) {
    let Itinerario = sequelize.define('Itinerario',
        {
            identificador: {
                type: DataTypes.STRING, //ejemplo de nombre itineario GITST_Electrónica (PLAN_Itinerario) para garantizar que es único
                primaryKey: true
            }
        },
        {
            timestamps: false
        });
    Itinerario.removeAttribute('id');
    return Itinerario;
};