/**
 * Dịch vụ Gateway
 * - Nhận các yêu cầu từ Frontend và chuyển tiếp (proxy) đến các microservice nội bộ
 * - Áp dụng xác thực, phân quyền admin, giới hạn tần suất (rate limiting)
 * - Cung cấp endpoint hỗ trợ AI và upload ảnh
 */
import { config } from "../../../packages/shared/src/config.js";
import { createHttpApp, errorHandler } from "../../../packages/shared/src/http.js";
import { createRedis } from "../../../packages/shared/src/redis.js";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

const redis = createRedis();
const app = createHttpApp();

const productBaseUrl = config.productServiceUrl;
const orderBaseUrl = config.orderServiceUrl;
const userBaseUrl = config.userServiceUrl;
const inventoryBaseUrl = config.inventoryServiceUrl;

/**
 * Lấy định danh client để áp dụng rate limit.
 * Ưu tiên: user id (nếu đã auth) -> header X-Forwarded-For -> kết nối remote IP.
 * Trả về chuỗi dùng làm phần key trong Redis để tách biệt quota giữa các client.
 */
function getClientIdentifier(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const remoteIp = forwardedFor || req.ip || req.connection?.remoteAddress || "unknown";
  return req.user?.sub ? `user:${req.user.sub}` : `ip:${remoteIp}`;
}

/**
 * Tạo middleware rate limiter dựa trên Redis.
 * Key Redis: `${prefix}:${clientIdentifier}:${timeWindowBucket}`.
 * Nếu vượt `maxRequests` trong `windowSeconds` trả 429 với header `Retry-After`.
 */
function createRateLimiter({ prefix, windowSeconds, maxRequests }) {
  return async (req, res, next) => {
    try {
      //Tạo key Redis dựa trên prefix, định danh client và cửa sổ thời gian hiện tại
      const key = `${prefix}:${getClientIdentifier(req)}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      //Tăng số request
      const count = await redis.incr(key);
      if (count === 1) {
        //Set thời gian hết hạn cho key nếu mới tạo
        await redis.expire(key, windowSeconds);
      }
      //Chặn quá số lần
      if (count > maxRequests) {
        res.set("Retry-After", String(windowSeconds));
        res.status(429).json({ error: "Too many requests. Please wait and try again later." });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Giới hạn toàn cục cho tất cả route `/api`.
const apiRateLimiter = createRateLimiter({
  prefix: "gateway",
  windowSeconds: config.gatewayRateLimitWindowSeconds,
  maxRequests: config.gatewayRateLimitMaxRequests
});

// Giới hạn riêng cho các endpoint auth (register/login)
const authRateLimiter = createRateLimiter({
  prefix: "gateway:auth",
  windowSeconds: config.gatewayRateLimitWindowSeconds,
  maxRequests: config.gatewayAuthRateLimitMaxRequests
});

// Giới hạn riêng cho endpoint gọi mô hình AI
const aiRateLimiter = createRateLimiter({
  prefix: "gateway:ai",
  windowSeconds: config.gatewayRateLimitWindowSeconds,
  maxRequests: config.gatewayAiRateLimitMaxRequests
});

//Mọi route /api/* đều bị rate limit.
app.use("/api", apiRateLimiter);



/**
 * Proxy request JSON tới một dịch vụ nội bộ và chuyển tiếp phản hồi về client.
 * - Giữ nguyên header Authorization nếu có
 * - Mặc định gửi `req.body` dưới dạng JSON; set `options.body = false` nếu không gửi body
 */
async function proxyJson(req, res, next, url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization || ""
      },
      body: options.body === false ? undefined : JSON.stringify(req.body)
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware yêu cầu quyền `admin`.
 * Nếu token hợp lệ và payload.role === 'admin' thì attach `req.user` và next(),
 * ngược lại trả 401/403 phù hợp.
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

/**
 * Middleware yêu cầu user đã xác thực.
 * Nếu token hợp lệ attach `req.user`.
 */
function requireUser(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/api/health", async (_req, res) => {
  res.json({ service: "gateway", status: "ok" });
});

app.post("/api/auth/register", authRateLimiter, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/register`)
);

app.post("/api/auth/login", authRateLimiter, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/login`)
);

app.get("/api/auth/me", (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/me`, { body: false })
);

