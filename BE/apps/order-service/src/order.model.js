import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    note: { type: String, default: "" },
    userId: { type: String, default: "", index: true },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cod", "bank", "card"], default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending", index: true },
    status: {
      type: String,
      enum: [
        "PENDING_INVENTORY",
        "PENDING_CONFIRMATION",
        "CONFIRMED",
        "SHIPPING",
        "COMPLETED",
        "REJECTED",
        "CANCELLED"
      ],
      default: "PENDING_INVENTORY",
      index: true
    },
    rejectionReason: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
