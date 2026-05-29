import { config } from "../../../packages/shared/src/config.js";
import { RedisEventBus } from "../../../packages/shared/src/event-bus.js";
import { createRedis } from "../../../packages/shared/src/redis.js";

const redis = createRedis();
const eventBus = new RedisEventBus(redis);

async function projectProduct(event) {
  const product = {
    id: event.productId,
    productId: event.productId,
    name: event.name,
    description: event.description,
    category: event.category,
    price: event.price,
    imageUrl: event.imageUrl,
    unit: event.unit,
    origin: event.origin,
    stock: event.stock,
    active: event.active,
    updatedAt: event.occurredAt
  };

  await redis.hset(config.projectionProductsKey, event.productId, JSON.stringify(product));
}

async function updateProjectedStock(event) {
  const products = await redis.hgetall(config.projectionProductsKey);

  for (const item of event.items) {
    const raw = products[item.productId];
    if (!raw) {
      continue;
    }

    const product = JSON.parse(raw);
    product.stock = Math.max(0, product.stock - item.quantity);
    product.updatedAt = event.occurredAt;
    await redis.hset(config.projectionProductsKey, item.productId, JSON.stringify(product));
  }
}

console.log("projection-service building Redis query models");

void eventBus.subscribe("projection-service", "projection-service-1", async (event) => {
  if (event.type === "ProductUpserted") {
    await projectProduct(event);
  }

  if (event.type === "InventoryReserved") {
    await updateProjectedStock(event);
  }
});
