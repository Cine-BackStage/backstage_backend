-- Multi-Tenant Migration Script - Phase 3: Update Constraints and Indexes
-- This script updates primary keys, foreign keys, and creates new indexes for multi-tenancy

BEGIN;

-- Make company_id columns NOT NULL (after data population)
ALTER TABLE customer ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE employee ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE movie ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE seat_map ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE room ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE session ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE ticket ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE inventory_item ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE discount_code ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE sale ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE payment ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE inventory_adjustment ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE time_entry ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE room_type_price ALTER COLUMN company_id SET NOT NULL;

-- Drop existing primary key constraints and unique constraints
ALTER TABLE customer DROP CONSTRAINT customer_pkey;
ALTER TABLE employee DROP CONSTRAINT employee_pkey;
ALTER TABLE employee DROP CONSTRAINT employee_employee_id_key;
ALTER TABLE inventory_item DROP CONSTRAINT inventory_item_pkey;
ALTER TABLE discount_code DROP CONSTRAINT discount_code_pkey;
ALTER TABLE room_type_price DROP CONSTRAINT room_type_price_pkey;

-- Create new compound primary keys for multi-tenant tables
ALTER TABLE customer ADD CONSTRAINT customer_pkey PRIMARY KEY (cpf, company_id);
ALTER TABLE employee ADD CONSTRAINT employee_pkey PRIMARY KEY (cpf, company_id);
ALTER TABLE inventory_item ADD CONSTRAINT inventory_item_pkey PRIMARY KEY (company_id, sku);
ALTER TABLE discount_code ADD CONSTRAINT discount_code_pkey PRIMARY KEY (company_id, code);
ALTER TABLE room_type_price ADD CONSTRAINT room_type_price_pkey PRIMARY KEY (company_id, room_type);

-- Add unique constraints
ALTER TABLE employee ADD CONSTRAINT employee_company_employee_id_unique UNIQUE (company_id, employee_id);
ALTER TABLE room ADD CONSTRAINT room_company_name_unique UNIQUE (company_id, name);
ALTER TABLE ticket ADD CONSTRAINT ticket_qr_code_unique UNIQUE (qr_code);
ALTER TABLE ticket ADD CONSTRAINT ticket_session_seat_unique UNIQUE (company_id, session_id, seatmap_id, seat_id);

-- Add foreign key constraints for company relationships
ALTER TABLE customer ADD CONSTRAINT customer_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE employee ADD CONSTRAINT employee_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE movie ADD CONSTRAINT movie_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE seat_map ADD CONSTRAINT seat_map_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE room ADD CONSTRAINT room_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE session ADD CONSTRAINT session_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE ticket ADD CONSTRAINT ticket_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE inventory_item ADD CONSTRAINT inventory_item_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE discount_code ADD CONSTRAINT discount_code_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE sale ADD CONSTRAINT sale_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE payment ADD CONSTRAINT payment_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE inventory_adjustment ADD CONSTRAINT inventory_adjustment_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE time_entry ADD CONSTRAINT time_entry_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE room_type_price ADD CONSTRAINT room_type_price_company_fk FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;

-- Update foreign key relationships to use compound keys
ALTER TABLE sale DROP CONSTRAINT IF EXISTS sale_buyer_cpf_fkey;
ALTER TABLE sale ADD CONSTRAINT sale_buyer_fk FOREIGN KEY (buyer_cpf, company_id) REFERENCES customer(cpf, company_id);

ALTER TABLE sale DROP CONSTRAINT IF EXISTS sale_cashier_cpf_fkey;
ALTER TABLE sale ADD CONSTRAINT sale_cashier_fk FOREIGN KEY (cashier_cpf, company_id) REFERENCES employee(cpf, company_id);

ALTER TABLE time_entry DROP CONSTRAINT IF EXISTS time_entry_employee_cpf_fkey;
ALTER TABLE time_entry ADD CONSTRAINT time_entry_employee_fk FOREIGN KEY (employee_cpf, company_id) REFERENCES employee(cpf, company_id);

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_cpf_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_fk FOREIGN KEY (actor_cpf, company_id) REFERENCES employee(cpf, company_id);

ALTER TABLE inventory_adjustment DROP CONSTRAINT IF EXISTS inventory_adjustment_adjusted_by_fkey;
ALTER TABLE inventory_adjustment ADD CONSTRAINT inventory_adjustment_actor_fk FOREIGN KEY (actor_cpf, company_id) REFERENCES employee(cpf, company_id);

ALTER TABLE inventory_adjustment DROP CONSTRAINT IF EXISTS inventory_adjustment_sku_fkey;
ALTER TABLE inventory_adjustment ADD CONSTRAINT inventory_adjustment_item_fk FOREIGN KEY (company_id, sku) REFERENCES inventory_item(company_id, sku);

ALTER TABLE food DROP CONSTRAINT IF EXISTS food_sku_fkey;
ALTER TABLE food ADD COLUMN company_id UUID;
UPDATE food SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
ALTER TABLE food ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE food DROP CONSTRAINT food_pkey;
ALTER TABLE food ADD CONSTRAINT food_pkey PRIMARY KEY (company_id, sku);
ALTER TABLE food ADD CONSTRAINT food_item_fk FOREIGN KEY (company_id, sku) REFERENCES inventory_item(company_id, sku);

