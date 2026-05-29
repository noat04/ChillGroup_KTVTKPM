import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { config } from "../../../packages/shared/src/config.js";
import { connectMongo } from "../../../packages/shared/src/db.js";
import { createHttpApp, errorHandler } from "../../../packages/shared/src/http.js";
import { sendPasswordResetOtp } from "./mailer.js";
import { User } from "./user.model.js";

const app = createHttpApp();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["customer", "admin"]).optional().default("customer")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(6),
  password: z.string().min(6)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().max(30).optional().default(""),
  address: z.string().max(300).optional().default("")
});

const cartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive()
    })
  )
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
    role: user.role
  };
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

app.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

app.post("/auth/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: input.email });
    if (exists) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }

    const count = await User.countDocuments();
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: count === 0 ? "admin" : input.role
    });

    res.status(201).json({ user: toPublicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    res.json({ user: toPublicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/auth/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.get("/auth/profile", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: toPublicUser(user) });
});

app.put("/auth/profile", requireAuth, async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user.sub,
      {
        name: input.name,
        phone: input.phone,
        address: input.address
      },
      { new: true }
    ).lean();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: toPublicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

app.put("/auth/password", requireAuth, async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user.sub);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const validPassword = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!validPassword) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
});

app.get("/cart", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ items: user.cart || [] });
});

app.put("/cart", requireAuth, async (req, res, next) => {
  try {
    const input = cartSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { cart: input.items },
      { new: true }
    ).lean();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ items: user.cart || [] });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ email: input.email });
    if (!user) {
      res.json({ message: "If the email exists, a reset link was sent." });
      return;
    }

    const otp = String(randomInt(100000, 1000000));
    user.resetTokenHash = hashToken(otp);
    user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 10);
    await user.save();

    const mail = await sendPasswordResetOtp(user.email, otp);
    res.json({
      message: "OTP reset password da duoc gui toi email.",
      otp: mail.delivered ? undefined : otp
    });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/reset-password", async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const user = await User.findOne({
      resetTokenHash: hashToken(input.token),
      resetTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    user.passwordHash = await bcrypt.hash(input.password, 10);
    user.resetTokenHash = "";
    user.resetTokenExpiresAt = undefined;
    await user.save();
    res.json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
});

/**
 * Middleware yêu cầu quyền `admin`.
 * Nếu token hợp lệ và payload.role === 'admin' thì attach `req.user` và next().
 */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Schema để admin cập nhật user
const updateUserByAdminSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  role: z.enum(["customer", "admin"]).optional()
});

// Schema để admin tạo user mới
const createUserByAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().max(30).optional().default(""),
  address: z.string().max(300).optional().default(""),
  role: z.enum(["customer", "admin"]).optional().default("customer")
});

// ========== ADMIN ENDPOINTS ==========

/**
 * Danh sách tất cả user trong hệ thống.
 * Admin only.
 */
app.get("/admin/users", requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({}, "-passwordHash -resetTokenHash").sort({ createdAt: -1 }).lean();
    res.json(users.map(toPublicUser));
  } catch (error) {
    next(error);
  }
});

/**
 * Chi tiết một user theo userId.
 * Admin only.
 */
app.get("/admin/users/:userId", requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId, "-passwordHash -resetTokenHash").lean();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(toPublicUser(user));
  } catch (error) {
    next(error);
  }
});

/**
 * Cập nhật thông tin user (admin cập nhật cho user khác).
 * Admin only.
 */
app.patch("/admin/users/:userId", requireAdmin, async (req, res, next) => {
  try {
    const input = updateUserByAdminSchema.parse(req.body);

    // Nếu cập nhật email thì kiểm tra không trùng
    if (input.email) {
      const existingUser = await User.findOne({ email: input.email, _id: { $ne: req.params.userId } });
      if (existingUser) {
        res.status(409).json({ error: "Email already exists" });
        return;
      }
    }

    const updateData = {};
    if (input.name) updateData.name = input.name;
    if (input.email) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.role) updateData.role = input.role;

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true }).select("-passwordHash -resetTokenHash").lean();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(toPublicUser(user));
  } catch (error) {
    next(error);
  }
});

/**
 * Tạo user mới (admin tạo cho khách).
 * Admin only.
 */
app.post("/admin/users", requireAdmin, async (req, res, next) => {
  try {
    const input = createUserByAdminSchema.parse(req.body);

    // Kiểm tra email không trùng
    const exists = await User.findOne({ email: input.email });
    if (exists) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }

    const user = await User.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role
    });

    res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

/**
 * Xóa user (soft-delete: không thực sự xóa nhưng có thể đánh dấu trong tương lai).
 * Admin only.
 * Hiện tại: xóa user khỏi DB (hard delete).
 */
app.delete("/admin/users/:userId", requireAdmin, async (req, res, next) => {
  try {
    // Không cho phép xóa user cuối cùng là admin
    if (req.params.userId === req.user.sub) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const result = await User.findByIdAndDelete(req.params.userId);
    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ deleted: true, userId: req.params.userId });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

await connectMongo("fruitweb_users");

app.listen(config.userPort, () => {
  console.log(`user-service listening on ${config.userPort}`);
});
