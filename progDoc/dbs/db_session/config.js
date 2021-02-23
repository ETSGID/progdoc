const config = {
  username: process.env.DBSESSION_USERNAME || 'progdoc',
  password: process.env.DBSESSION_PASSWORD || 'progdoc',
  database: process.env.POSTGRESSESION_DB || 'progdocsession',
  host:
    process.env.DOCKER === 'true' ? 'dbsession' : process.env.DB_HOST || 'db',
  dialect: 'postgres'
};

module.exports = {
  development: config,
  test: config,
  production: config,
  config
};
