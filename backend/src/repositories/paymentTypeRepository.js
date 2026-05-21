// src/repositories/paymentTypeRepository.js
const prisma = require("./prismaClient");

const paymentTypeRepository = {
  async findById(id) {
    return prisma.paymentType.findUnique({ where: { id } });
  },

  async findMany(where = {}, options = {}) {
    return prisma.paymentType.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
    });
  },

  async create(data) {
    return prisma.paymentType.create({ data });
  },

  async update(id, data) {
    return prisma.paymentType.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.paymentType.update({ where: { id }, data: { isDeleted: true } });
  },

  async upsert(name, martId, data = {}) {
    return prisma.paymentType.upsert({
      where: { name_martId: { name, martId } },
      update: data,
      create: { name, martId, ...data },
    });
  },

  async countDocuments(where = {}) {
    return prisma.paymentType.count({ where });
  },
};

module.exports = paymentTypeRepository;
