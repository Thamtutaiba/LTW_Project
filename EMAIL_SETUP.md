# 📧 Hướng dẫn cấu hình Email cho chức năng Quên mật khẩu

## 🎯 Tổng quan

Chức năng quên mật khẩu sử dụng **Nodemailer** với **Gmail SMTP** để gửi email reset password. Để sử dụng tính năng này, bạn cần cấu hình email Gmail với App Password.

## 🛠️ Cấu hình Gmail

### Bước 1: Bật 2-Step Verification

1. **Truy cập Google Account**:
   - Vào [https://myaccount.google.com/security](https://myaccount.google.com/security)
   - Đăng nhập với tài khoản Gmail của bạn

2. **Bật 2-Step Verification**:
   - Tìm mục "2-Step Verification"
   - Click "Get started"
   - Làm theo hướng dẫn để bật (cần số điện thoại)

### Bước 2: Tạo App Password

1. **Truy cập App Passwords**:
   - Vào [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Hoặc từ Security page → "App passwords"

2. **Tạo password mới**:
   - Select app: **Mail**
   - Select device: **Other (custom name)**
   - Nhập tên: `Shop Website` hoặc tên bạn muốn
   - Click **Generate**

3. **Copy App Password**:
   - Sẽ hiển thị mật khẩu 16 ký tự dạng: `abcd efgh ijkl mnop`
   - **Lưu lại** mật khẩu này (chỉ hiển thị 1 lần)

## ⚙️ Cấu hình trong Project

### Bước 1: Tạo file .env

1. **Copy từ template**:
```bash
cp .env.example .env
```

2. **Chỉnh sửa file .env**:
```env
# Thay thông tin thật của bạn
EMAIL_USER=your-real-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

**Ví dụ**:
```env
EMAIL_USER=myshop2024@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

### Bước 2: Restart Server

```bash
# Dừng server hiện tại (Ctrl+C)
# Chạy lại
node server.js
```

## 🧪 Test chức năng

### Test 1: Kiểm tra cấu hình
1. Vào `http://localhost:3000/test-forgot-password.html`
2. Click "Test Users API" để xem users trong database
3. Click "Test Forgot Password" với email có trong database

### Test 2: Test đầy đủ
1. Vào `http://localhost:3000/forgot-password.html`
2. Nhập email có trong database
3. Kiểm tra hộp thư Gmail
4. Click link trong email
5. Đặt lại mật khẩu

## 🔍 Troubleshooting

### Lỗi: "Invalid login"
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Nguyên nhân**: 
- App Password sai
- Chưa bật 2-Step Verification
- Email sai

**Giải pháp**:
1. Kiểm tra lại email trong `.env`
2. Tạo lại App Password
3. Đảm bảo 2-Step Verification đã bật

### Lỗi: "Less secure app access"
```
Error: Please log in via your web browser
```

**Nguyên nhân**: Gmail chặn ứng dụng kém bảo mật

**Giải pháp**: 
- **KHÔNG** bật "Less secure app access" (không an toàn)
- **SỬ DỤNG** App Password (khuyến nghị)

### Email không nhận được

**Kiểm tra**:
1. **Spam folder** - Email có thể vào spam
2. **Email address** - Đảm bảo email đúng trong database
3. **Server logs** - Xem có lỗi gửi email không

**Server logs sẽ hiển thị**:
```
Email reset password đã được gửi đến: user@example.com
```

### Lỗi: "Connection timeout"
```
Error: Connection timeout
```

**Nguyên nhân**: Firewall hoặc network chặn SMTP

**Giải pháp**:
1. Kiểm tra firewall
2. Thử network khác
3. Sử dụng VPN nếu cần

## 🔧 Cấu hình nâng cao

### Sử dụng SMTP khác (không phải Gmail)

Chỉnh sửa trong `server.js`:

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.your-provider.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

### Tùy chỉnh email template

Trong `server.js`, tìm `mailOptions` và chỉnh sửa:

```javascript
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: email,
  subject: 'Đặt lại mật khẩu - Your Shop Name',
  html: `
    <!-- Tùy chỉnh HTML template ở đây -->
  `
};
```

## 📋 Checklist

Trước khi test, đảm bảo:

- [ ] Đã bật 2-Step Verification cho Gmail
- [ ] Đã tạo App Password
- [ ] File `.env` có thông tin đúng
- [ ] Server đã restart sau khi cấu hình
- [ ] Database có user với email hợp lệ
- [ ] Port 587 không bị chặn

## 🚀 Production Notes

Khi deploy lên production:

1. **Sử dụng environment variables** thay vì file `.env`
2. **Không commit** file `.env` lên git
3. **Sử dụng email domain riêng** thay vì Gmail cá nhân
4. **Cấu hình rate limiting** để tránh spam
5. **Log email activity** để theo dõi

---

**Lưu ý**: App Password chỉ hoạt động khi 2-Step Verification được bật. Nếu tắt 2-Step Verification, App Password sẽ không còn hoạt động.
