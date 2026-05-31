import { nanoid } from "nanoid";
import { z } from "zod";
import { config } from "../../../packages/shared/src/config.js";
import { Order } from "./order.model.js";
import { sendCodInvoiceEmail } from "./invoice-mailer.js";

export const createOrderSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email().optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  note: z.string().optional().default(""),
  userId: z.string().optional().default(""),
  paymentMethod: z.enum(["cod", "bank", "card"]).optional().default("cod"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

export class CreateOrderCommand {
  constructor(input) {
    this.type = "CreateOrder";
    this.input = input;
  }
}

export class CreateOrderHandler {
  constructor(redis, eventBus) {
    this.redis = redis;
    this.eventBus = eventBus;
  }

  async execute(command) {
    const products = await this.redis.hgetall(config.projectionProductsKey);
    const pricedItems = command.input.items.map((item) => {
      const product = products[item.productId];
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const parsed = JSON.parse(product);
      return {
        ...item,
        name: parsed.name,
        price: parsed.price
      };
    });

    const total = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = nanoid(12);

    const order = await Order.create({
      orderId,
      customerName: command.input.customerName,
      customerEmail: command.input.customerEmail,
      phone: command.input.phone,
      address: command.input.address,
      note: command.input.note,
      userId: command.input.userId,
      items: pricedItems,
      total,
      paymentMethod: command.input.paymentMethod,
      paymentStatus: command.input.paymentMethod === "cod" ? "pending" : "paid",
      status: "PENDING_INVENTORY"
    });

    if (command.input.paymentMethod === "cod" && command.input.customerEmail) {
      void sendCodInvoiceEmail(order.toObject()).catch((error) => {
        console.error(`failed to send COD invoice for order ${orderId}:`, error);
      });
    }

    await this.eventBus.publish({
      type: "OrderCreated",
      orderId,
      customerName: command.input.customerName,
      customerEmail: command.input.customerEmail,
      phone: command.input.phone,
      address: command.input.address,
      note: command.input.note,
      userId: command.input.userId,
      paymentMethod: command.input.paymentMethod,
      paymentStatus: command.input.paymentMethod === "cod" ? "pending" : "paid",
      items: pricedItems,
      total,
      occurredAt: new Date().toISOString()
    });

    return { orderId, total };
  }
}
