const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_SERVER,
    dialect: "mssql",
    logging: false,
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: true,
<<<<<<< HEAD
        useUTC: false,
        dateFirst: 1,
        enableArithAbort: true,
      },
    },
    timezone: "+00:00",
  }
);

module.exports = sequelize;
=======
      },
    },
  }
);

module.exports = sequelize;
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
