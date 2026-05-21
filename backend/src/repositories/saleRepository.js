// src/repositories/saleRepository.js
const prisma = require("./prismaClient");

const saleRepository = {
  async findById(id, options = {}) {
    return prisma.sale.findUnique({
      where: { id },
      ...(options.include ? { include: options.include } : { include: { items: true } }),
    });
  },

  async findOne(where, options = {}) {
    return prisma.sale.findFirst({
      where,
      ...(options.include ? { include: options.include } : { include: { items: true } }),
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findMany(where = {}, options = {}) {
    return prisma.sale.findMany({
      where,
      ...(options.include ? { include: options.include } : { include: { items: true } }),
      ...(options.select ? { select: options.select } : {}),
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  },

  /**
   * Create a sale with nested items in a single transaction.
   */
  async createWithItems(saleData, items) {
    return prisma.sale.create({
      data: {
        ...saleData,
        items: {
          create: items,
        },
      },
      include: { items: true },
    });
  },

  /**
   * Create a sale with items AND stock deduction atomically.
   * Uses interactive transaction.
   */
  async createSaleTransaction(saleData, items, stockUpdates) {
    return prisma.$transaction(async (tx) => {
      // 1. Deduct stock for each product
      for (const su of stockUpdates) {
        await tx.product.update({
          where: { id: su.productId },
          data: su.updates,
        });
      }

      // 2. Create the sale with items
      const sale = await tx.sale.create({
        data: {
          ...saleData,
          items: {
            create: items,
          },
        },
        include: { items: true },
      });

      return sale;
    });
  },

  async countDocuments(where = {}) {
    return prisma.sale.count({ where });
  },
};

module.exports = saleRepository;
