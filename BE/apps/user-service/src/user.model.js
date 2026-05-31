import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
    cart: {
      type: [
        {
          productId: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 }
        }
      ],
      default: []
    },
    resetTokenHash: { type: String, default: "" },
    resetTokenExpiresAt: { type: Date }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