app.get("/api/auth/profile", requireUser, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/profile`, { body: false })
);

app.put("/api/auth/profile", requireUser, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/profile`)
);

app.put("/api/auth/password", requireUser, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/password`)
);

app.post("/api/auth/forgot-password", (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/forgot-password`)
);

app.post("/api/auth/reset-password", (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/auth/reset-password`)
);

app.get("/api/cart", requireUser, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/cart`, { body: false })
);

app.put("/api/cart", requireUser, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/cart`)
);

app.get("/api/products", async (_req, res) => {
  res.json(await loadActiveProducts());
});

/**
 * Load danh sách sản phẩm từ Redis projection (nếu có) để trả về nhanh cho client.
 * Nếu không có dữ liệu trong projection thì fallback gọi Product service.
 */
async function loadActiveProducts() {
  const raw = await redis.hgetall(config.projectionProductsKey);
  let products = Object.values(raw)
    .map((item) => JSON.parse(item))
    .filter((item) => item.productId && item.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (products.length === 0) {
    const response = await fetch(`${productBaseUrl}/products`);
    products = await response.json();
  }

  return products;
}

app.post("/api/ai/product-suggestions", aiRateLimiter, async (req, res, next) => {
  try {
    const description = String(req.body?.description || "").trim();
    if (description.length < 3) {
      res.status(400).json({ error: "Description is required" });
      return;
    }

    const products = await loadActiveProducts();
    const criteria = config.geminiApiKey
      ? await parseProductSearchWithGemini(description)
      : parseProductSearchFallback(description);
    const normalizedCriteria = normalizeCriteria(criteria, description);
    const suggestions = suggestProducts(products, normalizedCriteria).slice(0, 12);

    res.json({
      criteria: normalizedCriteria,
      products: suggestions,
      source: config.geminiApiKey ? "gemini" : "fallback"
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/products", requireAdmin, async (req, res, next) => {
  try {
    const response = await fetch(`${productBaseUrl}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    res.status(response.status).json(await response.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/products", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${productBaseUrl}/admin/products`, { body: false })
);

/**
 * Gửi mô tả tìm kiếm tới API Gemini của Google để phân tích và trả về criteria dạng JSON.
 * Nếu Gemini không khả dụng hoặc trả về không phải JSON sẽ dùng fallback cục bộ.
 */
async function parseProductSearchWithGemini(description) {
  // Use a short timeout and robust parsing because the model may return
  // non-JSON or wrapped text. If anything fails, fallback to local parser.
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const prompt = [
      "Phan tich cau tim san pham trai cay va tra ve MOT DOI TUONG JSON duy nhat.",
      "Chi tra ve DUY NHAT JSON hop le (khong co giai thich, khong co markdown, khong co mã),",
      "Schema minh hoa:",
      '{"keywords": ["tu khoa"], "origins": ["Viet Nam"], "categories": ["Trai cay"], "minPrice": null, "maxPrice": null}',
      `Cau tim kiem: ${description}`
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.geminiApiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.05,
            responseMimeType: "application/json",
            candidateCount: 1
          }
        })
      }
    );

    clearTimeout(timer);

    if (!response.ok) {
      console.warn("Gemini returned non-OK status", response.status);
      return parseProductSearchFallback(description);
    }

    const result = await response.json();

    // Extract text from known shapes; fallback to stringify
    const candidate = result?.candidates?.[0];
    let text =
      candidate?.content?.parts?.[0]?.text || candidate?.output?.[0]?.content?.text || String(candidate || "{}");

    // Try parse JSON directly, otherwise try to extract JSON substring.
    try {
      const parsed = JSON.parse(text);
      return sanitizeParsedCriteria(parsed, description);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          return sanitizeParsedCriteria(parsed, description);
        } catch (err) {
          console.warn("Failed to parse extracted JSON from Gemini response", err);
          return parseProductSearchFallback(description);
        }
      }
      return parseProductSearchFallback(description);
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn("parseProductSearchWithGemini error", err?.message || err);
    return parseProductSearchFallback(description);
  }
}

