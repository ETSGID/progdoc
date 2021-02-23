const config = {
  username: process.env.DB_USERNAME || 'progdoc',
  password: process.env.DB_PASSWORD || 'progdoc',
  database: process.env.POSTGRES_DB || 'progdoc',
  host: process.env.DB_HOST || 'db',
  dialect: 'postgres'
};

module.exports = {
  development: config,
  test: config,
  production: config,
  config
};
