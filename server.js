require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const fileUpload = require("express-fileupload");

const app = express();
const port = 3000;

// Unified JWT_SECRET for consistent token handling
const JWT_SECRET = "your-secret-key"; // Replace with a secure key in production

// Middleware
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5500",
      "http://localhost:5501",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(fileUpload());

// Database connection
const shopDb = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Trung362004@",
  database: "shop_db",
});

shopDb.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối shop_db:", err);
    return;
  }
  console.log("Đã kết nối thành công đến shop_db");
});

// Authentication middleware (combined logging from friend's file with your simplicity)
const authenticateToken = (req, res, next) => {
  console.log("[AUTH] Running authenticateToken middleware");
  const authHeader = req.headers["authorization"];
  console.log("[AUTH] Auth header:", authHeader);

  if (!authHeader) {
    console.log("[AUTH] No authorization header found");
    return res
      .status(401)
      .json({ message: "Không tìm thấy header Authorization" });
  }

  const token = authHeader.split(" ")[1];
  console.log(
    "[AUTH] Token extracted:",
    token ? token.substring(0, 20) + "..." : "none"
  );

  if (!token) {
    console.log("[AUTH] No token found in Authorization header");
    return res.status(401).json({ message: "Không tìm thấy token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("[AUTH] Decoded user:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("[AUTH] Token verification error:", error);
    return res
      .status(403)
      .json({ message: "Token không hợp lệ", error: error.message });
  }
};

// API đăng ký (same in both files)
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  try {
    const [existingUsers] = await shopDb
      .promise()
      .query("SELECT * FROM users WHERE username = ? OR email = ?", [
        username,
        email,
      ]);

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message:
          existingUsers[0].username === username
            ? "Tên đăng nhập đã tồn tại"
            : "Email đã được sử dụng",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await shopDb
      .promise()
      .query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [
        username,
        email,
        hashedPassword,
      ]);

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API đăng nhập (merged, using single JWT_SECRET)
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  try {
    const [users] = await shopDb
      .promise()
      .query("SELECT * FROM users WHERE username = ?", [username]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Tên đăng nhập không tồn tại" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mật khẩu không chính xác" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "user",
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "user",
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API liên hệ (same in both files)
app.post("/api/contact", authenticateToken, async (req, res) => {
  const { name, email, phone, message } = req.body;
  const userId = req.user.userId;

  try {
    const [users] = await shopDb
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    await shopDb
      .promise()
      .query(
        "INSERT INTO contacts (user_id, name, email, phone, message) VALUES (?, ?, ?, ?, ?)",
        [userId, name, email, phone, message]
      );

    res.status(201).json({
      message: "Gửi liên hệ thành công",
      contact: { name, email, phone, message },
    });
  } catch (error) {
    console.error("Lỗi gửi liên hệ:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy danh sách sản phẩm (merged: your processing + friend's filters)
app.get("/api/products", async (req, res) => {
  const { category, brand, search, inventory, price, priceRange } = req.query;
  console.log(
    `[SERVER] Fetching products with category: ${category}, brand: ${brand}, search: ${search}, inventory: ${inventory}, price: ${price}, priceRange: ${priceRange}`
  );

  let query = "SELECT * FROM products WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (brand) {
    query += " AND brand = ?";
    params.push(brand);
  }

  if (inventory) {
    if (inventory === "in_stock") {
      query += " AND inventory > 0";
    } else if (inventory === "out_of_stock") {
      query += " AND inventory <= 0";
    } else if (inventory === "low_stock") {
      query += " AND inventory <= min_inventory AND inventory > 0";
    }
  }

  if (price && priceRange) {
    const priceNum = parseFloat(price);
    const range = parseFloat(priceRange);
    query += " AND price BETWEEN ? AND ?";
    params.push(priceNum * (1 - range / 100), priceNum * (1 + range / 100));
  }

  query += " ORDER BY id DESC";

  try {
    const [results] = await shopDb.promise().query(query, params);
    console.log(`[SERVER] Found ${results.length} products`);

    const processedResults = results.map((product) => {
      let images = [];
      if (product.images) {
        try {
          images = JSON.parse(product.images);
        } catch (e) {
          console.error("[SERVER] Error parsing images:", e);
          images = [];
        }
      }
      if (images.length === 0) {
        images.push("images/placeholder.jpg");
      }

      let specifications = [];
      if (product.specifications) {
        try {
          specifications = JSON.parse(product.specifications);
        } catch (e) {
          console.error("[SERVER] Error parsing specifications:", e);
          specifications = [];
        }
      }

      const formattedPrice = new Intl.NumberFormat("vi-VN").format(
        product.price
      );

      return {
        ...product,
        images,
        specifications,
        formattedPrice: formattedPrice + "đ",
      };
    });

    res.json(processedResults);
  } catch (error) {
    console.error("[SERVER] Error fetching products:", error);
    res.status(500).json({ error: "Lỗi máy chủ", details: error.message });
  }
});

// API lấy thông tin chi tiết sản phẩm theo ID (your version, with processing)
app.get("/api/product/:id", async (req, res) => {
  const productId = req.params.id;
  console.log(`[SERVER] Fetching product with ID: ${productId}`);

  const query = "SELECT * FROM products WHERE id = ?";

  try {
    // Lấy thông tin sản phẩm
    const [results] = await shopDb.promise().query(query, [productId]);
    if (results.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }
    const product = results[0];
    let images = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
      } catch (e) {
        console.error("[SERVER] Error parsing images:", e);
        images = [];
      }
    }
    if (images.length === 0) {
      images.push("images/placeholder.jpg");
    }
    let specifications = [];
    if (product.specifications) {
      try {
        specifications = JSON.parse(product.specifications);
      } catch (e) {
        console.error("[SERVER] Error parsing specifications:", e);
        specifications = [];
      }
    }
    const formattedPrice = new Intl.NumberFormat("vi-VN").format(product.price);

    // Lấy số lượng đã bán từ order_details
    const [soldRows] = await shopDb.promise().query(
      `SELECT SUM(od.quantity) AS quantity_sold 
       FROM order_details od 
       INNER JOIN orders o ON od.order_id = o.id 
       WHERE od.product_id = ? AND o.status = 'completed'`,
      [productId]
    );
    const quantity_sold = soldRows[0].quantity_sold || 0;

    const processedProduct = {
      ...product,
      images,
      specifications,
      formattedPrice: formattedPrice + "đ",
      quantity_sold,
    };
    res.json(processedProduct);
  } catch (error) {
    console.error("[SERVER] Error processing product data:", error);
    res
      .status(500)
      .json({ error: "Lỗi xử lý dữ liệu sản phẩm", details: error.message });
  }
});

// API tìm kiếm sản phẩm (enhanced version with price search)
app.get("/api/search", (req, res) => {
  const terms = req.query.terms
    ? req.query.terms
        .split(" ")
        .map((term) => term.trim())
        .filter(Boolean)
    : [];

  let query =
    "SELECT id, name, brand, price, category, images FROM products WHERE ";
  const conditions = [];
  const params = [];

  // Phân loại terms thành số (giá) và text
  const priceTerms = [];
  const textTerms = [];
  for (const term of terms) {
    if (/^\d+(\.\d+)?$/.test(term)) {
      priceTerms.push(parseFloat(term));
    } else {
      textTerms.push(term);
    }
  }

  // Điều kiện text
  if (textTerms.length > 0) {
    const textConds = textTerms.map(
      () =>
        "(LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(description) LIKE ?)"
    );
    conditions.push(textConds.join(" AND "));
    textTerms.forEach((term) => {
      params.push(
        `%${term.toLowerCase()}%`,
        `%${term.toLowerCase()}%`,
        `%${term.toLowerCase()}%`
      );
    });
  } else {
    conditions.push("1=1");
  }

  // Điều kiện giá (nếu có nhiều số, chỉ lấy số đầu tiên làm khoảng giá)
  if (priceTerms.length > 0) {
    // Nếu muốn hỗ trợ nhiều khoảng giá, có thể dùng OR thay vì AND
    // Ở đây chỉ lấy số đầu tiên
    const price = priceTerms[0];
    conditions.push("price BETWEEN ? AND ?");
    params.push(price * 0.9, price * 1.1); // ±10%
  }

  query += conditions.join(" AND ");

  shopDb.query(query, params, (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn SQL:", err);
      return res
        .status(500)
        .json({ error: "Lỗi máy chủ", details: err.message });
    }

    const processedResults = results.map((product) => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    }));

    res.json(processedResults);
  });
});

// API lấy danh sách brand (merged: supports category filter)
app.get("/api/brands", (req, res) => {
  const { category } = req.query;

  let query = "SELECT DISTINCT brand FROM products WHERE 1=1";
  const params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY brand";

  shopDb.query(query, params, (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn SQL:", err);
      return res
        .status(500)
        .json({ error: "Lỗi máy chủ", details: err.message });
    }

    const brands = results.map((row) => row.brand);
    res.json(brands);
  });
});

// API lấy danh sách danh mục (from friend's file)
app.get("/api/categories", async (req, res) => {
  try {
    const [categories] = await shopDb
      .promise()
      .query(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''"
      );
    res.json(categories.map((row) => row.category));
  } catch (error) {
    console.error("Lỗi lấy danh sách danh mục:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy 10 sản phẩm mới nhất (your version)
app.get("/api/products/latest", (req, res) => {
  const query = "SELECT * FROM products ORDER BY id DESC LIMIT 10";
  shopDb.query(query, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Lỗi truy vấn database", details: err.message });
    const processedResults = results.map((product) => {
      let images = [];
      try {
        images = product.images ? JSON.parse(product.images) : [];
      } catch (e) {
        images = [];
      }
      if (images.length === 0) images.push("images/placeholder.jpg");
      const formattedPrice =
        new Intl.NumberFormat("vi-VN").format(product.price) + "đ";
      return { ...product, images, formattedPrice };
    });
    res.json(processedResults);
  });
});

// API lấy 10 sản phẩm hot (your version)
app.get("/api/products/hot", (req, res) => {
  const query = "SELECT * FROM products ORDER BY id DESC LIMIT 10";
  shopDb.query(query, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Lỗi truy vấn database", details: err.message });
    const processedResults = results.map((product) => {
      let images = [];
      try {
        images = product.images ? JSON.parse(product.images) : [];
      } catch (e) {
        images = [];
      }
      if (images.length === 0) images.push("images/placeholder.jpg");
      const formattedPrice =
        new Intl.NumberFormat("vi-VN").format(product.price) + "đ";
      return { ...product, images, formattedPrice };
    });
    res.json(processedResults);
  });
});

// API debug products (same in both files)
app.get("/api/debug/products", (req, res) => {
  console.log("[SERVER] Debug: Checking products table");

  shopDb.query("SELECT COUNT(*) as count FROM products", (err, results) => {
    if (err) {
      console.error("[SERVER] Debug: Error querying products count:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }

    const count = results[0].count;
    console.log(`[SERVER] Debug: Found ${count} products in database`);

    shopDb.query(
      "SELECT id, name, brand, category FROM products LIMIT 5",
      (err, sampleProducts) => {
        if (err) {
          return res.status(500).json({
            error: "Error getting sample products",
            count: count,
            details: err.message,
          });
        }

        res.json({
          status: "success",
          connection: "ok",
          productCount: count,
          sampleProducts: sampleProducts,
        });
      }
    );
  });
});

// API lấy danh sách bài viết mới nhất (fixed duplicate in your file)
app.get("/api/news/latest", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 5;

  const query =
    "SELECT id, title, content, date_posted, image, banner_right FROM news ORDER BY date_posted DESC LIMIT ? OFFSET ?";
  shopDb.query(query, [limit, offset], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn SQL:", err);
      return res
        .status(500)
        .json({ error: "Lỗi truy vấn database", details: err.message });
    }

    const processedResults = results.map((news) => {
      let image = news.image || "images/3K IMG/News/placeholder.jpg";
      return { ...news, image };
    });

    res.json(processedResults);
  });
});

// API lấy bài viết theo ID (same in both files)
app.get("/api/news/:id", (req, res) => {
  const newsId = req.params.id;

  if (!newsId) {
    return res
      .status(400)
      .json({ error: "Không có ID bài viết được cung cấp" });
  }

  const query = "SELECT * FROM news WHERE id = ?";
  shopDb.query(query, [newsId], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn SQL:", err);
      return res
        .status(500)
        .json({ error: "Lỗi truy vấn database", details: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    res.json(results[0]);
  });
});

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "images", "3K IMG", "News");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// API tải ảnh lên (same in both files)
app.post("/api/upload-image", authenticateToken, (req, res) => {
  console.log("[SERVER] POST /api/upload-image, userId:", req.user.userId);
  if (!req.files || !req.files.file) {
    console.error("[SERVER] No file uploaded");
    return res.status(400).json({ message: "Không có file được tải lên" });
  }

  const file = req.files.file;
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    console.error("[SERVER] Invalid file type:", file.mimetype);
    return res.status(400).json({ message: "Chỉ hỗ trợ JPG, PNG, GIF" });
  }

  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadDir, fileName);

  file.mv(filePath, (err) => {
    if (err) {
      console.error("[SERVER] Lỗi lưu file:", err.message);
      return res
        .status(500)
        .json({ message: "Lỗi lưu file", error: err.message });
    }
    const imageUrl = `images/3K IMG/News/${fileName}`;
    console.log("[SERVER] File uploaded:", imageUrl);
    res.json({ location: imageUrl });
  });
});

