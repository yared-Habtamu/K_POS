// src/repositories/expenseCategoryRepository.js
const prisma = require("./prismaClient");

const expenseCategoryRepository = {
  async findById(id) {
    return prisma.expenseCategory.findUnique({ where: { id } });
  },

  async findMany(where = {}, options = {}) {
    return prisma.expenseCategory.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
    });
  },

  async create(data) {
    return prisma.expenseCategory.create({ data });
  },

  async update(id, data) {
    return prisma.expenseCategory.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.expenseCategory.update({ where: { id }, data: { isDeleted: true } });
  },

  async upsert(name, martId) {
    const trimmedName = name.trim();
    return prisma.expenseCategory.upsert({
      where: { name_martId: { name: trimmedName, martId } },
      update: {},
      create: { name: trimmedName, martId },
    });
  },

  async countDocuments(where = {}) {
    return prisma.expenseCategory.count({ where });
  },
};

module.exports = expenseCategoryRepository;