/**
 * Ensure parsed criteria has expected shapes and normalized values.
 */
function sanitizeParsedCriteria(parsed, description) {
  if (!parsed || typeof parsed !== "object") {
    return parseProductSearchFallback(description);
  }

  const result = {
    keywords: normalizeArray(parsed.keywords).map((k) => normalizeText(String(k))),
    origins: normalizeArray(parsed.origins).map((o) => normalizeText(String(o))),
    categories: normalizeArray(parsed.categories).map((c) => normalizeText(String(c))),
    minPrice: toNullableNumber(parsed.minPrice ?? null),
    maxPrice: toNullableNumber(parsed.maxPrice ?? null)
  };

  return result;
}

/**
 * Phân tích chuỗi tìm kiếm đơn giản cục bộ:
 * - Chuẩn hóa text, loại bỏ dấu
 * - Trích số để làm min/max price
 * - Tách từ khoá và loại bỏ stop words
 */
function parseProductSearchFallback(description) {
  const normalized = normalizeText(description);
  const numbers = [...normalized.matchAll(/\d[\d.]*(?:\s*(?:k|nghin|ngan|tr|trieu))?/g)]
    .map((match) => parsePriceToken(match[0]))
    .filter((value) => Number.isFinite(value));
  const priceCriteria = parsePriceCriteria(normalized, numbers);
  const stopWords = new Set([
    "cac",
    "loai",
    "moi",
    "hom",
    "nay",
    "co",
    "xuat",
    "xu",
    "tu",
    "gia",
    "ca",
    "den",
    "va",
    "san",
    "pham"
  ]);
  const keywords = normalized
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));

  return {
    keywords,
    origins: [],
    categories: [],
    minPrice: priceCriteria.minPrice,
    maxPrice: priceCriteria.maxPrice
  };
}

function parsePriceCriteria(normalized, numbers) {
  if (numbers.length === 0) {
    return { minPrice: null, maxPrice: null };
  }

  const firstPrice = numbers[0];
  const secondPrice = numbers[1] ?? null;
  const hasUpperBound =
    /\b(nho hon|duoi|toi da|khong qua|be hon|it hon|thap hon|<=|<)\b/.test(normalized);
  const hasLowerBound =
    /\b(lon hon|tren|toi thieu|tu|cao hon|>=|>)\b/.test(normalized);

  if (hasUpperBound && !hasLowerBound) {
    return { minPrice: null, maxPrice: firstPrice };
  }

  if (hasLowerBound && !hasUpperBound) {
    return { minPrice: firstPrice, maxPrice: null };
  }

  return {
    minPrice: firstPrice,
    maxPrice: secondPrice
  };
}

function parsePriceToken(token) {
  const normalized = String(token || "").trim();
  const number = Number((normalized.match(/\d[\d.]*/) || [""])[0].replace(/\./g, ""));
  if (!Number.isFinite(number)) {
    return null;
  }

  if (/(?:\d|\s)(k|nghin|ngan)\b/.test(normalized)) {
    return number * 1000;
  }

  if (/(?:\d|\s)(tr|trieu)\b/.test(normalized)) {
    return number * 1000000;
  }

  return number;
}

/**
 * Chuẩn hoá criteria kết quả từ parser: đảm bảo keywords/origins/categories là mảng,
 * chuẩn hoá min/max price và hoán đổi nếu ngược.
 */
