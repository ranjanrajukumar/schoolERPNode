import { DataTypes } from 'sequelize';

// One login at one school, as the school reported it: who it is, how it is reached and its password hash, all on one row. The school and
// role are references to their lookup tables. The school stays the source of truth for all of it.
export default (sequelize) => sequelize.define('Identity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  clientId: { type: DataTypes.INTEGER, allowNull: false }, // -> clients.id; deleting a school deletes its logins
  localUserId: { type: DataTypes.INTEGER, allowNull: false }, // the id of this login in that school's own users table
  roleId: { type: DataTypes.INTEGER, allowNull: false }, // -> roles.id
  mobile: { type: DataTypes.STRING(10), allowNull: true }, // the mobile number's last ten digits, whatever the country code or leading zero: what a sign-in by phone matches on
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  username: { type: DataTypes.STRING(60), allowNull: true }, // a student's admission number
  passwordHash: { type: DataTypes.STRING(100), allowNull: false }, // a bcrypt hash, as the school holds it; never a password
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'identities',
  indexes: [
    { unique: true, name: 'uq_identity_school_user', fields: ['client_id', 'local_user_id'] },
    { name: 'ix_identity_mobile', fields: ['mobile'] },
    { name: 'ix_identity_email', fields: ['email'] },
    { name: 'ix_identity_username', fields: ['username'] },
  ],
});
