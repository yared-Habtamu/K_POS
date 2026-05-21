// src/repositories/subscriptionSettingsRepository.js
const prisma = require("./prismaClient");

const subscriptionSettingsRepository = {
  async findFirst() {
    return prisma.subscriptionSettings.findFirst();
  },

  async create(data) {
    return prisma.subscriptionSettings.create({ data });
  },

  async update(id, data) {
    return prisma.subscriptionSettings.update({ where: { id }, data });
  },

  /**
   * Get or create singleton settings.
   */
  async getOrCreate(defaults = {}) {
    let settings = await prisma.subscriptionSettings.findFirst();
    if (!settings) {
      settings = await prisma.subscriptionSettings.create({ data: defaults });
    }
    return settings;
  },
};

module.exports = subscriptionSettingsRepository;
