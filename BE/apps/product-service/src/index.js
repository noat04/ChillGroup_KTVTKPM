/**
 * Product service
 * Xử lý quản lý sản phẩm và phát event để các service khác đồng bộ dữ liệu.
 */
import { config } from "../../../packages/shared/src/config.js";
import { connectMongo } from "../../../packages/shared/src/db.js";
import { RedisEventBus } from "../../../packages/shared/src/event-bus.js";
import { createHttpApp, errorHandler } from "../../../packages/shared/src/http.js";
import { createRedis } from "../../../packages/shared/src/redis.js";
import {
  UpsertProductCommand,
  UpsertProductHandler,
  upsertProductSchema
} from "./commands.js";
import { Product } from "./product.model.js";

const redis = createRedis();
const eventBus = new RedisEventBus(redis);
const handler = new UpsertProductHandler(eventBus);
const app = createHttpApp();

app.get("/health", (_req, res) => {
  res.json({ service: "product-service", status: "ok" });
});

app.get("/products", async (_req, res) => {
  // Lấy các sản phẩm đang hoạt động để hiển thị cho khách hàng
  const products = await Product.find({ active: true }).sort({ name: 1 }).lean();
  res.json(products.map(toProductView));
});

app.get("/admin/products", async (_req, res) => {
  // Admin lấy toàn bộ sản phẩm, bao gồm cả sản phẩm đã bị xóa mềm
  const products = await Product.find().sort({ updatedAt: -1 }).lean();
  res.json(products.map(toProductView));
});

app.delete("/admin/products/:productId", async (req, res, next) => {
  try {
    // Xóa mềm sản phẩm thay vì xóa khỏi database
    await Product.updateOne(
      { productId: req.params.productId },
      { active: false, stock: 0 }
    );

    const product = await Product.findOne({ productId: req.params.productId }).lean();

    // Publish event để inventory-service và các service khác biết sản phẩm đã ngừng bán
    if (product) {
      await eventBus.publish({
        type: "ProductUpserted",
        productId: product.productId,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        imageUrl: product.imageUrl,
        unit: product.unit,
        origin: product.origin,
        stock: 0,
        active: false,
        occurredAt: new Date().toISOString()
      });
    }

    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Chuẩn hóa dữ liệu product trước khi trả về client.
 */
function toProductView(product) {
  return {
    id: product.productId,
    productId: product.productId,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    unit: product.unit,
    origin: product.origin,
    stock: product.stock,
    active: product.active
  };
}

app.post("/products", async (req, res, next) => {
  try {
    // Validate dữ liệu request trước khi tạo hoặc cập nhật sản phẩm
    const input = upsertProductSchema.parse(req.body);

    // Gửi command vào handler để xử lý nghiệp vụ upsert product
    const result = await handler.execute(new UpsertProductCommand(input));

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/products/seed", async (_req, res, next) => {
  try {
    // Danh sách sản phẩm mẫu dùng để seed dữ liệu ban đầu
    const samples = [
      {
        productId: "xoai-cat-hoa-loc",
        name: "Xoai cat Hoa Loc",
        description: "Xoai thom ngot, thit deo, phu hop an tuoi hoac lam sinh to.",
        category: "Trai cay Viet Nam",
        price: 65000,
        imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=80",
        unit: "kg",
        origin: "Tien Giang",
        stock: 30
      },
      {
        productId: "dau-tay-da-lat",
        name: "Dau tay Da Lat",
        description: "Dau tay tuoi, vi chua ngot tu nhien, dong hop trong ngay.",
        category: "Trai cay cao cap",
        price: 120000,
        imageUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=80",
        unit: "hop",
        origin: "Da Lat",
        stock: 18
      },
      {
        productId: "cam-sanh",
        name: "Cam sanh",
        description: "Cam mong nuoc, hop ep nuoc va dung hang ngay.",
        category: "Trai cay Viet Nam",
        price: 42000,
        imageUrl: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=900&q=80",
        unit: "kg",
        origin: "Vinh Long",
        stock: 45
      },
      {
        productId: "nho-do-khong-hat",
        name: "Nho do khong hat",
        description: "Nho gion, ngot, tien loi cho gia dinh va van phong.",
        category: "Trai cay nhap khau",
        price: 155000,
        imageUrl: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=900&q=80",
        unit: "kg",
        origin: "My",
        stock: 24
      }
    ];

    const results = [];

    // Seed cũng đi qua handler để đảm bảo vẫn chạy đúng logic publish event
    for (const product of samples) {
      results.push(await handler.execute(new UpsertProductCommand(product)));
    }

    res.status(202).json({ seeded: results.length, products: results });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

await connectMongo("fruitweb_products");

app.listen(config.productPort, () => {
  console.log(`product-service listening on ${config.productPort}`);
});
