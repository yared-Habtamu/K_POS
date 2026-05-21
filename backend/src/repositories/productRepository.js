// src/repositories/productRepository.js
const prisma = require("./prismaClient");

const productRepository = {
  async findById(id, options = {}) {
    return prisma.product.findUnique({
      where: { id },
      ...(options.select ? { select: options.select } : {}),
      ...(options.include ? { include: options.include } : {}),
    });
  },

  async findOne(where, options = {}) {
    return prisma.product.findFirst({
      where,
      ...(options.select ? { select: options.select } : {}),
    });
  },

  async findMany(where = {}, options = {}) {
    return prisma.product.findMany({
      where,
      ...(options.select ? { select: options.select } : {}),
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
      ...(options.include ? { include: options.include } : {}),
    });
  },

  async create(data) {
    return prisma.product.create({ data });
  },

  async update(id, data) {
    return prisma.product.update({ where: { id }, data });
  },

  async softDelete(id) {
    return prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });
  },

  async countDocuments(where = {}) {
    return prisma.product.count({ where });
  },

  /**
   * Find a product by barcode within a specific mart.
   */
  async findByBarcode(barcode, martId = null) {
    const where = {
      barcodes: { has: barcode },
      isDeleted: false,
    };
    if (martId) where.martId = martId;
    return prisma.product.findFirst({ where });
  },

  /**
   * Find product where barcode is in the given list (duplicate check).
   */
  async findByBarcodeIn(barcodes, martId, excludeId = null) {
    const where = {
      barcodes: { hasSome: barcodes },
      isDeleted: false,
      martId,
    };
    if (excludeId) where.id = { not: excludeId };
    return prisma.product.findFirst({
      where,
      select: { id: true, name: true, barcodes: true },
    });
  },

  /**
   * Atomic stock update (decrement/increment) within a Prisma transaction context.
   */
  async atomicStockUpdate(id, updates, tx = null) {
    const client = tx || prisma;
    return client.product.update({
      where: { id },
      data: updates,
    });
  },
};

module.exports = productRepository;
