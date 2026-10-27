import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('UserGroupMember', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  groupId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'user_group_members',
  indexes: [{ unique: true, name: 'uq_group_member', fields: ['group_id', 'user_id'] }],
});
