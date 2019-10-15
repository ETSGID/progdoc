module.exports = function (sequelize, DataTypes) {
    let Session = sequelize.define('Session',
        {

            sid: {
                type: DataTypes.STRING,
                allowNull: false,
                primaryKey: true,
                unique: true
            },
            expires: {
                type: DataTypes.DATE
            },
            ticket: {
                type: DataTypes.STRING
            },
            data: {
                type: DataTypes.JSONB
            }
        }
    );
    return Session;
};