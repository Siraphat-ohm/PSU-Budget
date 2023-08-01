const knex = require("knex");

const db = knex.default({
    client : 'mysql2',
    connection : {
        user: process.env.USER_DB,
        password: process.env.PASSWORD_DB,
        host: process.env.HOST_DB,
        port: process.env.PORT_DB,
        database:"budget_psu_2"
    }
});

module.exports = db;