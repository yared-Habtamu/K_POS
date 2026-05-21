// src/repositories/expenseRepository.js
const prisma = require("./prismaClient");

const expenseRepository = {
  async findById(id, options = {}) {
    return prisma.expense.findUnique({
      where: { id },
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findOne(where) {
    return prisma.expense.findFirst({ where });
  },

  async findMany(where = {}, options = {}) {
    return prisma.expense.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  async create(data) {
    return prisma.expense.create({ data });
  },

  async update(id, data) {
    return prisma.expense.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.expense.update({ where: { id }, data: { isDeleted: true } });
  },

  async countDocuments(where = {}) {
    return prisma.expense.count({ where });
  },

  /**
   * Group expenses (e.g. by category or by martId) and sum amounts.
   */
  async groupBy(by, where = {}, sum = {}) {
    return prisma.expense.groupBy({
      by,
      where,
      _sum: sum,
      _count: true,
    });
  },
};

module.exports = expenseRepository;
