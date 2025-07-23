# 📝 Changelog

Tất cả các thay đổi quan trọng của dự án sẽ được ghi lại trong file này.

## [1.2.0] - 2025-06-19

### ✨ Added - Chức năng Quên mật khẩu
- **Forgot Password System**: Hệ thống quên mật khẩu hoàn chỉnh
  - Trang `forgot-password.html` với giao diện thân thiện
  - Trang `reset-password.html` với validation mạnh mẽ
  - API endpoints: `/api/forgot-password`, `/api/verify-reset-token`, `/api/reset-password`
  
- **Email Integration**: Tích hợp gửi email
  - Sử dụng Nodemailer với Gmail SMTP
  - Template email HTML đẹp mắt
  - Cấu hình qua file `.env`
  - Hỗ trợ App Password cho Gmail

- **Security Features**: Tính năng bảo mật
  - Reset token ngẫu nhiên 32 bytes
  - Token tự động hết hạn sau 1 giờ
  - Không tiết lộ email không tồn tại
  - Validation frontend + backend

- **Database Schema**: Cập nhật database
  - Thêm cột `reset_token` và `reset_token_expiry` vào bảng `users`
  - Tự động migration khi chạy API lần đầu

- **Documentation**: Tài liệu chi tiết
  - `README.md` hoàn chỉnh với hướng dẫn cài đặt
  - `EMAIL_SETUP.md` hướng dẫn cấu hình email
  - `.env.example` template cấu hình

### 🔧 Changed
- **Login Page**: Thêm link "Quên mật khẩu?" vào trang đăng nhập
- **Server.js**: Thêm dotenv support và email configuration
- **Error Handling**: Cải thiện xử lý lỗi cho email service

### 🐛 Fixed
- Sửa lỗi `nodemailer.createTransporter` → `nodemailer.createTransport`
- Sửa lỗi parsing parameters trong users API
- Sửa lỗi NaN values trong SQL queries

## [1.1.0] - 2025-06-19

### ✨ Added - Hệ thống phân quyền
- **User Management**: Quản lý người dùng hoàn chỉnh
  - CRUD operations cho users
  - Phân trang và tìm kiếm
  - Reset password cho admin
  - Quản lý trạng thái user

- **Role Management**: Quản lý vai trò
  - Tạo, sửa, xóa vai trò
  - Gán quyền cho vai trò
  - Permissions được load động từ database

- **Permission System**: Hệ thống phân quyền chi tiết
  - Role-based permissions
  - User-specific permissions
  - Permission inheritance
  - Middleware authentication

- **Admin Panel**: Giao diện quản trị
  - `admin/users.html` - Quản lý người dùng
  - `admin/roles.html` - Quản lý vai trò
  - `admin/user-permissions.html` - Phân quyền chi tiết

### 🔧 Changed
- **Database**: Thêm bảng roles, permissions, role_permissions, user_permissions
- **Authentication**: Cải thiện JWT middleware
- **UI/UX**: Bootstrap 5 responsive design

## [1.0.0] - 2025-05-01

### ✨ Added - Phiên bản đầu tiên
- **Core E-commerce Features**:
  - Product catalog với categories
  - Shopping cart và checkout
  - Order management
  - User registration/login

- **Admin Features**:
  - Dashboard với thống kê
  - Product management (CRUD)
  - Order management
  - Basic user management

- **Technical Stack**:
  - Node.js + Express.js backend
  - MySQL database
  - JWT authentication
  - Bootstrap frontend
  - File upload support

- **Security**:
  - Bcrypt password hashing
  - CORS configuration
  - Basic input validation

---

## 🔮 Upcoming Features

### [1.3.0] - Planned
- **Advanced Analytics**: Dashboard analytics nâng cao
- **Email Templates**: Hệ thống template email tùy chỉnh
- **Multi-language**: Hỗ trợ đa ngôn ngữ
- **API Rate Limiting**: Giới hạn request rate
- **Advanced Search**: Tìm kiếm nâng cao với filters

### [1.4.0] - Planned
- **Payment Integration**: Tích hợp thanh toán online
- **Inventory Management**: Quản lý kho hàng
- **Notification System**: Hệ thống thông báo real-time
- **Mobile App API**: API cho mobile app

---

## 📋 Legend

- ✨ **Added**: Tính năng mới
- 🔧 **Changed**: Thay đổi tính năng hiện có
- 🐛 **Fixed**: Sửa lỗi
- 🗑️ **Removed**: Xóa tính năng
- 🔒 **Security**: Cập nhật bảo mật
- 📚 **Documentation**: Cập nhật tài liệu
