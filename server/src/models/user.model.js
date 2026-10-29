import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      roleId: { type: DataTypes.INTEGER, allowNull: true }, // custom role, when the login has one; `role` is then its base role
      staffId: { type: DataTypes.INTEGER, allowNull: true }, // the staff member this login belongs to, so a class teacher lands on their own class
      mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // a temporary password: the next sign-in must replace it
      role: {
        type: DataTypes.ENUM('admin', 'teacher', 'accountant', 'parent', 'student'),
        allowNull: false,
        defaultValue: 'admin',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
    },
  );
