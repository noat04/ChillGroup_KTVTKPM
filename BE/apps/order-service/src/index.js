import { connectMongo } from "../../../packages/shared/src/db.js";
import { RedisEventBus } from "../../../packages/shared/src/event-bus.js";
import { createHttpApp, errorHandler } from "../../../packages/shared/src/http.js";
import { createRedis } from "../../../packages/shared/src/redis.js";
import { CreateOrderCommand, CreateOrderHandler, createOrderSchema } from "./commands.js";
import { Order } from "./order.model.js";
import { GetOrderHandler, GetOrderQuery } from "./queries.js";
import { config } from "../../../packages/shared/src/config.js";

const redis = createRedis();
const eventBus = new RedisEventBus(redis);
const createOrder = new CreateOrderHandler(redis, eventBus);
const getOrder = new GetOrderHandler(redis);
const app = createHttpApp();

app.get("/health", (_req, res) => {
  res.json({ service: "order-service", status: "ok" });
});

app.post("/orders", async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const result = await createOrder.execute(new CreateOrderCommand(input));
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/orders/:id", async (req, res) => {
  const order = await getOrder.execute(new GetOrderQuery(req.params.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

app.get("/users/:userId/orders", async (req, res) => {
  const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
  res.json(orders);
});

app.get("/admin/orders", async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json(orders);
});

app.patch("/admin/orders/:orderId/status", async (req, res) => {
  const allowedStatuses = [
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "SHIPPING",
    "COMPLETED",
    "CANCELLED",
    "REJECTED"
  ];
  const { status, paymentStatus } = req.body;

  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid order status" });
    return;
  }

  if (paymentStatus && !["pending", "paid"].includes(paymentStatus)) {
    res.status(400).json({ error: "Invalid payment status" });
    return;
  }

  const update = { status };
  if (paymentStatus) {
    update.paymentStatus = paymentStatus;
  }

  const order = await Order.findOneAndUpdate({ orderId: req.params.orderId }, update, {
    new: true
  }).lean();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

app.get("/admin/reports", async (_req, res) => {
  const [orders, revenueAgg, statusAgg] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: null, revenue: { $sum: "$total" } } }
    ]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
  ]);
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();

  res.json({
    orders,
    revenue: revenueAgg[0]?.revenue || 0,
    byStatus: statusAgg,
    recentOrders
  });
});

app.use(errorHandler);

await connectMongo("fruitweb_orders");

void eventBus.subscribe("order-service", "order-service-1", async (event) => {
  if (event.type === "InventoryReserved") {
    await Order.updateOne({ orderId: event.orderId }, { status: "PENDING_CONFIRMATION" });
  }

  if (event.type === "InventoryRejected") {
    await Order.updateOne({ orderId: event.orderId }, {
      status: "REJECTED",
      rejectionReason: event.reason
    });
  }
});

app.listen(config.orderPort, () => {
  console.log(`order-service listening on ${config.orderPort}`);
});
