-- =====================================
-- Seed Data for Cinema Management System
-- =====================================

-- Room Type Pricing
INSERT INTO room_type_price (room_type, price) VALUES
('TWO_D', 25.00),
('THREE_D', 35.00),
('EXTREME', 45.00);

-- Sample Movies
INSERT INTO movie (title, duration_min, genre, description) VALUES
('Avatar: The Way of Water', 192, 'Sci-Fi', 'Set more than a decade after the events of the first film, Avatar: The Way of Water begins to tell the story of the Sully family.'),
('Top Gun: Maverick', 131, 'Action', 'After thirty years, Maverick is still pushing the envelope as a top naval aviator.'),
('Black Panther: Wakanda Forever', 161, 'Action', 'The people of Wakanda fight to protect their home from intervening world powers.'),
('Spider-Man: No Way Home', 148, 'Action', 'Peter Parker seeks help from Doctor Strange when his secret identity is revealed.'),
('The Batman', 176, 'Action', 'Batman ventures into Gothams underworld when a sadistic killer leaves behind a trail of cryptic clues.');

-- Seat Maps
INSERT INTO seat_map (rows, cols, version) VALUES
(10, 15, 1), -- Standard cinema
(8, 12, 1),  -- Smaller room
(12, 20, 1); -- Large EXTREME room

-- Rooms
INSERT INTO room (name, capacity, room_type, seatmap_id) VALUES
('Sala 1', 150, 'TWO_D', 1),
('Sala 2', 96, 'THREE_D', 2),
('Sala 3', 240, 'EXTREME', 3),
('Sala 4', 150, 'TWO_D', 1),
('Sala 5', 96, 'THREE_D', 2);

-- Sample Seats for Seat Map 1 (10 rows, 15 cols)
INSERT INTO seat (seatmap_id, id, row_label, number, is_accessible) 
SELECT 1, CONCAT(chr(64 + generate_series), lpad(col::text, 2, '0')), chr(64 + generate_series), col, 
       CASE WHEN generate_series = 1 AND col IN (1,2,14,15) THEN TRUE ELSE FALSE END
FROM generate_series(1, 10) AS generate_series,
     generate_series(1, 15) AS col;

-- Sample Seats for Seat Map 2 (8 rows, 12 cols)
INSERT INTO seat (seatmap_id, id, row_label, number, is_accessible) 
SELECT 2, CONCAT(chr(64 + generate_series), lpad(col::text, 2, '0')), chr(64 + generate_series), col, 
       CASE WHEN generate_series = 1 AND col IN (1,2,11,12) THEN TRUE ELSE FALSE END
FROM generate_series(1, 8) AS generate_series,
     generate_series(1, 12) AS col;

-- Sample Seats for Seat Map 3 (12 rows, 20 cols)
INSERT INTO seat (seatmap_id, id, row_label, number, is_accessible) 
SELECT 3, CONCAT(chr(64 + generate_series), lpad(col::text, 2, '0')), chr(64 + generate_series), col, 
       CASE WHEN generate_series = 1 AND col IN (1,2,19,20) THEN TRUE ELSE FALSE END
FROM generate_series(1, 12) AS generate_series,
     generate_series(1, 20) AS col;

-- Sample People
INSERT INTO person (cpf, full_name, email, phone) VALUES
('12345678901', 'João Silva', 'joao.silva@email.com', '(11) 99999-1234'),
('12345678902', 'Maria Santos', 'maria.santos@email.com', '(11) 99999-5678'),
('12345678903', 'Carlos Oliveira', 'carlos.oliveira@email.com', '(11) 99999-9012'),
('12345678904', 'Ana Costa', 'ana.costa@email.com', '(11) 99999-3456'),
('12345678905', 'Pedro Almeida', 'pedro.almeida@cinema.com', '(11) 99999-7890');

-- Sample Customers
INSERT INTO customer (cpf, birth_date) VALUES
('12345678901', '1985-05-15'),
('12345678902', '1990-08-22'),
('12345678903', '1988-03-10'),
('12345678904', '1992-12-05');

-- Sample Employees
INSERT INTO employee (cpf, employee_id, role, hire_date, is_active) VALUES
('12345678905', 'EMP001', 'Atendente', '2023-01-15', TRUE);

-- Sample Admin
INSERT INTO admin (cpf, permissions) VALUES
('12345678905', '{"manage_employees": true, "manage_pricing": true, "view_reports": true}');

-- Sample Sessions (next 7 days)
INSERT INTO session (movie_id, room_id, start_time, end_time, status) VALUES
(1, 1, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '14 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '17 hours', 'SCHEDULED'),
(2, 2, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '19 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '21 hours 11 minutes', 'SCHEDULED'),
(3, 3, CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '15 hours', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '17 hours 41 minutes', 'SCHEDULED'),
(4, 1, CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '20 hours', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '22 hours 28 minutes', 'SCHEDULED'),
(5, 2, CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '16 hours', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '18 hours 56 minutes', 'SCHEDULED');

-- Sample Inventory Items
INSERT INTO inventory_item (sku, name, unit_price, qty_on_hand, reorder_level, barcode) VALUES
('PIPOCA_P', 'Pipoca Pequena', 8.50, 100, 20, '7891234567890'),
('PIPOCA_M', 'Pipoca Média', 12.00, 80, 15, '7891234567891'),
('PIPOCA_G', 'Pipoca Grande', 15.50, 60, 10, '7891234567892'),
('REFRI_P', 'Refrigerante Pequeno', 6.00, 120, 25, '7891234567893'),
('REFRI_M', 'Refrigerante Médio', 8.50, 100, 20, '7891234567894'),
('REFRI_G', 'Refrigerante Grande', 11.00, 80, 15, '7891234567895'),
('COMBO_1', 'Combo 1 - Pipoca P + Refri P', 13.00, 50, 10, '7891234567896'),
('COMBO_2', 'Combo 2 - Pipoca M + Refri M', 18.00, 40, 8, '7891234567897'),
('COMBO_3', 'Combo 3 - Pipoca G + Refri G', 23.00, 30, 6, '7891234567898'),
('FIGURINE_1', 'Boneco Homem-Aranha', 25.00, 20, 5, '7891234567899');

-- Food Items
INSERT INTO food (sku, expiry_date, is_combo) VALUES
('PIPOCA_P', NULL, FALSE),
('PIPOCA_M', NULL, FALSE),
('PIPOCA_G', NULL, FALSE),
('REFRI_P', CURRENT_DATE + INTERVAL '6 months', FALSE),
('REFRI_M', CURRENT_DATE + INTERVAL '6 months', FALSE),
('REFRI_G', CURRENT_DATE + INTERVAL '6 months', FALSE),
('COMBO_1', NULL, TRUE),
('COMBO_2', NULL, TRUE),
('COMBO_3', NULL, TRUE);

-- Collectables
INSERT INTO collectable (sku, category, brand) VALUES
('FIGURINE_1', 'Action Figures', 'Marvel');

-- Sample Discount Codes
INSERT INTO discount_code (code, description, type, value, valid_from, valid_to) VALUES
('WELCOME10', '10% de desconto para novos clientes', 'PERCENT', 10.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days'),
('STUDENT15', '15% de desconto estudantes', 'PERCENT', 15.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days'),
('COMBO5OFF', 'R$ 5,00 de desconto em combos', 'AMOUNT', 5.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days');