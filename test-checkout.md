# Test Checkout với Địa Chỉ Giao Hàng

## Các thay đổi đã thực hiện:

### 1. Frontend (checkout.html)
- ✅ Thay đổi từ hiển thị thông tin người dùng sang chọn địa chỉ giao hàng
- ✅ Thêm giao diện chọn địa chỉ với radio buttons
- ✅ Thêm loading state khi tải địa chỉ
- ✅ Thêm thông báo lỗi khi không có địa chỉ hoặc lỗi tải
- ✅ Thêm nút "Thêm địa chỉ mới" 
- ✅ Cập nhật validation để kiểm tra địa chỉ được chọn
- ✅ Thêm loading state cho nút đặt hàng
- ✅ Cải thiện success popup với thông tin đơn hàng
- ✅ Thêm error handling chi tiết

### 2. Backend (server.js)
- ✅ Cập nhật API `/api/orders` để nhận `address_id`
- ✅ Lấy thông tin địa chỉ từ bảng `user_addresses` thay vì `users`
- ✅ Validate địa chỉ thuộc về user hiện tại
- ✅ Lưu thông tin địa chỉ đầy đủ vào đơn hàng

### 3. CSS (css/checkout.css)
- ✅ Thêm styles cho address selection
- ✅ Thêm responsive design cho mobile
- ✅ Thêm loading states và error states
- ✅ Cải thiện popup success
- ✅ Thêm hover effects và transitions

## Cách test:

### Test Case 1: User có địa chỉ
1. Đăng nhập với user có địa chỉ trong `user_addresses`
2. Vào trang checkout
3. Kiểm tra hiển thị danh sách địa chỉ
4. Chọn địa chỉ khác nhau
5. Đặt hàng thành công

### Test Case 2: User chưa có địa chỉ
1. Đăng nhập với user chưa có địa chỉ
2. Vào trang checkout  
3. Kiểm tra hiển thị thông báo "Chưa có địa chỉ"
4. Click "Thêm địa chỉ" -> chuyển đến profile.html
5. Thêm địa chỉ trong profile
6. Quay lại checkout và test

### Test Case 3: Error handling
1. Tắt server và test checkout
2. Kiểm tra error messages
3. Test với token hết hạn
4. Test với giỏ hàng trống

## Database cần có:
- Bảng `user_addresses` với dữ liệu mẫu
- Bảng `provinces`, `districts`, `wards` cho địa chỉ
- User có ít nhất 1 địa chỉ để test

## Kết quả mong đợi:
- ✅ Không còn lấy thông tin từ profile user
- ✅ Chỉ sử dụng địa chỉ từ bảng user_addresses  
- ✅ UI/UX tốt với loading states và error handling
- ✅ Responsive trên mobile
- ✅ Validation đầy đủ
