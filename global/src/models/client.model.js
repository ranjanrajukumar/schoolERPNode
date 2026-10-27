import { DataTypes } from 'sequelize';

// One school (client) the mobile app can connect to: how it is found and named, and where its own server lives.
export default (sequelize) => sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true }, // short and typed by hand: "greenfield"
  name: { type: DataTypes.STRING(120), allowNull: false },
  city: { type: DataTypes.STRING(80), allowNull: true },
  state: { type: DataTypes.STRING(80), allowNull: true },
  logoUrl: { type: DataTypes.STRING(300), allowNull: true },
  apiUrl: { type: DataTypes.STRING(300), allowNull: false }, // the school's own API, for example https://erp.greenfield.edu/api
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  apiKeyHash: { type: DataTypes.STRING(64), allowNull: true }, // SHA-256 of the key the school's server uses to push its logins here; the key itself is shown once
  notes: { type: DataTypes.STRING(300), allowNull: true }, // for the people who run the registry; never sent to the app
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'clients', indexes: [{ name: 'ix_client_name', fields: ['name'] }] });
