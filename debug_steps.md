# Debug Steps - Tại sao địa chỉ giao hàng chưa đổi

## Bước 1: Kiểm tra Database Schema
```sql
-- Kiểm tra xem trường address_id đã được thêm chưa
DESCRIBE orders;

-- Kết quả mong đợi: phải có trường address_id
```

## Bước 2: Chạy SQL Migration (nếu chưa chạy)
```sql
-- Chạy file add_address_id_to_orders.sql
ALTER TABLE orders ADD COLUMN address_id INT NULL AFTER user_id;
ALTER TABLE orders ADD CONSTRAINT orders_address_fk 
FOREIGN KEY (address_id) REFERENCES user_addresses(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_address_id ON orders(address_id);
```

## Bước 3: Kiểm tra dữ liệu user_addresses
```sql
-- Kiểm tra có dữ liệu không
SELECT COUNT(*) FROM user_addresses;

-- Nếu = 0, thêm dữ liệu mẫu:
INSERT INTO user_addresses (user_id, name, phone, province_id, district_id, ward_id, address_detail, is_default) 
VALUES 
(1, 'Nguyễn Văn A', '0987654321', 1, 1, 1, '123 Đường ABC', 1),
(2, 'Trần Thị B', '0123456789', 1, 2, 5, '456 Đường XYZ', 1);
```

## Bước 4: Tạo đơn hàng mới để test
- Vào trang checkout
- Tạo đơn hàng mới (sẽ có address_id)
- Kiểm tra trong admin

## Bước 5: Kiểm tra API Response
- Mở test_api_debug.html
- Click "Test API"
- Xem console log có address_name, address_phone không

## Bước 6: Kiểm tra Frontend
- Mở Developer Tools
- Vào Network tab
- Reload trang admin orders
- Xem API response có đúng structure không

## Bước 7: Force reload cache
- Ctrl + F5 để reload cache
- Hoặc xóa cache browser

## Các lỗi thường gặp:

### Lỗi 1: Chưa chạy SQL migration
**Triệu chứng**: API trả về lỗi "Unknown column 'address_id'"
**Giải pháp**: Chạy add_address_id_to_orders.sql

### Lỗi 2: Không có dữ liệu user_addresses  
**Triệu chứng**: address_name, address_phone = null
**Giải pháp**: Thêm dữ liệu mẫu vào user_addresses

### Lỗi 3: Đơn hàng cũ không có address_id
**Triệu chứng**: Vẫn hiển thị shipping_name thay vì address_name
**Giải pháp**: Tạo đơn hàng mới hoặc update address_id cho đơn cũ

### Lỗi 4: Cache browser
**Triệu chứng**: JavaScript cũ vẫn chạy
**Giải pháp**: Ctrl + F5 hoặc xóa cache

## Test nhanh:
1. Chạy: `DESCRIBE orders;` - phải có address_id
2. Chạy: `SELECT * FROM user_addresses;` - phải có dữ liệu  
3. Tạo đơn hàng mới từ checkout
4. Vào admin orders xem có đổi không
