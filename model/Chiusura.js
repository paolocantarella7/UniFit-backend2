let { DataTypes } = require("sequelize");
let singleton = require("../singleton/singleton");

let Chiusura = singleton.define("chiusura", {
  idChiusura: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  dataChiusura: {
    type: DataTypes.STRING,
    allowNull: false,
  }
});

module.exports = Chiusura;
