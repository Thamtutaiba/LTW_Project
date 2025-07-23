const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

// Sử dụng cùng JWT_SECRET như trong server.js
const JWT_SECRET = "your-secret-key";

// Middleware kiểm tra token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token không hợp lệ' });
        }
        req.user = user;
        next();
    });
};

// Middleware kiểm tra quyền
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const connection = await mysql.createConnection(process.env.DATABASE_URL);
            
            // Lấy role_id của user
            const [users] = await connection.execute(
                'SELECT role_id FROM users WHERE id = ?',
                [req.user.userId]
            );

            if (users.length === 0) {
                return res.status(403).json({ message: 'Không tìm thấy người dùng' });
            }

            const roleId = users[0].role_id;

            // Kiểm tra quyền
            const [permissions] = await connection.execute(
                `SELECT p.name 
                FROM permissions p 
                JOIN role_permissions rp ON p.id = rp.permission_id 
                WHERE rp.role_id = ? AND p.name = ?`,
                [roleId, permission]
            );

            if (permissions.length === 0) {
                return res.status(403).json({ message: 'Không có quyền truy cập' });
            }

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra quyền:', error);
            res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    };
};

// Middleware kiểm tra role
const checkRole = (roles) => {
    return async (req, res, next) => {
        try {
            const connection = await mysql.createConnection(process.env.DATABASE_URL);
            
            // Lấy role của user
            const [users] = await connection.execute(
                `SELECT r.name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.id = ?`,
                [req.user.userId]
            );

            if (users.length === 0) {
                return res.status(403).json({ message: 'Không tìm thấy người dùng' });
            }

            const userRole = users[0].name;

            if (!roles.includes(userRole)) {
                return res.status(403).json({ message: 'Không có quyền truy cập' });
            }

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra role:', error);
            res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    };
};

module.exports = {
    authenticateToken,
    checkPermission,
    checkRole
}; 