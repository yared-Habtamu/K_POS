// src/repositories/attendanceRepository.js
const prisma = require("./prismaClient");

const attendanceRepository = {
  async findById(id) {
    return prisma.attendance.findUnique({ where: { id } });
  },

  async findOne(where) {
    return prisma.attendance.findFirst({ where });
  },

  async findMany(where = {}, options = {}) {
    return prisma.attendance.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.include ? { include: options.include } : {}),
    });
  },

  async create(data) {
    return prisma.attendance.create({ data });
  },

  async update(id, data) {
    return prisma.attendance.update({ where: { id }, data });
  },

  async delete(id) {
    return prisma.attendance.delete({ where: { id } });
  },

  async softDelete(id) {
    return prisma.attendance.update({ where: { id }, data: { isDeleted: true } });
  },

  async countDocuments(where = {}) {
    return prisma.attendance.count({ where });
  },
};

module.exports = attendanceRepository;
