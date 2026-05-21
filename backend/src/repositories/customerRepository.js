// src/repositories/customerRepository.js
const prisma = require("./prismaClient");

const customerRepository = {
  async findById(id, options = {}) {
    return prisma.customer.findUnique({
      where: { id },
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findOne(where, options = {}) {
    return prisma.customer.findFirst({
      where,
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findMany(where = {}, options = {}) {
    return prisma.customer.findMany({
      where,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  async create(data) {
    return prisma.customer.create({ data });
  },

  async update(id, data) {
    return prisma.customer.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.customer.update({ where: { id }, data: { isDeleted: true } });
  },

  async countDocuments(where = {}) {
    return prisma.customer.count({ where });
  },
};

module.exports = customerRepository;
