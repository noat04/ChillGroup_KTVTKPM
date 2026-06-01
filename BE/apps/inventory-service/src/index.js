import { config } from "../../../packages/shared/src/config.js";
import { connectMongo } from "../../../packages/shared/src/db.js";
import { RedisEventBus } from "../../../packages/shared/src/event-bus.js";
import { createHttpApp, errorHandler } from "../../../packages/shared/src/http.js";
import { createRedis } from "../../../packages/shared/src/redis.js";
import { InventoryItem } from "./inventory.model.js";

const redis = createRedis();
const eventBus = new RedisEventBus(redis);
const app = createHttpApp();

async function handleProductUpserted(event) {
  // Khi product-service tạo/cập nhật sản phẩm, inventory sẽ đồng bộ lại stock
  await InventoryItem.findOneAndUpdate(
    { productId: event.productId },
    { productId: event.productId, stock: event.stock },
    { upsert: true, new: true }
  );

  // Cache stock vào Redis để các service khác có thể đọc nhanh hơn
  await redis.set(`${config.inventoryPrefix}${event.productId}`, String(event.stock));
}

async function handleOrderCreated(event) {
  // Kiểm tra tồn kho hiện tại của tất cả sản phẩm trong đơn hàng
  const checks = await Promise.all(
    event.items.map(async (item) => {
      const inventory = await InventoryItem.findOne({ productId: item.productId }).lean();
      const stock = inventory?.stock || 0;
      return { ...item, stock };
    })
  );

  // Nếu có sản phẩm không đủ hàng thì reject đơn hàng
  const unavailable = checks.find((item) => item.stock < item.quantity);
  if (unavailable) {
    await eventBus.publish({
      type: "InventoryRejected",
      orderId: event.orderId,
      reason: `Product ${unavailable.productId} only has ${unavailable.stock} item(s) left`,
      occurredAt: new Date().toISOString()
    });
    return;
  }

  // Nếu đủ hàng thì giữ hàng: giảm stock và tăng reserved
  for (const item of event.items) {
    const updated = await InventoryItem.findOneAndUpdate(
      { productId: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, reserved: item.quantity } },
      { new: true }
    );

    // Nếu update thất bại, nghĩa là stock đã thay đổi trước khi giữ hàng
    if (!updated) {
      await eventBus.publish({
        type: "InventoryRejected",
        orderId: event.orderId,
        reason: `Product ${item.productId} changed before reservation`,
        occurredAt: new Date().toISOString()
      });
      return;
    }

    // Đồng bộ stock mới vào Redis sau khi giữ hàng thành công
    await redis.set(`${config.inventoryPrefix}${item.productId}`, String(updated.stock));
  }

  // Thông báo cho order-service biết inventory đã giữ hàng thành công
  await eventBus.publish({
    type: "InventoryReserved",
    orderId: event.orderId,
    items: event.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    })),
    occurredAt: new Date().toISOString()
  });
}

await connectMongo("fruitweb_inventory");

app.get("/health", (_req, res) => {
  res.json({ service: "inventory-service", status: "ok" });
});

app.get("/admin/inventory", async (_req, res) => {
  // Admin xem toàn bộ tồn kho, sắp xếp sản phẩm mới cập nhật lên trước
  const items = await InventoryItem.find().sort({ updatedAt: -1 }).lean();
  res.json(items);
});

app.patch("/admin/inventory/:productId", async (req, res, next) => {
  try {
    const stock = Number(req.body.stock);

    // Validate số lượng tồn kho admin nhập vào
    if (!Number.isInteger(stock) || stock < 0) {
      res.status(400).json({ error: "stock must be a non-negative integer" });
      return;
    }

    // Admin cập nhật thủ công stock của một sản phẩm
    const item = await InventoryItem.findOneAndUpdate(
      { productId: req.params.productId },
      { stock },
      { upsert: true, new: true }
    );

    // Đồng bộ stock vừa cập nhật vào Redis
    await redis.set(`${config.inventoryPrefix}${req.params.productId}`, String(stock));
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

app.listen(Number(process.env.INVENTORY_PORT || 8084), () => {
  console.log(`inventory-service http listening on ${process.env.INVENTORY_PORT || 8084}`);
});

console.log("inventory-service subscribed to Redis event stream");

// Lắng nghe event từ các service khác để xử lý đồng bộ inventory
void eventBus.subscribe("inventory-service", "inventory-service-1", async (event) => {
  if (event.type === "ProductUpserted") {
    await handleProductUpserted(event);
  }

  if (event.type === "OrderCreated") {
    await handleOrderCreated(event);
  }
});