function normalizeCriteria(criteria, description) {
  const fallback = parseProductSearchFallback(description);
  const inferred = inferCriteriaFromDescription(description);
  const keywords = normalizeKeywords(
    normalizeArray(criteria?.keywords).length ? normalizeArray(criteria.keywords) : fallback.keywords,
    inferred
  );
  const categories = normalizeCategories(mergeUnique(normalizeArray(criteria?.categories), inferred.categories));
  const origins = normalizeOrigins(mergeUnique(normalizeArray(criteria?.origins), inferred.origins), categories);
  let minPrice = toNullableNumber(criteria?.minPrice ?? fallback.minPrice ?? inferred.minPrice);
  let maxPrice = toNullableNumber(criteria?.maxPrice ?? fallback.maxPrice ?? inferred.maxPrice);

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return { keywords, origins, categories, minPrice, maxPrice };
}

function inferCriteriaFromDescription(description) {
  const text = normalizeText(description);
  const categories = [];
  const origins = [];
  let minPrice = null;
  let maxPrice = null;

  if (/\b(viet nam|viet|noi dia|trong nuoc|hang viet)\b/.test(text)) {
    categories.push("Trai cay Viet Nam");
  }

  if (/\b(nhap khau|ngoai nhap|hang ngoai|my|uc|new zealand|han quoc|nhat ban|trung quoc)\b/.test(text)) {
    categories.push("Trai cay nhap khau");
  }

  if (/\b(qua tang|lam qua|gio qua|hop qua|bieng tang)\b/.test(text)) {
    categories.push("Qua tang trai cay");
  }

  if (/\b(cao cap|premium|sang|ngon nhat)\b/.test(text)) {
    categories.push("Trai cay cao cap");
    minPrice = 100000;
  }

  if (/\b(gia re|re|tiet kiem|binh dan)\b/.test(text)) {
    maxPrice = 100000;
  }

  if (/\b(da lat|lam dong)\b/.test(text)) {
    origins.push("Da Lat", "Lam Dong");
  }

  return { categories, origins, minPrice, maxPrice };
}
/**
 * Lọc danh sách sản phẩm dựa trên criteria đã chuẩn hoá:
 * - So khớp keyword, origin, category
 * - Kiểm tra khoảng giá và stock
 */
function suggestProducts(products, criteria) {
  const strictMatches = filterSuggestedProducts(products, criteria);
  if (strictMatches.length > 0) {
    return strictMatches;
  }

  if (hasHardIntent(criteria)) {
    return [];
  }

  return rankSuggestedProducts(products, criteria);
}

function hasHardIntent(criteria) {
  return criteria.categories.length > 0 || criteria.origins.length > 0 || criteria.minPrice !== null || criteria.maxPrice !== null;
}
function filterSuggestedProducts(products, criteria) {
  return products
    .filter((product) => {
      const text = normalizeText(`${product.name} ${product.description} ${product.category} ${product.origin}`);
      const hasContext = criteria.categories.length > 0 || criteria.origins.length > 0;
      const keywordMatch =
        hasContext ||
        criteria.keywords.length === 0 ||
        criteria.keywords.some((keyword) => text.includes(normalizeText(keyword)));
      const originMatch =
        criteria.origins.length === 0 ||
        criteria.origins.some((origin) => normalizeText(product.origin || "").includes(normalizeText(origin)));
      const categoryMatch =
        criteria.categories.length === 0 ||
        criteria.categories.some((category) => categoryMatches(product.category, category));
      const minMatch = criteria.minPrice === null || Number(product.price) >= criteria.minPrice;
      const maxMatch = criteria.maxPrice === null || Number(product.price) <= criteria.maxPrice;
      return keywordMatch && originMatch && categoryMatch && minMatch && maxMatch && Number(product.stock) > 0;
    })
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
}

