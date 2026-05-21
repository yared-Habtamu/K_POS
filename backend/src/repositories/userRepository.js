// src/repositories/userRepository.js
const prisma = require("./prismaClient");

const userRepository = {
  async findById(id, options = {}) {
    return prisma.user.findUnique({
      where: { id },
      ...(options.select ? { select: options.select } : {}),
      ...(options.include ? { include: options.include } : {}),
    });
  },

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findOne(where, options = {}) {
    return prisma.user.findFirst({
      where,
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findMany(where = {}, options = {}) {
    return prisma.user.findMany({
      where,
      ...(options.select ? { select: options.select } : {}),
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  async create(data) {
    return prisma.user.create({ data });
  },

  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
  },

  async delete(id) {
    return prisma.user.delete({ where: { id } });
  },

  async softDelete(id) {
    return prisma.user.update({ where: { id }, data: { isDeleted: true } });
  },

  async countDocuments(where = {}) {
    return prisma.user.count({ where });
  },

  async upsert(where, create, update) {
    return prisma.user.upsert({ where, create, update });
  },
};

module.exports = userRepository;
