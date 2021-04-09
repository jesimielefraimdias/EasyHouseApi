// Update with your config settings.

module.exports = {
  localSql: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      database: 'easyhouse',
      user: 'root',
      password: ''
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: `${__dirname}/src/database/seeds`,
    }
  }
};