// API đăng bài viết mới (same in both files)
app.post("/api/news", authenticateToken, async (req, res) => {
  const { title, content, date_posted, image, banner_right } = req.body;
  const userId = req.user.userId;
  console.log("[SERVER] POST /api/news, userId:", userId, "body:", req.body);

  if (!title || !content || !date_posted) {
    console.error("[SERVER] Missing required fields");
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ tiêu đề, nội dung và ngày đăng" });
  }

  try {
    const [users] = await shopDb
      .promise()
      .query("SELECT id FROM users WHERE id = ?", [userId]);
    console.log("[SERVER] Users found:", users);
    if (users.length === 0) {
      console.error("[SERVER] User not found:", userId);
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const formattedDatePosted = `${date_posted} 00:00:00`;
    console.log("[SERVER] Inserting news:", {
      title,
      content,
      userId,
      formattedDatePosted,
      image,
      banner_right,
    });

    const [result] = await shopDb
      .promise()
      .query(
        "INSERT INTO news (title, content, user_id, date_posted, image, banner_right) VALUES (?, ?, ?, ?, ?, ?)",
        [
          title,
          content,
          userId,
          formattedDatePosted,
          image || null,
          banner_right || null,
        ]
      );

    console.log("[SERVER] News inserted, insertId:", result.insertId);
    await shopDb.promise().query("COMMIT");
    res
      .status(201)
      .json({ message: "Đăng bài viết thành công", insertId: result.insertId });
  } catch (error) {
    console.error("[SERVER] Lỗi đăng bài viết:", error.message);
    await shopDb.promise().query("ROLLBACK");
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API sửa bài viết (same in both files)
app.put("/api/news/:id", authenticateToken, async (req, res) => {
  const newsId = req.params.id;
  const { title, content, date_posted, image, banner_right } = req.body;
  const userId = req.user.userId;
  console.log(
    "[SERVER] PUT /api/news/:id, id:",
    newsId,
    "userId:",
    userId,
    "body:",
    req.body
  );

  if (!title || !content || !date_posted) {
    console.error("[SERVER] Missing required fields");
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ tiêu đề, nội dung và ngày đăng" });
  }

  try {
    const [users] = await shopDb
      .promise()
      .query("SELECT id FROM users WHERE id = ?", [userId]);
    console.log("[SERVER] Users found:", users);
    if (users.length === 0) {
      console.error("[SERVER] User not found:", userId);
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const [news] = await shopDb
      .promise()
      .query("SELECT id FROM news WHERE id = ?", [newsId]);
    console.log("[SERVER] News found:", news);
    if (news.length === 0) {
      console.error("[SERVER] News not found:", newsId);
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    const formattedDatePosted = `${date_posted} 00:00:00`;
    console.log("[SERVER] Updating news:", {
      title,
      content,
      formattedDatePosted,
      image,
      banner_right,
      newsId,
    });

    await shopDb
      .promise()
      .query(
        "UPDATE news SET title = ?, content = ?, date_posted = ?, image = ?, banner_right = ? WHERE id = ?",
        [
          title,
          content,
          formattedDatePosted,
          image || null,
          banner_right || null,
          newsId,
        ]
      );

    console.log("[SERVER] News updated, newsId:", newsId);
    await shopDb.promise().query("COMMIT");
    res.json({ message: "Cập nhật bài viết thành công", newsId });
  } catch (error) {
    console.error("[SERVER] Lỗi cập nhật bài viết:", error.message);
    await shopDb.promise().query("ROLLBACK");
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API xóa bài viết (same in both files)
app.delete("/api/news/:id", authenticateToken, async (req, res) => {
  const newsId = req.params.id;
  const userId = req.user.userId;
  console.log("[SERVER] DELETE /api/news/:id, id:", newsId, "userId:", userId);

  try {
    const [users] = await shopDb
      .promise()
      .query("SELECT id FROM users WHERE id = ?", [userId]);
    console.log("[SERVER] Users found:", users);
    if (users.length === 0) {
      console.error("[SERVER] User not found:", userId);
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const [news] = await shopDb
      .promise()
      .query("SELECT id FROM news WHERE id = ?", [newsId]);
    console.log("[SERVER] News found:", news);
    if (news.length === 0) {
      console.error("[SERVER] News not found:", newsId);
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    await shopDb.promise().query("DELETE FROM news WHERE id = ?", [newsId]);
    console.log("[SERVER] News deleted, newsId:", newsId);
    await shopDb.promise().query("COMMIT");
    res.json({ message: "Xóa bài viết thành công", newsId });
  } catch (error) {
    console.error("[SERVER] Lỗi xóa bài viết:", error.message);
    await shopDb.promise().query("ROLLBACK");
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Dashboard API đã được chuyển sang routes/admin.js

// API lấy thông tin người dùng (same in both files)
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching user profile for ID:", req.user.userId);
    const [users] = await shopDb
      .promise()
      .query(
        "SELECT id, username, email, fullname, phone, address, role FROM users WHERE id = ?",
        [req.user.userId]
      );
    console.log("Query result:", users);

    if (users.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thông tin người dùng" });
    }

    const user = users[0];
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Lỗi khi lấy thông tin người dùng" });
  }
});

// API cập nhật thông tin profile (same in both files)
app.put("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const { fullname, phone, address } = req.body;
    const userId = req.user.userId;

    const [result] = await shopDb
      .promise()
      .query(
        "UPDATE users SET fullname = ?, phone = ?, address = ? WHERE id = ?",
        [fullname, phone, address, userId]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({ message: "Cập nhật thông tin thành công" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật thông tin người dùng" });
  }
});

// API lấy danh sách khách hàng (from friend's file)
app.get("/api/admin/customers", authenticateToken, async (req, res) => {
  try {
    const { search, tier, sort } = req.query;
    let query = `
      SELECT u.*,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COUNT(DISTINCT o.id) as total_orders,
        0 as points
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'user'
    `;

    const params = [];

    if (search) {
      query += ` AND (u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY u.id`;

    if (tier) {
      query += ` HAVING points >= ?`;
      params.push(tier * 1000);
    }

    if (sort) {
      switch (sort) {
        case "points":
          query += ` ORDER BY points DESC`;
          break;
        case "orders":
          query += ` ORDER BY total_orders DESC`;
          break;
        case "spent":
          query += ` ORDER BY total_spent DESC`;
          break;
        default:
          query += ` ORDER BY u.id DESC`;
      }
    } else {
      query += ` ORDER BY u.id DESC`;
    }

    const [customers] = await shopDb.promise().query(query, params);
    res.json(customers);
  } catch (error) {
    console.error("Lỗi lấy danh sách khách hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy chi tiết khách hàng (from friend's file)
app.get("/api/admin/customers/:id", authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id;

    const [customers] = await shopDb.promise().query(
      `SELECT u.*,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COUNT(DISTINCT o.id) as total_orders,
        0 as points
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.id = ? AND u.role = 'user'
      GROUP BY u.id`,
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    const customer = customers[0];

    const [orders] = await shopDb.promise().query(
      `SELECT id, created_at, total_amount, status
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customerId]
    );

    customer.orders = orders;
    res.json(customer);
  } catch (error) {
    console.error("Lỗi lấy thông tin khách hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Removed duplicate roles API - now handled by admin routes

// API cập nhật vai trò người dùng (from friend's file)
app.put(
  "/api/admin/users/:userId/role",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const { userId } = req.params;
      const { role } = req.body;

      const validRoles = ["user", "admin", "super_admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Vai trò không hợp lệ" });
      }

      await shopDb
        .promise()
        .query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);

      res.json({ success: true, message: "Cập nhật vai trò thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật vai trò:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: error.message,
      });
    }
  }
);

// API báo cáo tổng quan (from friend's file)
app.get("/api/admin/reports/overview", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const today = new Date().toISOString().split("T")[0];

    const [todayRevenue] = await shopDb
      .promise()
      .query(
        "SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE DATE(created_at) = ?",
        [today]
      );

    const [todayOrders] = await shopDb
      .promise()
      .query(
        "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?",
        [today]
      );

    const [newCustomers] = await shopDb
      .promise()
      .query(
        "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ? AND role = 'user'",
        [today]
      );

    res.json({
      today_revenue: todayRevenue[0].revenue,
      today_orders: todayOrders[0].count,
      new_customers: newCustomers[0].count,
      conversion_rate: 2.5,
    });
  } catch (error) {
    console.error("Lỗi lấy báo cáo tổng quan:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
});

// API báo cáo doanh thu (from friend's file)
app.get("/api/admin/reports/revenue", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const [revenueData] = await shopDb.promise().query(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    const labels = revenueData.map((item) => item.date);
    const values = revenueData.map((item) => item.revenue);

    res.json({ labels, values });
  } catch (error) {
    console.error("Lỗi lấy báo cáo doanh thu:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
});

// API báo cáo sản phẩm bán chạy (from friend's file)
app.get(
  "/api/admin/reports/top-products",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const [topProducts] = await shopDb.promise().query(
        `SELECT p.name, SUM(od.quantity) as quantity, SUM(od.quantity * od.price) as revenue
       FROM order_details od
       JOIN products p ON od.product_id = p.id
       JOIN orders o ON od.order_id = o.id
       WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY p.id, p.name
       ORDER BY quantity DESC
       LIMIT 5`
      );

      const productsWithGrowth = topProducts.map((product) => ({
        ...product,
        growth: Math.floor(Math.random() * 20) - 5,
      }));

      res.json(productsWithGrowth);
    } catch (error) {
      console.error("Lỗi lấy báo cáo sản phẩm bán chạy:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: error.message,
      });
    }
  }
);

// API báo cáo phân khúc khách hàng (from friend's file)
app.get(
  "/api/admin/reports/customer-segments",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const segments = [
        { segment: "VIP (>10M)", value: 15 },
        { segment: "Thường xuyên (5-10M)", value: 35 },
        { segment: "Thỉnh thoảng (1-5M)", value: 30 },
        { segment: "Mới (<1M)", value: 20 },
      ];

      res.json(segments);
    } catch (error) {
      console.error("Lỗi lấy báo cáo phân khúc khách hàng:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: error.message,
      });
    }
  }
);

// API báo cáo dự báo doanh thu (from friend's file)
app.get(
  "/api/admin/reports/revenue-forecast",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const labels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"];
      const actual = [1000000, 1200000, 1100000, 1300000, 1250000, 0, 0];
      const forecast = [0, 0, 0, 0, 0, 1400000, 1500000];

      res.json({ labels, actual, forecast });
    } catch (error) {
      console.error("Lỗi lấy báo cáo dự báo doanh thu:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: error.message,
      });
    }
  }
);

// API báo cáo khách hàng tiềm năng (from friend's file)
app.get(
  "/api/admin/reports/potential-customers",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const potentialCustomers = [
        {
          id: 1,
          name: "Khách hàng A",
          potential_value: 500000,
          purchase_probability: 80,
        },
        {
          id: 2,
          name: "Khách hàng B",
          potential_value: 300000,
          purchase_probability: 60,
        },
        {
          id: 3,
          name: "Khách hàng C",
          potential_value: 200000,
          purchase_probability: 40,
        },
      ];

      res.json(potentialCustomers);
    } catch (error) {
      console.error("Lỗi lấy báo cáo khách hàng tiềm năng:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: error.message,
      });
    }
  }
);

// API lấy thông tin đơn hàng (your version)
app.get("/api/orders/:orderId", authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;

  try {
    const [orders] = await shopDb
      .promise()
      .query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [
        orderId,
        userId,
      ]);

    if (orders.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const order = orders[0];

    const [orderDetails] = await shopDb.promise().query(
      `SELECT od.*, p.name as product_name, p.images 
         FROM order_details od 
         JOIN products p ON od.product_id = p.id 
         WHERE od.order_id = ?`,
      [orderId]
    );

    order.items = orderDetails;
    res.json(order);
  } catch (error) {
    console.error("Lỗi lấy thông tin đơn hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API tạo đơn hàng (your version, with order_code)
app.post("/api/orders", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { items, payment_method, note, address_id } = req.body;

  try {
    // Kiểm tra address_id được cung cấp
    if (!address_id) {
      return res.status(400).json({
        message: "Vui lòng chọn địa chỉ giao hàng",
        missingInfo: true,
      });
    }

    // Lấy thông tin địa chỉ giao hàng
    const [addresses] = await shopDb.promise().query(
      `SELECT ua.*, p.name as province_name, d.name as district_name, w.name as ward_name
       FROM user_addresses ua
       JOIN provinces p ON ua.province_id = p.id
       JOIN districts d ON ua.district_id = d.id
       JOIN wards w ON ua.ward_id = w.id
       WHERE ua.id = ? AND ua.user_id = ?`,
      [address_id, userId]
    );

    if (addresses.length === 0) {
      return res.status(400).json({
        message: "Địa chỉ giao hàng không hợp lệ",
        missingInfo: true,
      });
    }

    const shippingAddress = addresses[0];

    let totalAmount = 0;
    for (const item of items) {
      const [products] = await shopDb
        .promise()
        .query("SELECT price FROM products WHERE id = ?", [item.product_id]);

      if (products.length === 0) {
        return res.status(400).json({ message: "Sản phẩm không tồn tại" });
      }

      totalAmount += products[0].price * item.quantity;
    }

    const shippingFee = 30000;
    const finalAmount = totalAmount + shippingFee;

    const orderCode = "ORD" + Math.floor(Math.random() * 100000000);

    const [result] = await shopDb.promise().query(
      `INSERT INTO orders (
          order_code, user_id, address_id, total_amount, shipping_fee, final_amount,
          payment_method, shipping_name, shipping_phone, shipping_address, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode,
        userId,
        address_id,
        totalAmount,
        shippingFee,
        finalAmount,
        payment_method,
        shippingAddress.name,
        shippingAddress.phone,
        `${shippingAddress.address_detail}, ${shippingAddress.ward_name}, ${shippingAddress.district_name}, ${shippingAddress.province_name}`,
        note,
      ]
    );

    const orderId = result.insertId;

    for (const item of items) {
      const [products] = await shopDb
        .promise()
        .query("SELECT price FROM products WHERE id = ?", [item.product_id]);

      await shopDb.promise().query(
        `INSERT INTO order_details (
            order_id, product_id, quantity, price, total_price
          ) VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.quantity,
          products[0].price,
          products[0].price * item.quantity,
        ]
      );
    }

    res.json({
      message: "Đặt hàng thành công",
      order_id: orderId,
      order_code: orderCode,
    });
  } catch (error) {
    console.error("Lỗi tạo đơn hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API Cart endpoints (your version)
app.post("/api/cart", authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json([]);
    }

    const productIds = items.map((item) => item.id);
    const [products] = await shopDb.promise().query(
      `SELECT id, name, price, images 
         FROM products 
         WHERE id IN (?)`,
      [productIds]
    );

    const formattedItems = items
      .map((cartItem) => {
        const product = products.find((p) => p.id === cartItem.id);
        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          image: product.images
            ? JSON.parse(product.images)[0]
            : "images/placeholder.jpg",
        };
      })
      .filter(Boolean);

    res.json(formattedItems);
  } catch (error) {
    console.error("Lỗi xử lý giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

app.post("/api/cart/clear", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    await shopDb
      .promise()
      .query("DELETE FROM cart WHERE user_id = ?", [userId]);

    res.json({ message: "Đã xóa giỏ hàng" });
  } catch (error) {
    console.error("Lỗi xóa giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy danh sách đơn hàng của người dùng (your version)
app.get("/api/orders", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  try {
    const [totalOrders] = await shopDb
      .promise()
      .query("SELECT COUNT(*) as total FROM orders WHERE user_id = ?", [
        userId,
      ]);

    const [orders] = await shopDb.promise().query(
      `SELECT * FROM orders 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    res.json({
      orders,
      total: totalOrders[0].total,
      currentPage: page,
      totalPages: Math.ceil(totalOrders[0].total / limit),
      hasMore: offset + orders.length < totalOrders[0].total,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy chi tiết đơn hàng (fixed friend's version to use order_code)
app.get("/api/orders/:orderCode", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { orderCode } = req.params;

  console.log("Request chi tiết đơn hàng:", { userId, orderCode });

  try {
    const [orders] = await shopDb
      .promise()
      .query("SELECT * FROM orders WHERE order_code = ? AND user_id = ?", [
        orderCode,
        userId,
      ]);

    console.log("Kết quả truy vấn đơn hàng:", orders);

    if (orders.length === 0) {
      console.log("Không tìm thấy đơn hàng");
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const order = orders[0];

    const [orderDetails] = await shopDb.promise().query(
      `SELECT od.*, p.name as product_name, p.images 
                FROM order_details od 
                JOIN products p ON od.product_id = p.id 
                WHERE od.order_id = ?`,
      [order.id]
    );

    console.log("Chi tiết sản phẩm:", orderDetails);

    order.order_details = orderDetails;
    res.json(order);
  } catch (error) {
    console.error("Lỗi lấy chi tiết đơn hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API xác nhận đơn hàng (your version)
app.put(
  "/api/admin/orders/:orderId/confirm",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền thực hiện thao tác này" });
      }

      const orderId = req.params.orderId;

      const [orders] = await shopDb
        .promise()
        .query("SELECT * FROM orders WHERE id = ?", [orderId]);

      if (orders.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      const order = orders[0];

      if (order.status !== "pending") {
        return res.status(400).json({
          message: `Không thể xác nhận đơn hàng với trạng thái hiện tại: ${order.status}`,
        });
      }

      // Lấy chi tiết sản phẩm trong đơn hàng
      const [orderDetails] = await shopDb
        .promise()
        .query(
          `SELECT product_id, quantity FROM order_details WHERE order_id = ?`,
          [orderId]
        );

      // Trừ tồn kho từng sản phẩm
      for (const item of orderDetails) {
        await shopDb
          .promise()
          .query(`UPDATE products SET inventory = inventory - ? WHERE id = ?`, [
            item.quantity,
            item.product_id,
          ]);
      }

      await shopDb
        .promise()
        .query(
          "UPDATE orders SET status = 'processing', updated_at = NOW() WHERE id = ?",
          [orderId]
        );

      res.json({
        message: "Xác nhận đơn hàng thành công",
        orderId: orderId,
        status: "processing",
      });
    } catch (error) {
      console.error("Lỗi xác nhận đơn hàng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// API hủy đơn hàng (processing -> cancelled)
app.put(
  "/api/admin/orders/:orderId/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền thực hiện thao tác này" });
      }

      const orderId = req.params.orderId;

      const [orders] = await shopDb
        .promise()
        .query("SELECT * FROM orders WHERE id = ?", [orderId]);

      if (orders.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      const order = orders[0];

      if (order.status !== "processing") {
        return res.status(400).json({
          message: `Chỉ có thể hủy đơn hàng ở trạng thái processing. Trạng thái hiện tại: ${order.status}`,
        });
      }

      // Lấy chi tiết sản phẩm trong đơn hàng
      const [orderDetails] = await shopDb
        .promise()
        .query(
          `SELECT product_id, quantity FROM order_details WHERE order_id = ?`,
          [orderId]
        );

      // Cộng lại tồn kho từng sản phẩm
      for (const item of orderDetails) {
        await shopDb
          .promise()
          .query(`UPDATE products SET inventory = inventory + ? WHERE id = ?`, [
            item.quantity,
            item.product_id,
          ]);
      }

      await shopDb
        .promise()
        .query(
          "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
          [orderId]
        );

      res.json({
        message: "Đã hủy đơn hàng và hoàn lại tồn kho sản phẩm",
        orderId: orderId,
        status: "cancelled",
      });
    } catch (error) {
      console.error("Lỗi hủy đơn hàng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// API lấy danh sách đơn hàng cho admin (your version)
app.get("/api/admin/orders", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập" });
  }
  const search = req.query.search || "";
  const status = req.query.status || "";
  const date = req.query.date || "";
  let where = "1=1";
  const params = [];
  if (search) {
    where +=
      " AND (order_code LIKE ? OR shipping_name LIKE ? OR shipping_phone LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += " AND status = ?";
    params.push(status);
  }
  if (date) {
    where += " AND DATE(created_at) = ?";
    params.push(date);
  }
  try {
    const [orders] = await shopDb.promise().query(
      `SELECT o.*, u.username, u.email, u.fullname as user_fullname, u.phone as user_phone,
                ua.name as address_name, ua.phone as address_phone,
                ua.address_detail, ua.province_id, ua.district_id, ua.ward_id,
                p.name as province_name, d.name as district_name, w.name as ward_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN user_addresses ua ON o.address_id = ua.id
         LEFT JOIN provinces p ON ua.province_id = p.id
         LEFT JOIN districts d ON ua.district_id = d.id
         LEFT JOIN wards w ON ua.ward_id = w.id
         WHERE ${where} ORDER BY o.created_at DESC`,
      params
    );
    res.json({ orders });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng (admin):", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy chi tiết đơn hàng cho admin (from friend's file)
app.get("/api/admin/orders/:orderId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const { orderId } = req.params;

    const [orders] = await shopDb.promise().query(
      `SELECT o.*, u.username, u.email, u.phone, u.fullname as user_fullname,
              ua.name as address_name, ua.phone as address_phone,
              ua.address_detail, ua.province_id, ua.district_id, ua.ward_id,
              p.name as province_name, d.name as district_name, w.name as ward_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN user_addresses ua ON o.address_id = ua.id
       LEFT JOIN provinces p ON ua.province_id = p.id
       LEFT JOIN districts d ON ua.district_id = d.id
       LEFT JOIN wards w ON ua.ward_id = w.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const order = orders[0];

    const [orderDetails] = await shopDb.promise().query(
      `SELECT od.*, p.name as product_name, p.images
       FROM order_details od
       LEFT JOIN products p ON od.product_id = p.id
       WHERE od.order_id = ?`,
      [orderId]
    );

    order.items = orderDetails;
    res.json(order);
  } catch (error) {
    console.error("Lỗi lấy chi tiết đơn hàng admin:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
});

// API lấy danh sách sản phẩm cho admin (from friend's file)
app.get("/api/admin/products", authenticateToken, async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const { category, brand, search, inventory } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (brand) {
      query += " AND brand = ?";
      params.push(brand);
    }

    if (inventory) {
      if (inventory === "in_stock") {
        query += " AND inventory > 0";
      } else if (inventory === "out_of_stock") {
        query += " AND inventory <= 0";
      } else if (inventory === "low_stock") {
        query += " AND inventory <= 10 AND inventory > 0";
      }
    }

    query += " ORDER BY id DESC";

    const [products] = await shopDb.promise().query(query, params);
    res.json(products);
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm admin:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API thêm sản phẩm mới (with file upload support)
app.post("/api/admin/products", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    // Xử lý dữ liệu từ FormData
    const {
      name,
      price,
      brand,
      category,
      inventory,
      min_inventory,
      description,
    } = req.body;

    if (!name || !price || !brand || !category || inventory === undefined) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc" });
    }

    // Xử lý upload hình ảnh
    let imageUrls = [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];

      // Tạo thư mục upload nếu chưa có
      const productUploadDir = path.join(__dirname, "images", "products");
      if (!fs.existsSync(productUploadDir)) {
        fs.mkdirSync(productUploadDir, { recursive: true });
      }

      for (const image of images) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedTypes.includes(image.mimetype)) {
          return res
            .status(400)
            .json({ message: "Chỉ hỗ trợ file ảnh JPG, PNG, GIF, WEBP" });
        }

        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}-${image.name}`;
        const filePath = path.join(productUploadDir, fileName);

        await image.mv(filePath);
        imageUrls.push(`images/products/${fileName}`);
      }
    }

    const imagesJson = JSON.stringify(imageUrls);
    const specificationsJson = JSON.stringify([]);

    const [result] = await shopDb.promise().query(
      `INSERT INTO products (
        name, price, brand, category, inventory, min_inventory, description, images, specifications
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        parseFloat(price),
        brand,
        category,
        parseInt(inventory),
        parseInt(min_inventory) || 10,
        description || "",
        imagesJson,
        specificationsJson,
      ]
    );

    res.json({
      message: "Thêm sản phẩm thành công",
      productId: result.insertId,
      images: imageUrls,
    });
  } catch (error) {
    console.error("Lỗi thêm sản phẩm:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API sửa sản phẩm (inferred from products.html)
app.put("/api/admin/products/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const productId = req.params.id;
    const {
      name,
      price,
      brand,
      category,
      inventory,
      min_inventory,
      description,
    } = req.body;

    if (!name || !price || !brand || !category || inventory === undefined) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc" });
    }

    // Lấy thông tin sản phẩm hiện tại để biết ảnh cũ
    const [currentProduct] = await shopDb
      .promise()
      .query("SELECT images FROM products WHERE id = ?", [productId]);

    if (currentProduct.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    let currentImages = [];
    try {
      currentImages = JSON.parse(currentProduct[0].images || "[]");
    } catch (e) {
      currentImages = [];
    }

    // Xử lý ảnh cũ cần giữ lại
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        existingImages = [];
      }
    }

    // Xử lý ảnh mới upload
    let newImageUrls = [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];

      const productUploadDir = path.join(__dirname, "images", "products");
      if (!fs.existsSync(productUploadDir)) {
        fs.mkdirSync(productUploadDir, { recursive: true });
      }

      for (const image of images) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedTypes.includes(image.mimetype)) {
          return res
            .status(400)
            .json({ message: "Chỉ hỗ trợ file ảnh JPG, PNG, GIF, WEBP" });
        }

        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}-${image.name}`;
        const filePath = path.join(productUploadDir, fileName);

        await image.mv(filePath);
        newImageUrls.push(`images/products/${fileName}`);
      }
    }

    // Kết hợp ảnh cũ và ảnh mới
    const finalImages = [...existingImages, ...newImageUrls];
    const imagesJson = JSON.stringify(finalImages);
    const specificationsJson = JSON.stringify([]);

    const [result] = await shopDb.promise().query(
      `UPDATE products SET
        name = ?, price = ?, brand = ?, category = ?, inventory = ?,
        min_inventory = ?, description = ?, images = ?, specifications = ?
       WHERE id = ?`,
      [
        name,
        parseFloat(price),
        brand,
        category,
        parseInt(inventory),
        parseInt(min_inventory) || 10,
        description || "",
        imagesJson,
        specificationsJson,
        productId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json({
      message: "Cập nhật sản phẩm thành công",
      productId,
      images: finalImages,
    });
  } catch (error) {
    console.error("Lỗi cập nhật sản phẩm:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API xóa sản phẩm (inferred from products.html)
app.delete("/api/admin/products/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const productId = req.params.id;

    const [result] = await shopDb
      .promise()
      .query("DELETE FROM products WHERE id = ?", [productId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json({ message: "Xóa sản phẩm thành công", productId });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API cập nhật tồn kho sản phẩm
app.put(
  "/api/admin/products/:id/inventory",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const productId = req.params.id;
      const { inventory, min_inventory } = req.body;

      if (inventory === undefined || min_inventory === undefined) {
        return res
          .status(400)
          .json({ message: "Vui lòng nhập đầy đủ thông tin" });
      }

      const [result] = await shopDb
        .promise()
        .query(
          "UPDATE products SET inventory = ?, min_inventory = ? WHERE id = ?",
          [parseInt(inventory), parseInt(min_inventory), productId]
        );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      res.json({ message: "Cập nhật tồn kho thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật tồn kho:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// API cập nhật giá sản phẩm
app.put(
  "/api/admin/products/:id/price",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const productId = req.params.id;
      const { price } = req.body;

      if (price === undefined) {
        return res.status(400).json({ message: "Vui lòng nhập giá mới" });
      }

      const [result] = await shopDb
        .promise()
        .query("UPDATE products SET price = ? WHERE id = ?", [
          parseFloat(price),
          productId,
        ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      res.json({ message: "Cập nhật giá thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật giá:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// API lấy chi tiết sản phẩm cho admin
app.get("/api/admin/products/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const productId = req.params.id;
    const [products] = await shopDb
      .promise()
      .query("SELECT * FROM products WHERE id = ?", [productId]);

    if (products.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json(products[0]);
  } catch (error) {
    console.error("Lỗi lấy chi tiết sản phẩm:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API quản lý danh mục cho admin (from friend's file)
app.get("/api/admin/categories", authenticateToken, async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const [categories] = await shopDb
      .promise()
      .query(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''"
      );
    res.json(categories.map((row) => row.category));
  } catch (error) {
    console.error("Lỗi lấy danh sách danh mục admin:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API quản lý thương hiệu cho admin (from friend's file)
app.get("/api/admin/brands", authenticateToken, async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const [brands] = await shopDb
      .promise()
      .query(
        "SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != ''"
      );
    res.json(brands.map((row) => row.brand));
  } catch (error) {
    console.error("Lỗi lấy danh sách thương hiệu admin:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API tạo admin user (chỉ để test)
app.post("/api/create-admin", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Kiểm tra xem admin đã tồn tại chưa
    const [existingAdmin] = await shopDb
      .promise()
      .query("SELECT * FROM users WHERE username = 'admin'", []);

    if (existingAdmin.length > 0) {
      return res.json({ message: "Admin user đã tồn tại" });
    }

    await shopDb
      .promise()
      .query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        ["admin", "admin@test.com", hashedPassword, "admin"]
      );

    res.json({ message: "Tạo admin user thành công" });
  } catch (error) {
    console.error("Lỗi tạo admin:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API test upload ảnh sản phẩm
app.post("/api/test-upload", authenticateToken, async (req, res) => {
  try {
    console.log("Files received:", req.files);
    console.log("Body received:", req.body);

    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: "Không có file ảnh được upload" });
    }

    const images = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];
    const productUploadDir = path.join(__dirname, "images", "products");

    if (!fs.existsSync(productUploadDir)) {
      fs.mkdirSync(productUploadDir, { recursive: true });
    }

    const uploadedImages = [];
    for (const image of images) {
      const fileName = `test-${Date.now()}-${image.name}`;
      const filePath = path.join(productUploadDir, fileName);

      await image.mv(filePath);
      uploadedImages.push(`images/products/${fileName}`);
    }

    res.json({
      message: "Upload thành công",
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Lỗi test upload:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// ==================== FORGOT PASSWORD APIs ====================

// API test để kiểm tra users
app.get("/api/test-users", async (req, res) => {
  try {
    const [users] = await shopDb
      .promise()
      .query("SELECT id, username, email FROM users LIMIT 5");
    res.json(users);
  } catch (error) {
    console.error("Lỗi test users:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API quên mật khẩu - gửi email reset
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Vui lòng nhập địa chỉ email" });
  }

  try {
    // Thêm cột reset_token và reset_token_expiry nếu chưa có
    try {
      await shopDb.promise().query(`
        ALTER TABLE users
        ADD COLUMN reset_token VARCHAR(255) NULL,
        ADD COLUMN reset_token_expiry DATETIME NULL
      `);
    } catch (error) {
      // Cột đã tồn tại, bỏ qua lỗi
    }

    // Kiểm tra email có tồn tại không
    const [users] = await shopDb
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      // Không tiết lộ email không tồn tại vì lý do bảo mật
      return res.json({
        message:
          "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu",
      });
    }

    const user = users[0];

    // Tạo reset token
    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 giờ

    // Lưu token vào database
    await shopDb
      .promise()
      .query(
        "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
        [resetToken, resetTokenExpiry, user.id]
      );

    // Gửi email
    const nodemailer = require("nodemailer");

    // Cấu hình email transporter (sử dụng Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "your-email@gmail.com", // Thay bằng email của bạn
        pass: process.env.EMAIL_PASS || "your-app-password", // Thay bằng app password
      },
    });

    const resetUrl = `http://localhost:3000/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: email,
      subject: "Đặt lại mật khẩu - Shop",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Đặt lại mật khẩu</h2>
          <p>Xin chào <strong>${user.username}</strong>,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình. Nhấp vào liên kết bên dưới để đặt lại mật khẩu:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #007bff; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p><strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 1 giờ.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Email này được gửi tự động, vui lòng không trả lời.
          </p>
        </div>
      `,
    };

    // Gửi email
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email reset password đã được gửi đến: ${email}`);

      res.json({
        message: "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn",
      });
    } catch (emailError) {
      console.error("Lỗi gửi email:", emailError);

      // Nếu gửi email thất bại, vẫn trả về thành công nhưng log lỗi
      res.json({
        message: "Yêu cầu đặt lại mật khẩu đã được xử lý",
        note: "Nếu email tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu",
      });
    }
  } catch (error) {
    console.error("Lỗi quên mật khẩu:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API xác thực reset token
app.get("/api/verify-reset-token", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Token không hợp lệ" });
  }

  try {
    const [users] = await shopDb
      .promise()
      .query(
        "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()",
        [token]
      );

    if (users.length === 0) {
      return res.status(400).json({
        message: "Liên kết không hợp lệ hoặc đã hết hạn",
      });
    }

    res.json({ message: "Token hợp lệ" });
  } catch (error) {
    console.error("Lỗi xác thực token:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API đặt lại mật khẩu
app.post("/api/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
  }

  try {
    // Kiểm tra token
    const [users] = await shopDb
      .promise()
      .query(
        "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()",
        [token]
      );

    if (users.length === 0) {
      return res.status(400).json({
        message: "Liên kết không hợp lệ hoặc đã hết hạn",
      });
    }

    const user = users[0];

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cập nhật mật khẩu và xóa reset token
    await shopDb
      .promise()
      .query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
        [hashedPassword, user.id]
      );

    res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Import admin routes (assumed to be compatible)
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

// Static files middleware
app.use(express.static(path.join(__dirname)));

// HTML routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/product-detail.html", (req, res) => {
  res.sendFile(path.join(__dirname, "product-detail.html"));
});

app.get("*.html", (req, res) => {
  res.sendFile(path.join(__dirname, req.path));
});

// Start server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
