import { Order } from "./order.model.js";

export class GetOrderQuery {
  constructor(orderId) {
    this.type = "GetOrder";
    this.orderId = orderId;
  }
}

export class GetOrderHandler {
  constructor(redis) {
    this.redis = redis;
  }

  async execute(query) {
    const order = await Order.findOne({ orderId: query.orderId }).lean();
    if (!order) {
      return null;
    }

    return {
      orderId: order.orderId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      phone: order.phone,
      address: order.address,
      note: order.note,
      userId: order.userId,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      rejectionReason: order.rejectionReason,
      createdAt: order.createdAt
    };
  }
}
