import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('HostelRoom', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  hostelId: { type: DataTypes.INTEGER, allowNull: false },
  roomNo: { type: DataTypes.STRING(20), allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  monthlyFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
}, { tableName: 'hostel_rooms',
  indexes: [{ unique: true, name: 'uq_hostel_room', fields: ['hostel_id', 'room_no'] }] });
