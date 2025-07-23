-- Kiểm tra dữ liệu trong bảng user_addresses
SELECT * FROM user_addresses;

-- Kiểm tra cấu trúc bảng orders sau khi thêm address_id
DESCRIBE orders;

-- Kiểm tra đơn hàng có address_id
SELECT id, order_code, user_id, address_id, shipping_name, shipping_phone, shipping_address 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Nếu chưa có dữ liệu user_addresses, thêm dữ liệu mẫu:
INSERT INTO user_addresses (user_id, name, phone, province_id, district_id, ward_id, address_detail, is_default) 
VALUES 
(1, 'Nguyễn Văn A', '0987654321', 1, 1, 1, '123 Đường ABC', 1),
(2, 'Trần Thị B', '0123456789', 1, 2, 5, '456 Đường XYZ', 1),
(3, 'Lê Văn C', '0369852147', 2, 10, 50, '789 Đường DEF', 1);

-- Kiểm tra lại sau khi thêm
SELECT ua.*, p.name as province_name, d.name as district_name, w.name as ward_name
FROM user_addresses ua
LEFT JOIN provinces p ON ua.province_id = p.id
LEFT JOIN districts d ON ua.district_id = d.id  
LEFT JOIN wards w ON ua.ward_id = w.id;
