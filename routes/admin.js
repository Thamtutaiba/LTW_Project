const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
  checkRole,
} = require("../middleware/auth");
const mysql = require("mysql2/promise");
const path = require("path");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const fs = require("fs");
const mysqldump = require("mysqldump");

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes are working!', timestamp: new Date().toISOString() });
});

// Helper middleware chỉ cho phép admin/super_admin
function requireAdminRole(req, res, next) {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "super_admin")
  ) {
    return next();
  }
  return res.status(403).json({ message: "Không có quyền truy cập" });
}

// Lấy danh sách roles
router.get("/roles", authenticateToken, requireAdminRole, async (req, res) => {
  console.log("GET /roles - Request received");
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });

    console.log("Database connected");

    // Tạo bảng roles nếu chưa tồn tại
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Tạo bảng permissions nếu chưa tồn tại
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo bảng role_permissions nếu chưa tồn tại
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_role_permission (role_id, permission_id)
      )
    `);

    // Thêm dữ liệu mặc định cho roles nếu chưa có
    const [existingRoles] = await connection.execute(
      "SELECT COUNT(*) as count FROM roles"
    );
    if (existingRoles[0].count === 0) {
      await connection.execute(`
        INSERT INTO roles (name, description) VALUES
        ('user', 'Người dùng thông thường'),
        ('admin', 'Quản trị viên'),
        ('super_admin', 'Quản trị viên cấp cao')
      `);
    }

    // Thêm dữ liệu mặc định cho permissions nếu chưa có
    const [existingPermissions] = await connection.execute(
      "SELECT COUNT(*) as count FROM permissions"
    );
    if (existingPermissions[0].count === 0) {
      await connection.execute(`
        INSERT INTO permissions (name, description) VALUES
        ('view_products', 'Xem sản phẩm'),
        ('manage_products', 'Quản lý sản phẩm'),
        ('view_orders', 'Xem đơn hàng'),
        ('manage_orders', 'Quản lý đơn hàng'),
        ('view_users', 'Xem người dùng'),
        ('manage_users', 'Quản lý người dùng'),
        ('view_roles', 'Xem vai trò'),
        ('manage_roles', 'Quản lý vai trò'),
        ('system_settings', 'Cài đặt hệ thống')
      `);
    }

    const [roles] = await connection.execute("SELECT * FROM roles");
    console.log("Roles fetched:", roles);

    await connection.end();
    res.json(roles);
  } catch (error) {
    console.error("Lỗi lấy danh sách roles:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

router.get(
  "/products",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    console.log("GET /api/admin/products - Request received:", req.query);
    const { search, category, brand, inventory } = req.query;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@", // Sử dụng mật khẩu đúng
        database: "shop_db",
      });

      let query = "SELECT * FROM products WHERE 1=1";
      const params = [];

      if (search) {
        query += " AND (name LIKE ? OR description LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
      if (category) {
        query += " AND category = ?";
        params.push(category);
      }
      if (brand) {
        query += " AND brand = ?";
        params.push(brand);
      }
      if (inventory === "low") {
        query += " AND inventory <= min_inventory";
      } else if (inventory === "out") {
        query += " AND inventory = 0";
      }

      console.log("Executing query:", query, "with params:", params);
      const [products] = await connection.execute(query, params);

      await connection.end();
      res.json(products);
    } catch (error) {
      console.error("Lỗi lấy danh sách sản phẩm:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Lấy chi tiết role theo ID
router.get(
  "/roles/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [roles] = await connection.execute(
        "SELECT * FROM roles WHERE id = ?",
        [id]
      );
      await connection.end();

      if (roles.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy role" });
      }

      res.json(roles[0]);
    } catch (error) {
      console.error("Lỗi lấy chi tiết role:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Thêm role mới
router.post("/roles", authenticateToken, requireAdminRole, async (req, res) => {
  console.log("POST /roles - Request received:", req.body);
  const { name, description } = req.body;
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });

    console.log("Database connected");
    await connection.execute(
      "INSERT INTO roles (name, description) VALUES (?, ?)",
      [name, description]
    );
    console.log("Role added successfully");

    await connection.end();
    res.status(201).json({ message: "Thêm role thành công" });
  } catch (error) {
    console.error("Lỗi thêm role:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Cập nhật role
router.put(
  "/roles/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });
      await connection.execute(
        "UPDATE roles SET name = ?, description = ? WHERE id = ?",
        [name, description, id]
      );
      await connection.end();
      res.json({ message: "Cập nhật role thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật role:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Xóa role
router.delete(
  "/roles/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });
      await connection.execute("DELETE FROM roles WHERE id = ?", [id]);
      await connection.end();
      res.json({ message: "Xóa role thành công" });
    } catch (error) {
      console.error("Lỗi xóa role:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Lấy danh sách permissions
router.get(
  "/permissions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });
      const [permissions] = await connection.execute(
        "SELECT * FROM permissions"
      );
      await connection.end();
      res.json(permissions);
    } catch (error) {
      console.error("Lỗi lấy danh sách permissions:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Gán quyền cho role
router.post(
  "/roles/:roleId/permissions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Xóa các quyền cũ
      await connection.execute(
        "DELETE FROM role_permissions WHERE role_id = ?",
        [roleId]
      );

      // Thêm các quyền mới
      for (const permissionId of permissionIds) {
        await connection.execute(
          "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [roleId, permissionId]
        );
      }

      await connection.end();
      res.json({ message: "Gán quyền thành công" });
    } catch (error) {
      console.error("Lỗi gán quyền:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Lấy quyền của role
router.get(
  "/roles/:roleId/permissions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { roleId } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });
      const [permissions] = await connection.execute(
        `SELECT p.*
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?`,
        [roleId]
      );
      await connection.end();
      res.json(permissions);
    } catch (error) {
      console.error("Lỗi lấy quyền của role:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Import/Export sản phẩm
router.post(
  "/products/import",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "Không có file được tải lên" });
    }

    const file = req.files.file;
    const fileExt = path.extname(file.name).toLowerCase();

    if (fileExt !== ".csv" && fileExt !== ".xlsx") {
      return res
        .status(400)
        .json({ message: "Chỉ hỗ trợ file CSV hoặc Excel" });
    }

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Tạo log import
      const [logResult] = await connection.execute(
        "INSERT INTO import_export_logs (type, file_name, status, created_by) VALUES (?, ?, ?, ?)",
        ["import", file.name, "success", req.user.userId]
      );
      const logId = logResult.insertId;

      let products = [];
      if (fileExt === ".csv") {
        products = await parseCSV(file.data);
      } else {
        products = await parseExcel(file.data);
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const product of products) {
        try {
          await connection.execute(
            "INSERT INTO products (name, description, price, brand, category, inventory, min_inventory, max_inventory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              product.name,
              product.description,
              product.price,
              product.brand,
              product.category,
              product.inventory || 0,
              product.min_inventory || 5,
              product.max_inventory || 100,
            ]
          );
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Lỗi sản phẩm ${product.name}: ${error.message}`);
        }
      }

      // Cập nhật log
      await connection.execute(
        "UPDATE import_export_logs SET total_records = ?, success_records = ?, error_records = ?, error_details = ? WHERE id = ?",
        [
          products.length,
          successCount,
          errorCount,
          JSON.stringify(errors),
          logId,
        ]
      );

      await connection.end();
      res.json({
        message: "Import thành công",
        total: products.length,
        success: successCount,
        error: errorCount,
        errors: errors,
      });
    } catch (error) {
      console.error("Lỗi import sản phẩm:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.get(
  "/products/export",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [products] = await connection.execute("SELECT * FROM products");

      // Tạo file Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Products");

      // Thêm headers
      worksheet.columns = [
        { header: "ID", key: "id" },
        { header: "Tên sản phẩm", key: "name" },
        { header: "Mô tả", key: "description" },
        { header: "Giá", key: "price" },
        { header: "Thương hiệu", key: "brand" },
        { header: "Danh mục", key: "category" },
        { header: "Tồn kho", key: "inventory" },
        { header: "Tồn kho tối thiểu", key: "min_inventory" },
        { header: "Tồn kho tối đa", key: "max_inventory" },
      ];

      // Thêm dữ liệu
      products.forEach((product) => {
        worksheet.addRow(product);
      });

      // Tạo log export
      await connection.execute(
        "INSERT INTO import_export_logs (type, file_name, status, total_records, success_records, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [
          "export",
          "products_export.xlsx",
          "success",
          products.length,
          products.length,
          req.user.userId,
        ]
      );

      await connection.end();

      // Gửi file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=products_export.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Lỗi export sản phẩm:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Quản lý tồn kho
router.post(
  "/products/:id/inventory",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { quantity, type, note } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Cập nhật tồn kho
      const updateQuery =
        type === "import"
          ? "UPDATE products SET inventory = inventory + ? WHERE id = ?"
          : "UPDATE products SET inventory = inventory - ? WHERE id = ?";

      await connection.execute(updateQuery, [quantity, id]);

      // Ghi log lịch sử
      await connection.execute(
        "INSERT INTO inventory_history (product_id, quantity, type, reference_type, note, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [id, quantity, type, "manual", note, req.user.userId]
      );

      await connection.end();
      res.json({ message: "Cập nhật tồn kho thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật tồn kho:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.get(
  "/products/:id/inventory-history",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [history] = await connection.execute(
        `SELECT ih.*, u.username as created_by_name 
            FROM inventory_history ih 
            LEFT JOIN users u ON ih.created_by = u.id 
            WHERE ih.product_id = ? 
            ORDER BY ih.created_at DESC`,
        [id]
      );

      await connection.end();
      res.json(history);
    } catch (error) {
      console.error("Lỗi lấy lịch sử tồn kho:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Quản lý giá và khuyến mãi
router.post(
  "/products/:id/price",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { price, start_date, end_date } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Cập nhật giá hiện tại
      await connection.execute("UPDATE products SET price = ? WHERE id = ?", [
        price,
        id,
      ]);

      // Lưu lịch sử giá
      await connection.execute(
        "INSERT INTO product_prices (product_id, price, start_date, end_date) VALUES (?, ?, ?, ?)",
        [id, price, start_date, end_date]
      );

      await connection.end();
      res.json({ message: "Cập nhật giá thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật giá:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.get(
  "/products/:id/price-history",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [history] = await connection.execute(
        "SELECT * FROM product_prices WHERE product_id = ? ORDER BY start_date DESC",
        [id]
      );

      await connection.end();
      res.json(history);
    } catch (error) {
      console.error("Lỗi lấy lịch sử giá:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Quản lý khuyến mãi
router.post(
  "/promotions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const {
      name,
      description,
      discount_type,
      discount_value,
      start_date,
      end_date,
      product_ids,
    } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Tạo khuyến mãi mới
      const [result] = await connection.execute(
        "INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
        [name, description, discount_type, discount_value, start_date, end_date]
      );
      const promotionId = result.insertId;

      // Gán khuyến mãi cho các sản phẩm
      for (const productId of product_ids) {
        await connection.execute(
          "INSERT INTO product_promotions (product_id, promotion_id) VALUES (?, ?)",
          [productId, promotionId]
        );
      }

      await connection.end();
      res
        .status(201)
        .json({ message: "Tạo khuyến mãi thành công", promotionId });
    } catch (error) {
      console.error("Lỗi tạo khuyến mãi:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.get(
  "/promotions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [promotions] = await connection.execute(
        `SELECT p.*, 
            GROUP_CONCAT(pp.product_id) as product_ids,
            COUNT(pp.product_id) as total_products
            FROM promotions p
            LEFT JOIN product_promotions pp ON p.id = pp.promotion_id
            GROUP BY p.id
            ORDER BY p.created_at DESC`
      );

      await connection.end();
      res.json(promotions);
    } catch (error) {
      console.error("Lỗi lấy danh sách khuyến mãi:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.put(
  "/promotions/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const {
      name,
      description,
      discount_type,
      discount_value,
      start_date,
      end_date,
      status,
      product_ids,
    } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Cập nhật thông tin khuyến mãi
      await connection.execute(
        "UPDATE promotions SET name = ?, description = ?, discount_type = ?, discount_value = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?",
        [
          name,
          description,
          discount_type,
          discount_value,
          start_date,
          end_date,
          status,
          id,
        ]
      );

      // Xóa các sản phẩm cũ
      await connection.execute(
        "DELETE FROM product_promotions WHERE promotion_id = ?",
        [id]
      );

      // Thêm các sản phẩm mới
      for (const productId of product_ids) {
        await connection.execute(
          "INSERT INTO product_promotions (product_id, promotion_id) VALUES (?, ?)",
          [productId, id]
        );
      }

      await connection.end();
      res.json({ message: "Cập nhật khuyến mãi thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật khuyến mãi:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.delete(
  "/promotions/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Xóa các liên kết sản phẩm
      await connection.execute(
        "DELETE FROM product_promotions WHERE promotion_id = ?",
        [id]
      );

      // Xóa khuyến mãi
      await connection.execute("DELETE FROM promotions WHERE id = ?", [id]);

      await connection.end();
      res.json({ message: "Xóa khuyến mãi thành công" });
    } catch (error) {
      console.error("Lỗi xóa khuyến mãi:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// In hóa đơn
router.get(
  "/orders/:id/invoice",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Lấy thông tin đơn hàng
      const [orders] = await connection.execute(
        `SELECT o.*, u.username, u.email, u.phone, u.address,
            GROUP_CONCAT(p.name) as product_names,
            GROUP_CONCAT(od.quantity) as quantities,
            GROUP_CONCAT(od.price) as prices
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_details od ON o.id = od.order_id
            JOIN products p ON od.product_id = p.id
            WHERE o.id = ?
            GROUP BY o.id`,
        [id]
      );

      if (orders.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      const order = orders[0];

      // Tạo PDF hóa đơn
      const doc = new PDFDocument();
      const filename = `invoice_${id}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      doc.pipe(res);

      // Thiết kế hóa đơn
      doc.fontSize(20).text("HÓA ĐƠN BÁN HÀNG", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Mã đơn hàng: ${order.id}`);
      doc.text(
        `Ngày đặt: ${new Date(order.created_at).toLocaleDateString("vi-VN")}`
      );
      doc.text(`Khách hàng: ${order.username}`);
      doc.text(`Email: ${order.email}`);
      doc.text(`Điện thoại: ${order.phone}`);
      doc.text(`Địa chỉ: ${order.address}`);
      doc.moveDown();

      // Bảng sản phẩm
      const productNames = order.product_names.split(",");
      const quantities = order.quantities.split(",");
      const prices = order.prices.split(",");

      doc.text("Sản phẩm", 50, 300);
      doc.text("Số lượng", 300, 300);
      doc.text("Đơn giá", 400, 300);
      doc.text("Thành tiền", 500, 300);

      let y = 320;
      let total = 0;

      for (let i = 0; i < productNames.length; i++) {
        const quantity = parseInt(quantities[i]);
        const price = parseFloat(prices[i]);
        const subtotal = quantity * price;
        total += subtotal;

        doc.text(productNames[i], 50, y);
        doc.text(quantity.toString(), 300, y);
        doc.text(price.toLocaleString("vi-VN") + "đ", 400, y);
        doc.text(subtotal.toLocaleString("vi-VN") + "đ", 500, y);
        y += 20;
      }

      doc.moveDown();
      doc.text(`Tổng tiền: ${total.toLocaleString("vi-VN")}đ`, {
        align: "right",
      });

      doc.end();
    } catch (error) {
      console.error("Lỗi tạo hóa đơn:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Xuất báo cáo đơn hàng
router.get(
  "/orders/report",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { start_date, end_date, format = "excel" } = req.query;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [orders] = await connection.execute(
        `SELECT o.*, u.username, u.email,
            COUNT(od.id) as total_items,
            SUM(od.quantity * od.price) as total_amount
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_details od ON o.id = od.order_id
            WHERE o.created_at BETWEEN ? AND ?
            GROUP BY o.id
            ORDER BY o.created_at DESC`,
        [start_date, end_date]
      );

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Orders Report");

        worksheet.columns = [
          { header: "Mã đơn", key: "id" },
          { header: "Ngày đặt", key: "created_at" },
          { header: "Khách hàng", key: "username" },
          { header: "Email", key: "email" },
          { header: "Số sản phẩm", key: "total_items" },
          { header: "Tổng tiền", key: "total_amount" },
          { header: "Trạng thái", key: "status" },
        ];

        orders.forEach((order) => {
          worksheet.addRow({
            id: order.id,
            created_at: new Date(order.created_at).toLocaleDateString("vi-VN"),
            username: order.username,
            email: order.email,
            total_items: order.total_items,
            total_amount: order.total_amount,
            status: order.status,
          });
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=orders_report.xlsx"
        );
        await workbook.xlsx.write(res);
        res.end();
      } else {
        res.json(orders);
      }
    } catch (error) {
      console.error("Lỗi xuất báo cáo:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Quản lý vận chuyển
router.post(
  "/orders/:id/shipping",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { shipping_method_id, tracking_number, shipping_address, notes } =
      req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      await connection.execute(
        "INSERT INTO order_shipping (order_id, shipping_method_id, tracking_number, shipping_address, notes) VALUES (?, ?, ?, ?, ?)",
        [id, shipping_method_id, tracking_number, shipping_address, notes]
      );

      await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [
        "shipping",
        id,
      ]);

      await connection.end();
      res.json({ message: "Cập nhật thông tin vận chuyển thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật vận chuyển:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Phân loại khách hàng
router.get(
  "/customers/tiers",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [tiers] = await connection.execute(
        "SELECT * FROM customer_tiers ORDER BY min_points ASC"
      );
      await connection.end();
      res.json(tiers);
    } catch (error) {
      console.error("Lỗi lấy danh sách hạng khách hàng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Gửi email thông báo
router.post(
  "/notifications/email",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { subject, content, user_ids } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Lấy cấu hình email
      const [settings] = await connection.execute(
        "SELECT * FROM system_settings WHERE category = ?",
        ["email"]
      );

      const emailConfig = settings.reduce((acc, setting) => {
        acc[setting.name] = setting.value;
        return acc;
      }, {});

      // Lấy danh sách email người nhận
      const [users] = await connection.execute(
        "SELECT email FROM users WHERE id IN (?)",
        [user_ids]
      );

      // Gửi email
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: false,
        auth: {
          user: emailConfig.smtp_user,
          pass: emailConfig.smtp_pass,
        },
      });

      for (const user of users) {
        await transporter.sendMail({
          from: emailConfig.smtp_user,
          to: user.email,
          subject: subject,
          html: content,
        });
      }

      await connection.end();
      res.json({ message: "Gửi email thành công" });
    } catch (error) {
      console.error("Lỗi gửi email:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Quản lý đánh giá
router.get(
  "/reviews",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [reviews] = await connection.execute(
        `SELECT r.*, p.name as product_name, u.username
            FROM product_reviews r
            JOIN products p ON r.product_id = p.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC`
      );

      await connection.end();
      res.json(reviews);
    } catch (error) {
      console.error("Lỗi lấy danh sách đánh giá:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Cập nhật trạng thái đánh giá
router.put(
  "/reviews/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      await connection.execute(
        "UPDATE product_reviews SET status = ? WHERE id = ?",
        [status, id]
      );

      await connection.end();
      res.json({ message: "Cập nhật trạng thái đánh giá thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật đánh giá:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Thống kê doanh thu
router.get(
  "/statistics/revenue",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { period = "month" } = req.query;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      let query;
      if (period === "day") {
        query = `
                SELECT DATE(created_at) as date,
                COUNT(*) as total_orders,
                SUM(total_amount) as revenue
                FROM orders
                WHERE status = 'completed'
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
      } else if (period === "month") {
        query = `
                SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as total_orders,
                SUM(total_amount) as revenue
                FROM orders
                WHERE status = 'completed'
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC
            `;
      }

      const [statistics] = await connection.execute(query);
      await connection.end();
      res.json(statistics);
    } catch (error) {
      console.error("Lỗi lấy thống kê doanh thu:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Báo cáo sản phẩm bán chạy
router.get(
  "/statistics/top-products",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { limit = 10, period = "month" } = req.query;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [products] = await connection.execute(
        `SELECT p.id, p.name, p.brand, p.category,
            COUNT(od.id) as total_orders,
            SUM(od.quantity) as total_quantity,
            SUM(od.quantity * od.price) as total_revenue
            FROM products p
            JOIN order_details od ON p.id = od.product_id
            JOIN orders o ON od.order_id = o.id
            WHERE o.status = 'completed'
            AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 ${period})
            GROUP BY p.id
            ORDER BY total_quantity DESC
            LIMIT ?`,
        [parseInt(limit)]
      );

      await connection.end();
      res.json(products);
    } catch (error) {
      console.error("Lỗi lấy báo cáo sản phẩm:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Cấu hình hệ thống
router.get(
  "/settings",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [settings] = await connection.execute(
        "SELECT * FROM system_settings"
      );
      const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {});

      await connection.end();
      res.json(groupedSettings);
    } catch (error) {
      console.error("Lỗi lấy cấu hình:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

router.put(
  "/settings",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { settings } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      for (const setting of settings) {
        await connection.execute(
          "UPDATE system_settings SET value = ? WHERE category = ? AND name = ?",
          [setting.value, setting.category, setting.name]
        );
      }

      await connection.end();
      res.json({ message: "Cập nhật cấu hình thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Quản lý banner
router.get(
  "/banners",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [banners] = await connection.execute(
        "SELECT * FROM banners ORDER BY position, created_at DESC"
      );
      await connection.end();
      res.json(banners);
    } catch (error) {
      console.error("Lỗi lấy danh sách banner:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Sao lưu dữ liệu
router.post(
  "/backup",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const filename = `backup_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.sql`;
      const backupPath = path.join(__dirname, "../backups", filename);

      // Tạo thư mục backups nếu chưa tồn tại
      if (!fs.existsSync(path.join(__dirname, "../backups"))) {
        fs.mkdirSync(path.join(__dirname, "../backups"));
      }

      // Thực hiện backup
      const backup = await mysqldump({
        connection: {
          host: "localhost",
          user: "root",
          password: "Trung362004@",
          database: "shop_db",
        },
        dumpToFile: backupPath,
      });

      // Lưu thông tin backup
      const stats = fs.statSync(backupPath);
      await connection.execute(
        "INSERT INTO backups (filename, size, type, status, created_by) VALUES (?, ?, ?, ?, ?)",
        [filename, stats.size, "full", "success", req.user.userId]
      );

      await connection.end();
      res.json({ message: "Sao lưu thành công", filename });
    } catch (error) {
      console.error("Lỗi sao lưu:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Khôi phục dữ liệu
router.post(
  "/restore",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { filename } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const backupPath = path.join(__dirname, "../backups", filename);

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ message: "Không tìm thấy file backup" });
      }

      // Đọc và thực thi file backup
      const backupContent = fs.readFileSync(backupPath, "utf8");
      const queries = backupContent.split(";").filter((query) => query.trim());

      for (const query of queries) {
        if (query.trim()) {
          await connection.execute(query);
        }
      }

      await connection.end();
      res.json({ message: "Khôi phục thành công" });
    } catch (error) {
      console.error("Lỗi khôi phục:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Dashboard overview
router.get(
  "/dashboard/overview",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const { timeRange } = req.query;
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Tính toán thời gian dựa trên timeRange
      let startDate;
      const endDate = new Date();
      switch (timeRange) {
        case "today":
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }

      // Lấy thống kê nhanh
      const [stats] = await connection.execute(
        `
            SELECT
                COALESCE(SUM(total_amount), 0) as revenue,
                COUNT(*) as newOrders,
                (SELECT COUNT(*) FROM users WHERE created_at >= ? AND role = 'user') as newCustomers,
                (SELECT COUNT(*) FROM products WHERE inventory <= min_inventory) as lowStock
            FROM orders
            WHERE created_at >= ?
        `,
        [startDate, startDate]
      );

      // Lấy doanh thu theo thời gian
      const [revenueData] = await connection.execute(
        `
            SELECT DATE(created_at) as date, SUM(total_amount) as amount
            FROM orders
            WHERE created_at >= ?
            GROUP BY DATE(created_at)
            ORDER BY date
        `,
        [startDate]
      );

      // Lấy trạng thái đơn hàng
      const [orderStatus] = await connection.execute(
        `
            SELECT status, COUNT(*) as count
            FROM orders
            WHERE created_at >= ?
            GROUP BY status
        `,
        [startDate]
      );

      // Lấy đơn hàng gần đây
      const [recentOrders] = await connection.execute(`
            SELECT o.id, o.total_amount, o.status, o.created_at, u.username as customer_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

      // Lấy sản phẩm sắp hết hàng
      const [lowStockProducts] = await connection.execute(`
            SELECT *
            FROM products
            WHERE inventory <= min_inventory
            ORDER BY inventory ASC
            LIMIT 5
        `);

      await connection.end();

      // Format dữ liệu cho biểu đồ
      const chartData = {
        revenue: {
          labels: revenueData.map((item) => item.date),
          data: revenueData.map((item) => item.amount),
        },
        orderStatus: {
          labels: orderStatus.map((item) => item.status),
          data: orderStatus.map((item) => item.count),
        },
      };

      res.json({
        success: true,
        today_revenue: stats[0].revenue,
        new_orders: stats[0].newOrders,
        new_customers: stats[0].newCustomers,
        total_products: stats[0].lowStock,
        low_stock_products: lowStockProducts,
        recent_orders: recentOrders,
        revenue_chart: revenueData,
        order_status_stats: orderStatus,
        stats: {
          revenue: stats[0].revenue,
          revenueGrowth: 0,
          newOrders: stats[0].newOrders,
          ordersGrowth: 0,
          newCustomers: stats[0].newCustomers,
          customersGrowth: 0,
          lowStock: stats[0].lowStock,
        },
        recentOrders,
        lowStockProducts,
        chartData,
        data: {
          orders: {
            totalOrders: stats[0].newOrders,
            totalRevenue: stats[0].revenue,
          },
          products: { totalProducts: stats[0].lowStock },
          users: { totalUsers: stats[0].newCustomers },
        },
      });
    } catch (error) {
      console.error("Lỗi lấy dữ liệu dashboard:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Revenue Chart Data
router.get(
  "/dashboard/revenue",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const { range = "today" } = req.query;
      let query, labels, values;

      switch (range) {
        case "week":
          query = `
                    SELECT DATE(created_at) as date, SUM(total_amount) as revenue
                    FROM orders
                    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                    AND status != 'cancelled'
                    GROUP BY DATE(created_at)
                    ORDER BY date
                `;
          labels = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString("vi-VN", { weekday: "short" });
          });
          break;
        case "month":
          query = `
                    SELECT DATE(created_at) as date, SUM(total_amount) as revenue
                    FROM orders
                    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    AND status != 'cancelled'
                    GROUP BY DATE(created_at)
                    ORDER BY date
                `;
          labels = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return date.toLocaleDateString("vi-VN", {
              day: "numeric",
              month: "short",
            });
          });
          break;
        default: // today
          query = `
                    SELECT HOUR(created_at) as hour, SUM(total_amount) as revenue
                    FROM orders
                    WHERE DATE(created_at) = CURDATE()
                    AND status != 'cancelled'
                    GROUP BY HOUR(created_at)
                    ORDER BY hour
                `;
          labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
          break;
      }

      const result = await db.query(query);
      values = new Array(labels.length).fill(0);

      result.forEach((item) => {
        const index =
          range === "today"
            ? item.hour
            : labels.findIndex(
                (label) =>
                  label ===
                  new Date(item.date).toLocaleDateString(
                    "vi-VN",
                    range === "week"
                      ? { weekday: "short" }
                      : { day: "numeric", month: "short" }
                  )
              );
        if (index !== -1) {
          values[index] = item.revenue;
        }
      });

      res.json({ labels, values });
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

// Order Status Chart Data
router.get(
  "/dashboard/order-status",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const result = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status = 'shipping' THEN 1 ELSE 0 END) as shipping,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM orders
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);

      res.json(result[0]);
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

// Recent Orders
router.get(
  "/dashboard/recent-orders",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const orders = await db.query(`
            SELECT o.*, u.name as customer_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

      res.json(orders);
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

// Low Stock Products
router.get(
  "/dashboard/low-stock",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    try {
      const products = await db.query(`
            SELECT id, name, quantity
            FROM products
            WHERE quantity <= 10
            ORDER BY quantity ASC
            LIMIT 5
        `);

      res.json(products);
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

// Lấy chi tiết sản phẩm theo id (admin)
router.get(
  "/products/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });
      const [products] = await connection.execute(
        "SELECT * FROM products WHERE id = ?",
        [id]
      );
      await connection.end();
      if (products.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
      res.json(products[0]);
    } catch (error) {
      console.error("Lỗi lấy chi tiết sản phẩm:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// ==================== USER MANAGEMENT APIs ====================

// Lấy danh sách người dùng với phân trang và lọc
router.get("/users", authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      status = "",
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });

    // Tạo bảng user_permissions nếu chưa tồn tại
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_permission (user_id, permission_id)
      )
    `);

    // Thêm cột status vào bảng users nếu chưa có
    try {
      await connection.execute(
        "ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'"
      );
    } catch (error) {
      // Cột đã tồn tại, bỏ qua lỗi
    }

    // Xây dựng câu query với điều kiện lọc
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(
        "(username LIKE ? OR email LIKE ? OR fullname LIKE ?)"
      );
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereConditions.push("role = ?");
      queryParams.push(role);
    }

    if (status) {
      whereConditions.push("status = ?");
      queryParams.push(status);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Đếm tổng số người dùng
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      queryParams
    );
    const totalUsers = countResult[0].total;
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Lấy danh sách người dùng
    const [users] = await connection.execute(
      `SELECT id, username, email, fullname, phone, address, role, status, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      queryParams
    );

    await connection.end();
    res.json({
      users,
      totalPages,
      currentPage: pageNum,
      totalUsers,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Lấy chi tiết người dùng theo ID
router.get(
  "/users/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      const [users] = await connection.execute(
        "SELECT id, username, email, fullname, phone, address, role, status, created_at FROM users WHERE id = ?",
        [id]
      );

      await connection.end();

      if (users.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      res.json(users[0]);
    } catch (error) {
      console.error("Lỗi lấy chi tiết người dùng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Thêm người dùng mới
router.post("/users", authenticateToken, requireAdminRole, async (req, res) => {
  const {
    username,
    email,
    password,
    fullname,
    phone,
    address,
    role = "user",
  } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
  }

  try {
    const bcrypt = require("bcrypt");
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });

    // Kiểm tra username và email đã tồn tại chưa
    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      await connection.end();
      return res
        .status(400)
        .json({ message: "Tên đăng nhập hoặc email đã tồn tại" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Thêm người dùng mới
    await connection.execute(
      "INSERT INTO users (username, email, password, fullname, phone, address, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')",
      [username, email, hashedPassword, fullname, phone, address, role]
    );

    await connection.end();
    res.status(201).json({ message: "Thêm người dùng thành công" });
  } catch (error) {
    console.error("Lỗi thêm người dùng:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Cập nhật người dùng
router.put(
  "/users/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { email, fullname, phone, address, role, status } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Kiểm tra email đã tồn tại chưa (trừ user hiện tại)
      const [existingUsers] = await connection.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, id]
      );

      if (existingUsers.length > 0) {
        await connection.end();
        return res.status(400).json({ message: "Email đã tồn tại" });
      }

      // Cập nhật thông tin người dùng
      await connection.execute(
        "UPDATE users SET email = ?, fullname = ?, phone = ?, address = ?, role = ?, status = ? WHERE id = ?",
        [email, fullname, phone, address, role, status, id]
      );

      await connection.end();
      res.json({ message: "Cập nhật người dùng thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật người dùng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Xóa người dùng
router.delete(
  "/users/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Kiểm tra không được xóa chính mình
      if (parseInt(id) === req.user.userId) {
        await connection.end();
        return res.status(400).json({ message: "Không thể xóa chính mình" });
      }

      // Xóa người dùng
      const [result] = await connection.execute(
        "DELETE FROM users WHERE id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        await connection.end();
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      await connection.end();
      res.json({ message: "Xóa người dùng thành công" });
    } catch (error) {
      console.error("Lỗi xóa người dùng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Reset mật khẩu người dùng
router.put(
  "/users/:id/reset-password",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    try {
      const bcrypt = require("bcrypt");
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Mã hóa mật khẩu mới
      const hashedPassword = await bcrypt.hash(password, 10);

      // Cập nhật mật khẩu
      const [result] = await connection.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, id]
      );

      if (result.affectedRows === 0) {
        await connection.end();
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      await connection.end();
      res.json({ message: "Reset mật khẩu thành công" });
    } catch (error) {
      console.error("Lỗi reset mật khẩu:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Cập nhật vai trò người dùng
router.put(
  "/users/:id/role",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["user", "admin", "super_admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Cập nhật vai trò
      const [result] = await connection.execute(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, id]
      );

      if (result.affectedRows === 0) {
        await connection.end();
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      await connection.end();
      res.json({ message: "Cập nhật vai trò thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật vai trò:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// ==================== USER PERMISSIONS APIs ====================

// Lấy quyền của người dùng (từ vai trò + quyền tùy chỉnh)
router.get(
  "/users/:id/permissions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Lấy thông tin người dùng
      const [users] = await connection.execute(
        "SELECT role FROM users WHERE id = ?",
        [id]
      );

      if (users.length === 0) {
        await connection.end();
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      const userRole = users[0].role;

      // Lấy quyền từ vai trò
      const [rolePermissions] = await connection.execute(
        `
      SELECT p.id, p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = ?
    `,
        [userRole]
      );

      // Lấy quyền tùy chỉnh của người dùng
      const [customPermissions] = await connection.execute(
        `
      SELECT p.id, p.name, p.description
      FROM permissions p
      JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = ?
    `,
        [id]
      );

      await connection.end();
      res.json({
        rolePermissions,
        customPermissions,
      });
    } catch (error) {
      console.error("Lỗi lấy quyền người dùng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Gán quyền tùy chỉnh cho người dùng
router.post(
  "/users/:id/permissions",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    const { permissionIds } = req.body;

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Xóa các quyền tùy chỉnh cũ
      await connection.execute(
        "DELETE FROM user_permissions WHERE user_id = ?",
        [id]
      );

      // Thêm các quyền tùy chỉnh mới
      if (permissionIds && permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await connection.execute(
            "INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)",
            [id, permissionId]
          );
        }
      }

      await connection.end();
      res.json({ message: "Gán quyền tùy chỉnh thành công" });
    } catch (error) {
      console.error("Lỗi gán quyền người dùng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Xóa đơn hàng
router.delete(
  "/orders/:id",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Kiểm tra đơn hàng tồn tại
      const [orders] = await connection.execute(
        "SELECT * FROM orders WHERE id = ?",
        [id]
      );
      if (orders.length === 0) {
        await connection.end();
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Xóa đơn hàng (CASCADE sẽ tự động xóa order_details, payment_transactions...)
      await connection.execute(
        "DELETE FROM orders WHERE id = ?",
        [id]
      );
      await connection.end();
      res.json({ message: "Xóa đơn hàng thành công" });
    } catch (error) {
      console.error("Lỗi xóa đơn hàng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// Cập nhật trạng thái đơn hàng
router.put(
  "/orders/:orderId/status",
  authenticateToken,
  requireAdminRole,
  async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatus = ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'failed_delivery'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Trung362004@",
        database: "shop_db",
      });

      // Lấy thông tin đơn hàng hiện tại
      const [currentOrder] = await connection.execute(
        "SELECT status FROM orders WHERE id = ?",
        [orderId]
      );

      if (currentOrder.length === 0) {
        await connection.end();
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      const oldStatus = currentOrder[0].status;

      // Cập nhật trạng thái đơn hàng
      const [result] = await connection.execute(
        "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
        [status, orderId]
      );

      // Lấy chi tiết sản phẩm trong đơn hàng
      const [orderDetails] = await connection.execute(
        "SELECT product_id, quantity FROM order_details WHERE order_id = ?",
        [orderId]
      );

      // Logic cập nhật tồn kho và số lượng đã bán
      if (status === 'processing' && oldStatus === 'pending') {
        // Khi chuyển từ pending sang processing: GIẢM tồn kho
        for (const item of orderDetails) {
          await connection.execute(
            `UPDATE products 
             SET inventory = inventory - ? 
             WHERE id = ? AND inventory >= ?`,
            [item.quantity, item.product_id, item.quantity]
          );
          
          // Kiểm tra xem có cập nhật thành công không
          const [checkResult] = await connection.execute(
            "SELECT inventory FROM products WHERE id = ?",
            [item.product_id]
          );
          
          if (checkResult.length === 0) {
            await connection.end();
            return res.status(400).json({ 
              message: `Sản phẩm ID ${item.product_id} không tồn tại` 
            });
          }
          
          if (checkResult[0].inventory < 0) {
            await connection.end();
            return res.status(400).json({ 
              message: `Sản phẩm ID ${item.product_id} không đủ tồn kho để xử lý đơn hàng` 
            });
          }
        }
      } else if (oldStatus === 'processing' && (status === 'cancelled' || status === 'failed_delivery')) {
        // Khi hủy đơn hàng từ trạng thái processing: HOÀN LẠI tồn kho
        for (const item of orderDetails) {
          await connection.execute(
            `UPDATE products 
             SET inventory = inventory + ? 
             WHERE id = ?`,
            [item.quantity, item.product_id]
          );
        }
      } else if (status === 'completed' && oldStatus !== 'completed') {
        // Khi hoàn thành đơn hàng: TĂNG số lượng đã bán
        for (const item of orderDetails) {
          await connection.execute(
            `UPDATE products 
             SET quantity_sold = COALESCE(quantity_sold, 0) + ? 
             WHERE id = ?`,
            [item.quantity, item.product_id]
          );
        }
      }

      await connection.end();

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      res.json({ message: "Cập nhật trạng thái đơn hàng thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái đơn hàng:", error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  }
);

// ========== SHIPPING INFO APIs ========== 
const SHIPPING_STATUS = ["pending", "in_transit", "delivered", "failed"];

// Lấy shipping_info theo order_id
router.get("/orders/:orderId/shipping-info", authenticateToken, requireAdminRole, async (req, res) => {
  const { orderId } = req.params;
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    const [rows] = await connection.execute(
      "SELECT * FROM shipping_info WHERE order_id = ? ORDER BY id DESC",
      [orderId]
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Lỗi lấy shipping_info:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Tạo mới shipping_info
router.post("/shipping-info", authenticateToken, requireAdminRole, async (req, res) => {
  const { order_id, shipping_method, tracking_number, estimated_delivery, status } = req.body;
  if (!order_id || !shipping_method || !tracking_number) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
  }
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    // Kiểm tra đã có shipping_info cho order này chưa
    const [exist] = await connection.execute(
      "SELECT * FROM shipping_info WHERE order_id = ?",
      [order_id]
    );
    if (exist.length > 0) {
      await connection.end();
      return res.status(400).json({ message: "Đơn hàng đã có thông tin vận chuyển" });
    }
    await connection.execute(
      `INSERT INTO shipping_info (order_id, shipping_method, tracking_number, estimated_delivery, status) VALUES (?, ?, ?, ?, ?)`,
      [order_id, shipping_method, tracking_number, estimated_delivery || null, status || "pending"]
    );
    await connection.end();
    res.json({ message: "Tạo thông tin vận chuyển thành công" });
  } catch (error) {
    console.error("Lỗi tạo shipping_info:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// Cập nhật trạng thái shipping_info
router.put("/shipping-info/:id", authenticateToken, requireAdminRole, async (req, res) => {
  const { id } = req.params;
  const { status, actual_delivery } = req.body;
  if (!SHIPPING_STATUS.includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  }
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    let query = "UPDATE shipping_info SET status = ?";
    let params = [status];
    if (status === "delivered" && actual_delivery) {
      query += ", actual_delivery = ?";
      params.push(actual_delivery);
    }
    query += " WHERE id = ?";
    params.push(id);
    await connection.execute(query, params);
    await connection.end();
    res.json({ message: "Cập nhật trạng thái vận chuyển thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật shipping_info:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
});

// API lấy danh sách tỉnh/thành
router.get('/provinces', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    const [rows] = await connection.execute('SELECT id, name FROM provinces');
    await connection.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API lấy danh sách quận/huyện theo tỉnh
router.get('/districts', authenticateToken, async (req, res) => {
  const { province_id } = req.query;
  if (!province_id) return res.status(400).json({ message: 'Thiếu province_id' });
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    const [rows] = await connection.execute('SELECT id, name FROM districts WHERE province_id = ?', [province_id]);
    await connection.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API lấy danh sách phường/xã theo quận/huyện
router.get('/wards', authenticateToken, async (req, res) => {
  const { district_id } = req.query;
  if (!district_id) return res.status(400).json({ message: 'Thiếu district_id' });
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    const [rows] = await connection.execute('SELECT id, name FROM wards WHERE district_id = ?', [district_id]);
    await connection.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API lấy danh sách địa chỉ của user
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    const [rows] = await connection.execute(`
      SELECT a.*, p.name as province_name, d.name as district_name, w.name as ward_name
      FROM user_addresses a
      JOIN provinces p ON a.province_id = p.id
      JOIN districts d ON a.district_id = d.id
      JOIN wards w ON a.ward_id = w.id
      WHERE a.user_id = ?
      ORDER BY a.is_default DESC, a.id DESC
    `, [userId]);
    await connection.end();
    res.json(rows);
  } catch (err) {
    console.error('Error loading addresses:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API thêm địa chỉ mới
router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, province_id, district_id, ward_id, address_detail, is_default } = req.body;
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    if (is_default) {
      await connection.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
    await connection.execute(`
      INSERT INTO user_addresses (user_id, name, phone, province_id, district_id, ward_id, address_detail, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, name, phone, province_id, district_id, ward_id, address_detail, is_default ? 1 : 0]);
    await connection.end();
    res.json({ message: 'Thêm địa chỉ thành công' });
  } catch (err) {
    console.error('Error adding address:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API cập nhật địa chỉ
router.put('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, phone, province_id, district_id, ward_id, address_detail, is_default } = req.body;
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    if (is_default) {
      await connection.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
    await connection.execute(`
      UPDATE user_addresses SET name=?, phone=?, province_id=?, district_id=?, ward_id=?, address_detail=?, is_default=? WHERE id=? AND user_id=?
    `, [name, phone, province_id, district_id, ward_id, address_detail, is_default ? 1 : 0, id, userId]);
    await connection.end();
    res.json({ message: 'Cập nhật địa chỉ thành công' });
  } catch (err) {
    console.error('Error updating address:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API xóa địa chỉ
router.delete('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    await connection.execute('DELETE FROM user_addresses WHERE id=? AND user_id=?', [id, userId]);
    await connection.end();
    res.json({ message: 'Xóa địa chỉ thành công' });
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});
// API đặt địa chỉ mặc định
router.patch('/addresses/:id/default', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Trung362004@",
      database: "shop_db",
    });
    await connection.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    await connection.execute('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    await connection.end();
    res.json({ message: 'Đặt địa chỉ mặc định thành công' });
  } catch (err) {
    console.error('Error setting default address:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
