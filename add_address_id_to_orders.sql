
ALTER TABLE orders ADD COLUMN address_id INT NULL AFTER user_id;
ALTER TABLE orders ADD CONSTRAINT orders_address_fk 
FOREIGN KEY (address_id) REFERENCES user_addresses(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_address_id ON orders(address_id);

