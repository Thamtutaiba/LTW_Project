# Test Admin Orders - Hiển thị thông tin từ user_addresses

## Các thay đổi đã thực hiện:

### 1. Database Schema (add_address_id_to_orders.sql)
- ✅ Thêm trường `address_id` vào bảng `orders`
- ✅ Thêm foreign key constraint với `user_addresses`
- ✅ Tạo index cho performance

### 2. Backend API Updates (server.js)

#### API tạo đơn hàng (`POST /api/orders`):
- ✅ Lưu `address_id` vào bảng orders
- ✅ Vẫn lưu thông tin text để backward compatibility

#### API lấy danh sách đơn hàng admin (`GET /api/admin/orders`):
- ✅ JOIN với `user_addresses`, `provinces`, `districts`, `wards`
- ✅ Trả về thông tin chi tiết từ user_addresses:
  - `address_name`, `address_phone` (từ user_addresses)
  - `address_detail`, `ward_name`, `district_name`, `province_name`
  - `user_fullname`, `user_phone` (từ users table)

#### API lấy chi tiết đơn hàng admin (`GET /api/admin/orders/:id`):
- ✅ JOIN với `user_addresses` và địa danh
- ✅ Trả về thông tin đầy đủ cho modal chi tiết

### 3. Frontend Updates (js/admin/orders.js)

#### Bảng danh sách đơn hàng:
- ✅ Ưu tiên hiển thị `address_name` và `address_phone`
- ✅ Fallback về `shipping_name` và `shipping_phone` cho đơn hàng cũ

#### Modal chi tiết đơn hàng:
- ✅ **Thông tin giao hàng** (ưu tiên từ user_addresses):
  - Người nhận: `address_name` || `shipping_name`
  - SĐT: `address_phone` || `shipping_phone`
  - Địa chỉ: `address_detail + ward + district + province` || `shipping_address`

- ✅ **Thông tin khách hàng** (từ users table):
  - Tên đăng nhập: `username`
  - Email: `email`
  - Họ tên: `user_fullname`
  - SĐT cá nhân: `user_phone`

#### Mock orders:
- ✅ Cập nhật với thông tin đầy đủ từ user_addresses
- ✅ Thêm `address_name`, `address_phone`, `address_detail`, etc.

## Kết quả mong đợi:

### Đơn hàng mới (có address_id):
- **Hiển thị thông tin từ user_addresses**: tên, SĐT, địa chỉ chi tiết với tỉnh/huyện/xã
- **Thông tin luôn cập nhật** theo địa chỉ hiện tại trong user_addresses
- **Phân biệt rõ** thông tin giao hàng vs thông tin cá nhân

### Đơn hàng cũ (không có address_id):
- **Fallback về shipping_name, shipping_phone, shipping_address**
- **Vẫn hiển thị được** thông tin cơ bản
- **Không bị lỗi** khi không có liên kết user_addresses

## Cách test:

### Test Case 1: Đơn hàng mới với address_id
1. Chạy SQL: `add_address_id_to_orders.sql`
2. Tạo đơn hàng mới từ checkout (đã có address_id)
3. Vào admin orders, kiểm tra:
   - Bảng hiển thị tên và SĐT từ user_addresses
   - Modal chi tiết hiển thị địa chỉ đầy đủ với tỉnh/huyện/xã
   - Phân biệt rõ thông tin giao hàng vs khách hàng

### Test Case 2: Đơn hàng cũ không có address_id
1. Kiểm tra đơn hàng cũ trong database (address_id = NULL)
2. Vào admin orders, kiểm tra:
   - Vẫn hiển thị được thông tin từ shipping_name/phone/address
   - Không bị lỗi hoặc hiển thị "null"

### Test Case 3: Mock orders
1. Tắt server hoặc sửa API URL
2. Kiểm tra mock orders hiển thị đúng format mới

### Test Case 4: Cập nhật địa chỉ
1. User cập nhật địa chỉ trong profile
2. Admin xem đơn hàng cũ → vẫn hiển thị địa chỉ cũ (từ shipping_address)
3. Admin xem đơn hàng mới → hiển thị địa chỉ mới (từ user_addresses)

## Lợi ích:

### ✅ **Thông tin chính xác hơn**:
- Admin thấy thông tin địa chỉ giao hàng thực tế từ user_addresses
- Địa chỉ có đầy đủ tỉnh/huyện/xã thay vì chỉ text

### ✅ **Phân biệt rõ ràng**:
- Thông tin giao hàng (từ địa chỉ được chọn)
- Thông tin cá nhân (từ profile user)

### ✅ **Backward compatibility**:
- Đơn hàng cũ vẫn hiển thị được
- Không bị break khi migrate

### ✅ **Cập nhật real-time**:
- Nếu user cập nhật địa chỉ, admin sẽ thấy thông tin mới nhất
- (Chỉ áp dụng cho đơn hàng có address_id)

## Lưu ý:
- Cần chạy SQL migration trước khi test
- Đơn hàng cũ sẽ có address_id = NULL
- Đơn hàng mới sẽ có address_id liên kết với user_addresses
