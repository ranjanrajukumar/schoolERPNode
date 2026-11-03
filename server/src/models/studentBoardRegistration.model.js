import { DataTypes } from 'sequelize';

/**
 * A student's registration with the board their class follows: the number the board issued, and where it stands.
 * The board is always that of the student's class when the record is saved, so a student cannot be registered with a
 * board their class does not follow.
 */
export default (sequelize) =>
  sequelize.define(
    'StudentBoardRegistration',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      boardId: { type: DataTypes.INTEGER, allowNull: false },
      registrationNo: { type: DataTypes.STRING(40), allowNull: true },
      rollNo: { type: DataTypes.STRING(40), allowNull: true },
      examYear: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'submitted', 'registered'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'student_board_registrations',
      indexes: [{ unique: true, name: 'uq_student_board_reg', fields: ['student_id', 'board_id'] }],
    },
  );
