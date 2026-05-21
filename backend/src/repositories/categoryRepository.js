// src/repositories/categoryRepository.js
const prisma = require("./prismaClient");

const categoryRepository = {
  async findById(id) {
    return prisma.category.findUnique({ where: { id } });
  },

  async findMany(where = {}, options = {}) {
    return prisma.category.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
    });
  },

  async create(data) {
    return prisma.category.create({ data });
  },

  async update(id, data) {
    return prisma.category.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.category.update({ where: { id }, data: { isDeleted: true } });
  },

  /**
   * Upsert category by name and martId (mimics Mongoose findOneAndUpdate with upsert).
   */
  async upsert(name, martId) {
    const trimmedName = name.trim();
    return prisma.category.upsert({
      where: {
        name_martId: { name: trimmedName, martId: martId },
      },
      update: {},
      create: { name: trimmedName, martId: martId },
    });
  },

  async countDocuments(where = {}) {
    return prisma.category.count({ where });
  },
};

module.exports = categoryRepository;
