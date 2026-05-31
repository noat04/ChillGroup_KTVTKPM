import mongoose from "mongoose";

/**
 * Mongoose schema cho `Product`.
 * - `productId` là định danh ổn định dùng xuyên suốt hệ thống và trong projection.
 */
const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "Trai cay tuoi", index: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    unit: { type: String, default: "kg" },
    origin: { type: String, default: "Viet Nam" },
    stock: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);

