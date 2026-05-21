// src/repositories/notificationRepository.js
const prisma = require("./prismaClient");

const notificationRepository = {
  async findById(id) {
    return prisma.notification.findUnique({ where: { id } });
  },

  async findOne(where) {
    return prisma.notification.findFirst({ where });
  },

  async findMany(where = {}, options = {}) {
    return prisma.notification.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : { orderBy: { createdAt: "desc" } }),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  async create(data) {
    return prisma.notification.create({ data });
  },

  async update(id, data) {
    return prisma.notification.update({ where: { id }, data });
  },

  async updateMany(where, data) {
    return prisma.notification.updateMany({ where, data });
  },

  async countDocuments(where = {}) {
    return prisma.notification.count({ where });
  },
};

module.exports = notificationRepository;