function rankSuggestedProducts(products, criteria) {
  return products
    .filter((product) => Number(product.stock) > 0)
    .map((product) => {
      const text = normalizeText(`${product.name} ${product.description} ${product.category} ${product.origin}`);
      const keywordScore = criteria.keywords.reduce(
        (score, keyword) => score + (text.includes(normalizeText(keyword)) ? 3 : 0),
        0
      );
      const originScore = criteria.origins.some((origin) =>
        normalizeText(product.origin || "").includes(normalizeText(origin))
      )
        ? 2
        : 0;
      const categoryScore = criteria.categories.some((category) =>
        categoryMatches(product.category, category)
      )
        ? 2
        : 0;
      const minPenalty = criteria.minPrice !== null && Number(product.price) < criteria.minPrice ? -2 : 0;
      const maxPenalty = criteria.maxPrice !== null && Number(product.price) > criteria.maxPrice ? -2 : 0;

      return {
        product,
        score: keywordScore + originScore + categoryScore + minPenalty + maxPenalty + Math.min(Number(product.stock || 0), 20) / 100
      };
    })
    .filter((item) => item.score > 0 || criteria.keywords.length === 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

/**
 * Chuẩn hoá thành mảng chuỗi đã trim; trả [] nếu falsy.
 */
function normalizeArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeKeywords(keywords, inferred) {
  const genericWords = new Set([
    "trai",
    "cay",
    "san",
    "pham",
    "loai",
    "cac",
    "viet",
    "nam",
    "nhap",
    "khau",
    "de",
    "xuat",
    "goi",
    "y",
    "tim",
    "muon",
    "can"
  ]);
  const genericPhrases = new Set(["trai cay", "trai cay viet nam", "trai cay nhap khau"]);
  const hasContext = inferred.categories.length > 0 || inferred.origins.length > 0;
  return keywords.filter((keyword) => {
    if (!hasContext) {
      return true;
    }

    const normalized = normalizeText(keyword);
    return !genericWords.has(normalized) && !genericPhrases.has(normalized);
  });
}

function normalizeCategories(categories) {
  const specificCategories = categories.filter((category) => normalizeText(category) !== "trai cay");
  return specificCategories.length > 0 ? specificCategories : categories;
}

function normalizeOrigins(origins, categories) {
  const hasVietnamCategory = categories.some((category) => normalizeText(category).includes("viet nam"));
  if (!hasVietnamCategory) {
    return origins;
  }

  return origins.filter((origin) => !["viet nam", "viet", "trong nuoc", "noi dia"].includes(normalizeText(origin)));
}

function categoryMatches(productCategory, requestedCategory) {
  const product = normalizeText(productCategory);
  const requested = normalizeText(requestedCategory);

  if (product.includes(requested) || requested.includes(product)) {
    return true;
  }

  return categoryAliases(requested).some((alias) => product.includes(alias));
}

function categoryAliases(category) {
  if (category.includes("qua tang") || category.includes("gio qua") || category.includes("hop qua")) {
    return ["qua tang", "gio qua", "hop qua"];
  }

  if (category.includes("viet nam") || category.includes("noi dia") || category.includes("trong nuoc")) {
    return ["viet nam", "noi dia"];
  }

  if (category.includes("nhap khau") || category.includes("ngoai nhap")) {
    return ["nhap khau", "ngoai nhap"];
  }

  return [category];
}

function mergeUnique(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

/**
 * Chuyển giá trị sang số hữu hạn hoặc trả về null nếu không phải số hợp lệ.
 */
function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Chuẩn hoá text để so sánh: lowercase, tách dấu (NFD) và loại bỏ dấu.
 */
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

app.delete("/api/admin/products/:productId", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${productBaseUrl}/admin/products/${req.params.productId}`, { body: false })
);

app.post("/api/products/seed", async (_req, res, next) => {
  try {
    const response = await fetch(`${productBaseUrl}/products/seed`, {
      method: "POST"
    });

    res.status(response.status).json(await response.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/inventory", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${inventoryBaseUrl}/admin/inventory`, { body: false })
);

app.patch("/api/admin/inventory/:productId", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${inventoryBaseUrl}/admin/inventory/${req.params.productId}`)
);

app.post("/api/admin/uploads/product-image", requireAdmin, async (req, res, next) => {
  try {
    const missingCloudinaryConfig = [
      ["CLOUDINARY_CLOUD_NAME", config.cloudinaryCloudName],
      ["CLOUDINARY_API_KEY", config.cloudinaryApiKey],
      ["CLOUDINARY_API_SECRET", config.cloudinaryApiSecret]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingCloudinaryConfig.length > 0) {
      res.status(503).json({
        error: "Cloudinary is not configured",
        missing: missingCloudinaryConfig
      });
      return;
    }

    const { dataUrl, fileName } = req.body || {};
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      res.status(400).json({ error: "Invalid image data" });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = config.cloudinaryFolder;
    const safeFileName = fileName ? fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") : "";
    const publicId = safeFileName ? `${safeFileName}-${timestamp}` : undefined;
    const signatureParams = { folder, timestamp };
    if (publicId) {
      signatureParams.public_id = publicId;
    }
    const signatureBase = Object.keys(signatureParams)
      .sort()
      .map((key) => `${key}=${signatureParams[key]}`)
      .join("&");
    const signature = createHash("sha1")
      .update(`${signatureBase}${config.cloudinaryApiSecret}`)
      .digest("hex");

    const form = new FormData();
    form.append("file", dataUrl);
    form.append("api_key", config.cloudinaryApiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);
    if (publicId) {
      form.append("public_id", publicId);
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/upload`, {
      method: "POST",
      body: form
    });
    const responseText = await response.text();
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { error: { message: responseText } };
    }
    if (!response.ok) {
      res.status(response.status).json({
        error: result.error?.message || "Cloudinary upload failed"
      });
      return;
    }

    res.json({
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", async (req, res, next) => {
  try {
    const response = await fetch(`${orderBaseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    res.status(response.status).json(await response.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/:id", async (req, res, next) => {
  try {
    const response = await fetch(`${orderBaseUrl}/orders/${req.params.id}`);
    res.status(response.status).json(await response.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/my/orders", requireUser, (req, res, next) =>
  proxyJson(req, res, next, `${orderBaseUrl}/users/${req.user.sub}/orders`, { body: false })
);

app.get("/api/admin/orders", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${orderBaseUrl}/admin/orders`, { body: false })
);

app.patch("/api/admin/orders/:orderId/status", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${orderBaseUrl}/admin/orders/${req.params.orderId}/status`)
);

app.get("/api/admin/reports", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${orderBaseUrl}/admin/reports`, { body: false })
);

// ========== ADMIN USER MANAGEMENT ==========

/**
 * Danh sách tất cả user trong hệ thống.
 * Admin only.
 */
app.get("/api/admin/users", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/admin/users`, { body: false })
);

/**
 * Chi tiết một user theo userId.
 * Admin only.
 */
app.get("/api/admin/users/:userId", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/admin/users/${req.params.userId}`, { body: false })
);

/**
 * Tạo user mới (admin tạo cho khách).
 * Admin only.
 */
app.post("/api/admin/users", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/admin/users`)
);

/**
 * Cập nhật thông tin user (admin cập nhật cho user khác).
 * Admin only.
 */
app.patch("/api/admin/users/:userId", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/admin/users/${req.params.userId}`)
);

/**
 * Xóa user.
 * Admin only.
 */
app.delete("/api/admin/users/:userId", requireAdmin, (req, res, next) =>
  proxyJson(req, res, next, `${userBaseUrl}/admin/users/${req.params.userId}`, { body: false })
);

app.use(errorHandler);

app.listen(config.gatewayPort, () => {
  console.log(`gateway listening on ${config.gatewayPort}`);
});
