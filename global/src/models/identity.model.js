import { DataTypes } from 'sequelize';

// One login at one school, as the school reported it: who it is and how it is reached. The school, role and phone number are references,
// not copies, and the password hash lives in its own table (credentials). The school stays the source of truth for all of it.
export default (sequelize) => sequelize.define('Identity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  clientId: { type: DataTypes.INTEGER, allowNull: false }, // -> clients.id; deleting a school deletes its logins
  localUserId: { type: DataTypes.INTEGER, allowNull: false }, // the id of this login in that school's own users table
  roleId: { type: DataTypes.INTEGER, allowNull: false }, // -> roles.id
  mobileNumberId: { type: DataTypes.INTEGER, allowNull: true }, // -> mobile_numbers.id; many logins may share a phone
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  username: { type: DataTypes.STRING(60), allowNull: true }, // a student's admission number
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'identities',
  indexes: [
    { unique: true, name: 'uq_identity_school_user', fields: ['client_id', 'local_user_id'] },
    { name: 'ix_identity_email', fields: ['email'] },
    { name: 'ix_identity_username', fields: ['username'] },
  ],
});
