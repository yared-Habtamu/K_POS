// src/repositories/requestRepositories.js
// Shared repository factories for all action/request models.
const prisma = require("./prismaClient");

function makeRequestRepository(modelName) {
  const model = prisma[modelName];
  return {
    async findById(id, options = {}) {
      return model.findUnique({
        where: { id },
        ...(options.include ? { include: options.include } : {}),
      });
    },

    async findOne(where, options = {}) {
      return model.findFirst({
        where,
        ...(options.include ? { include: options.include } : {}),
        ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      });
    },

    async findMany(where = {}, options = {}) {
      return model.findMany({
        where,
        ...(options.orderBy ? { orderBy: options.orderBy } : { orderBy: { createdAt: "desc" } }),
        ...(options.include ? { include: options.include } : {}),
        ...(options.skip !== undefined ? { skip: options.skip } : {}),
        ...(options.take !== undefined ? { take: options.take } : {}),
      });
    },

    async create(data) {
      return model.create({ data });
    },

    async update(id, data) {
      return model.update({ where: { id }, data });
    },

    async delete(id) {
      return model.delete({ where: { id } });
    },

    async countDocuments(where = {}) {
      return model.count({ where });
    },
  };
}

const assetActionRequestRepository = makeRequestRepository("assetActionRequest");
const expenseActionRequestRepository = makeRequestRepository("expenseActionRequest");
const productAddRequestRepository = makeRequestRepository("productAddRequest");
const productEditRequestRepository = makeRequestRepository("productEditRequest");
const stockTransferRequestRepository = makeRequestRepository("stockTransferRequest");

module.exports = {
  assetActionRequestRepository,
  expenseActionRequestRepository,
  productAddRequestRepository,
  productEditRequestRepository,
  stockTransferRequestRepository,
};
