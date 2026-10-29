import { DataTypes } from 'sequelize';

/** A live class held over a video link: when, for which class and subject, who teaches it and where to join. Students of that class see it in their portal. */
export default (sequelize) =>
  sequelize.define(
    'OnlineClass',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(160), allowNull: false },
      classId: { type: DataTypes.INTEGER, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: true },
      classDate: { type: DataTypes.DATEONLY, allowNull: false },
      startTime: { type: DataTypes.STRING(5), allowNull: false },
      endTime: { type: DataTypes.STRING(5), allowNull: true },
      link: { type: DataTypes.STRING(500), allowNull: false },
      teacherName: { type: DataTypes.STRING(100), allowNull: true },
      notes: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'online_classes' },
  );
