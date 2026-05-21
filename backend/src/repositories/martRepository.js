// src/repositories/martRepository.js
const prisma = require("./prismaClient");

const martRepository = {
  async findById(id, options = {}) {
    return prisma.mart.findUnique({
      where: { id },
      ...(options.select ? { select: options.select } : {}),
      ...(options.include ? { include: options.include } : {}),
    });
  },

  async findOne(where, options = {}) {
    return prisma.mart.findFirst({
      where,
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findMany(where = {}, options = {}) {
    return prisma.mart.findMany({
      where,
      ...(options.select ? { select: options.select } : {}),
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  async create(data) {
    return prisma.mart.create({ data });
  },

  async update(id, data) {
    return prisma.mart.update({ where: { id }, data });
  },

  async delete(id) {
    return prisma.mart.delete({ where: { id } });
  },

  async softDelete(id) {
    return prisma.mart.update({ where: { id }, data: { isDeleted: true } });
  },

  async countDocuments(where = {}) {
    return prisma.mart.count({ where });
  },
};

module.exports = martRepository;
