module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
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
  });
  return Session;
};
