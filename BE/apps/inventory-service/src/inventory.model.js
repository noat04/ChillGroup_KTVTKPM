import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true, index: true },
    stock: { type: Number, required: true, min: 0 },
    reserved: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export const InventoryItem = mongoose.model("InventoryItem", inventorySchema);

