// Definicion del modelo Grupo:

module.exports = function (sequelize, DataTypes) {
    let Grupo = sequelize.define('Grupo',
        {
            grupoId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            nombre: {
                type: DataTypes.STRING
            },
            capacidad: {
                type: DataTypes.INTEGER
            },
            curso: {
                type: DataTypes.INTEGER
            },
            aula: {
                type: DataTypes.STRING
            },
            idioma: {
                type: DataTypes.ENUM('ES', 'EN')   //español o ingles
            },
            nombreItinerario: {
                type: DataTypes.STRING   //en un principio los itinerarios se incluyen aquí en un futuro igual con la entidad itinerario
            }
        },
        {
            timestamps: false
        });
    Grupo.removeAttribute('id');
    return Grupo;
};
