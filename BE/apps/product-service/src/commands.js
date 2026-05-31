import { nanoid } from "nanoid";
import { z } from "zod";
import { Product } from "./product.model.js";

/**
 * Schema và handler cho thao tác upsert product.
 * - Dùng Zod để validate input trước khi lưu vào DB
 */

export const upsertProductSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional().default(""),
  category: z.string().optional().default("Trai cay tuoi"),
  price: z.number().positive(),
  imageUrl: z.string().url(),
  unit: z.string().optional().default("kg"),
  origin: z.string().optional().default("Viet Nam"),
  stock: z.number().int().min(0),
  active: z.boolean().optional().default(true)
});
// dùng để truyền dữ liệu có kiểu rõ ràng vào handler (tách validation/transport khỏi logic xử lý).
export class UpsertProductCommand {
  constructor(input) {
    this.type = "UpsertProduct";
    this.input = input;
  }
}

//Khởi tạo với eventBus (RedisEventBus) để có thể publish events. 
// Chịu trách nhiệm thực thi business logic liên quan tới upsert sản phẩm.
export class UpsertProductHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Thực hiện upsert product và publish sự kiện `ProductUpserted`.
   * Trả về `{ productId }` khi thành công.
   */
  async execute(command) {
    const productId = command.input.productId || nanoid(10);
    const product = await Product.findOneAndUpdate(
      { productId },
      {
        ...command.input,
        productId
      },
      { new: true, upsert: true }
    );

    await this.eventBus.publish({
      type: "ProductUpserted",
      productId,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
      unit: product.unit,
      origin: product.origin,
      stock: product.stock,
      active: product.active,
      occurredAt: product.updatedAt.toISOString()
    });

    return { productId };
  }
}
