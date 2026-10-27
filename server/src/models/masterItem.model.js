import { DataTypes } from 'sequelize';

/**
 * One option in a master list (religion, state, relation...). Forms offer these as dropdowns; records keep the chosen text,
 * so renaming or removing an option never changes records that already use it.
 */
export default (sequelize) => sequelize.define('MasterItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.STRING(30), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // for the document lists: must be uploaded before the process can finish
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'master_items',
  indexes: [{ unique: true, name: 'uq_master_item', fields: ['type', 'name'] }],
});
