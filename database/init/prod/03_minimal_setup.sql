-- =====================================
-- Minimal Production Setup - Required Data Only
-- =====================================

-- REQUIRED: Room Type Pricing (system cannot function without this)
INSERT INTO room_type_price (room_type, price) VALUES
('TWO_D', 25.00),
('THREE_D', 35.00),
('EXTREME', 45.00);

-- Note: No sample data inserted for production
-- The following tables will be empty and populated by the application:
-- - person, customer, employee, admin
-- - movie, session, ticket
-- - inventory_item, food, collectable
-- - sale, sale_item, payment
-- - discount_code

-- System is ready for production use