// src/repositories/dailyReportRepository.js
const prisma = require("./prismaClient");

const dailyReportRepository = {
  async findById(id) {
    return prisma.dailyReport.findUnique({ where: { id } });
  },

  async findMany(where = {}, options = {}) {
    return prisma.dailyReport.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
    });
  },

  async create(data) {
    return prisma.dailyReport.create({ data });
  },

  async update(id, data) {
    return prisma.dailyReport.update({ where: { id }, data });
  },
};

module.exports = dailyReportRepository;
