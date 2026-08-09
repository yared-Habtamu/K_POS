const prisma = require("../repositories/prismaClient");
const subscriptionSettingsRepository = require("../repositories/subscriptionSettingsRepository");
const martRepository = require("../repositories/martRepository");

function clampNumber(value, fallback, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
}

/**
 * Get the product capacity for a mart.
 * Returns { current, limit, remaining }.
 * Works with the normal Prisma client or an existing transaction client.
 */
async function getProductCapacity(martId, transactionClient) {
  const client = transactionClient || prisma;

  const current = await client.product.count({
    where: { martId, isDeleted: false },
  });

  const settings = await subscriptionSettingsRepository.getOrCreate();
  const mart = await martRepository.findById(martId);

  const subData =
    mart?.subscription && typeof mart.subscription === "object"
      ? mart.subscription
      : {};

  const limit = clampNumber(
    subData.productLimit,
    clampNumber(settings.defaultProductLimit, 100),
    1,
  );

  const remaining = Math.max(0, limit - current);

  return { current, limit, remaining };
}

/**
 * Assert that a mart has capacity for additional products.
 * Throws HTTP 409 with code PRODUCT_LIMIT_REACHED if limit exceeded.
 */
async function assertProductCapacity(
  martId,
  additionalProducts = 1,
  transactionClient,
) {
  const { current, limit, remaining } = await getProductCapacity(
    martId,
    transactionClient,
  );

  if (additionalProducts > remaining) {
    const error = new Error(
      `Product limit reached: ${current}/${limit} products used. Cannot add ${additionalProducts} more.`,
    );
    error.status = 409;
    error.code = "PRODUCT_LIMIT_REACHED";
    error.details = { current, limit, remaining };
    throw error;
  }

  return { current, limit, remaining };
}

module.exports = {
  getProductCapacity,
  assertProductCapacity,
};
