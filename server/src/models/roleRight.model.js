import { DataTypes } from 'sequelize';

// What one role may do inside one module (a sidebar group). A module with no row keeps the built-in behaviour, so nothing changes until an
// admin edits a row on the Role Rights page. The menu itself (which modules and pages a role sees) lives in app_menu_items.
const flag = () => ({ type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });

export default (sequelize) =>
  sequelize.define(
    'RoleRight',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      role: { type: DataTypes.STRING(20), allowNull: false }, // admin, teacher, accountant, parent, student
      module: { type: DataTypes.STRING(60), allowNull: false }, // a module key from access.js, equal to the sidebar group slug
      canView: flag(),
      canCreate: flag(),
      canEdit: flag(),
      canDelete: flag(),
      canApprove: flag(),
      canExport: flag(),
    },
    {
      tableName: 'role_rights',
      indexes: [{ unique: true, name: 'uq_role_right', fields: ['role', 'module'] }],
    },
  );
