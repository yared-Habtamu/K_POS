// src/repositories/assetRepository.js
const prisma = require("./prismaClient");

const assetRepository = {
  async findById(id, options = {}) {
    return prisma.asset.findUnique({
      where: { id },
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findOne(where, options = {}) {
    return prisma.asset.findFirst({
      where,
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findMany(where = {}, options = {}) {
    return prisma.asset.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  async create(data) {
    return prisma.asset.create({ data });
  },

  async update(id, data) {
    return prisma.asset.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.asset.update({ where: { id }, data: { isDeleted: true } });
  },

  async delete(id) {
    return prisma.asset.delete({ where: { id } });
  },

  async countDocuments(where = {}) {
    return prisma.asset.count({ where });
  },
};

module.exports = assetRepository;
