import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      userName: { type: DataTypes.STRING(100), allowNull: true },
      role: { type: DataTypes.STRING(20), allowNull: true },
      method: { type: DataTypes.STRING(8), allowNull: false },
      resource: { type: DataTypes.STRING(60), allowNull: false },
      path: { type: DataTypes.STRING(255), allowNull: false },
      status: { type: DataTypes.INTEGER, allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'audit_logs',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
      indexes: [
        { name: 'idx_audit_created', fields: ['created_at'] },
        { name: 'idx_audit_resource', fields: ['resource'] },
      ],
    },
  );
