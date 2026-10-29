import { DataTypes } from 'sequelize';

// One tile or page of the mobile app's menu. What it says, which icon it shows (an Ionicons name, or an uploaded picture kept here as
// base64 so it travels with backups), where it sits, who may see it, and whether it is shown. What a page does lives in the app.
export default (sequelize) =>
  sequelize.define(
    'AppMenuItem',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      audience: { type: DataTypes.STRING(10), allowNull: false }, // staff or family
      key: { type: DataTypes.STRING(60), allowNull: false }, // matches a page in the app: "fees", "fees.payments", "q.myclass"
      parentKey: { type: DataTypes.STRING(60), allowNull: true }, // a page sits under its module
      kind: { type: DataTypes.STRING(12), allowNull: false },
      label: { type: DataTypes.STRING(80), allowNull: false },
      icon: { type: DataTypes.STRING(60), allowNull: false },
      iconImage: { type: DataTypes.TEXT('long'), allowNull: true },
      iconMime: { type: DataTypes.STRING(30), allowNull: true },
      roles: { type: DataTypes.STRING(120), allowNull: true }, // comma-separated; empty means the parent's roles, or everyone
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'app_menu_items',
      indexes: [{ unique: true, name: 'uq_app_menu_key', fields: ['audience', 'key'] }],
    },
  );