ALTER TABLE collectable DROP CONSTRAINT IF EXISTS collectable_sku_fkey;
ALTER TABLE collectable ADD COLUMN company_id UUID;
UPDATE collectable SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
ALTER TABLE collectable ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE collectable DROP CONSTRAINT collectable_pkey;
ALTER TABLE collectable ADD CONSTRAINT collectable_pkey PRIMARY KEY (company_id, sku);
ALTER TABLE collectable ADD CONSTRAINT collectable_item_fk FOREIGN KEY (company_id, sku) REFERENCES inventory_item(company_id, sku);

ALTER TABLE sale_item DROP CONSTRAINT IF EXISTS sale_item_sku_fkey;
-- Note: sale_item relationship with inventory_item will be handled in application layer due to optional sku

ALTER TABLE sale_discount ADD COLUMN company_id UUID;
UPDATE sale_discount SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
ALTER TABLE sale_discount ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE sale_discount DROP CONSTRAINT sale_discount_pkey;
ALTER TABLE sale_discount ADD CONSTRAINT sale_discount_pkey PRIMARY KEY (sale_id, company_id, code);
ALTER TABLE sale_discount DROP CONSTRAINT IF EXISTS sale_discount_code_fkey;
ALTER TABLE sale_discount ADD CONSTRAINT sale_discount_code_fk FOREIGN KEY (company_id, code) REFERENCES discount_code(company_id, code);

-- Create performance indexes for multi-tenant queries
CREATE INDEX idx_customer_company ON customer(company_id);
CREATE INDEX idx_employee_company ON employee(company_id);
CREATE INDEX idx_employee_company_active ON employee(company_id, is_active);
CREATE INDEX idx_employee_company_role ON employee(company_id, role);

CREATE INDEX idx_movie_company ON movie(company_id);
CREATE INDEX idx_movie_company_active ON movie(company_id, is_active);

CREATE INDEX idx_seat_map_company ON seat_map(company_id);
CREATE INDEX idx_seat_active ON seat(seatmap_id, is_active);

CREATE INDEX idx_room_company ON room(company_id);
CREATE INDEX idx_room_company_active ON room(company_id, is_active);

CREATE INDEX idx_session_company ON session(company_id);
CREATE INDEX idx_session_company_movie ON session(company_id, movie_id);
CREATE INDEX idx_session_company_room ON session(company_id, room_id);
CREATE INDEX idx_session_company_start_time ON session(company_id, start_time);

CREATE INDEX idx_ticket_company ON ticket(company_id);
CREATE INDEX idx_ticket_company_session ON ticket(company_id, session_id);
CREATE INDEX idx_ticket_company_status ON ticket(company_id, status);

CREATE INDEX idx_inventory_item_company ON inventory_item(company_id);
CREATE INDEX idx_inventory_item_company_active ON inventory_item(company_id, is_active);
CREATE INDEX idx_inventory_item_company_barcode ON inventory_item(company_id, barcode);

CREATE INDEX idx_discount_code_company ON discount_code(company_id);
CREATE INDEX idx_discount_code_company_active ON discount_code(company_id, is_active);
CREATE INDEX idx_discount_code_company_valid ON discount_code(company_id, valid_from, valid_to);

CREATE INDEX idx_sale_company ON sale(company_id);
CREATE INDEX idx_sale_company_cashier ON sale(company_id, cashier_cpf);
CREATE INDEX idx_sale_company_buyer ON sale(company_id, buyer_cpf);
CREATE INDEX idx_sale_company_created ON sale(company_id, created_at);
CREATE INDEX idx_sale_company_status ON sale(company_id, status);

CREATE INDEX idx_payment_company ON payment(company_id);
CREATE INDEX idx_payment_company_sale ON payment(company_id, sale_id);

CREATE INDEX idx_inventory_adjustment_company ON inventory_adjustment(company_id);
CREATE INDEX idx_inventory_adjustment_company_sku ON inventory_adjustment(company_id, sku);
CREATE INDEX idx_inventory_adjustment_company_timestamp ON inventory_adjustment(company_id, timestamp);

CREATE INDEX idx_time_entry_company ON time_entry(company_id);
CREATE INDEX idx_time_entry_company_employee ON time_entry(company_id, employee_cpf);
CREATE INDEX idx_time_entry_company_timestamp ON time_entry(company_id, timestamp);
CREATE INDEX idx_time_entry_company_type ON time_entry(company_id, entry_type);

CREATE INDEX idx_audit_log_company ON audit_log(company_id);
CREATE INDEX idx_audit_log_company_actor ON audit_log(company_id, actor_cpf);
CREATE INDEX idx_audit_log_company_timestamp ON audit_log(company_id, timestamp);
CREATE INDEX idx_audit_log_company_action ON audit_log(company_id, action);
CREATE INDEX idx_audit_log_company_target_type ON audit_log(company_id, target_type);

-- Clean up old columns that have been renamed/replaced
ALTER TABLE sale_item DROP COLUMN IF EXISTS old_price;
ALTER TABLE payment DROP COLUMN IF EXISTS old_method;
ALTER TABLE payment DROP COLUMN IF EXISTS old_processed_at;

-- Update ID columns to use UUID where needed
ALTER TABLE movie ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE seat_map ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE room ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE session ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE ticket ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE sale ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE sale_item ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE sale_item ALTER COLUMN sale_id TYPE UUID;
ALTER TABLE payment ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE payment ALTER COLUMN sale_id TYPE UUID;
ALTER TABLE inventory_adjustment ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE time_entry ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE audit_log ALTER COLUMN id TYPE UUID USING gen_random_uuid();

COMMIT;