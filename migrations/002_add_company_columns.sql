-- Multi-Tenant Migration Script - Phase 2: Add Company Columns
-- This script adds company_id columns to all tenant tables

BEGIN;

-- Add company_id column to existing tables (nullable initially for safe migration)
ALTER TABLE person ADD COLUMN created_at TIMESTAMP(6) DEFAULT now();
ALTER TABLE person ADD COLUMN updated_at TIMESTAMP(6) DEFAULT now();

ALTER TABLE customer ADD COLUMN company_id UUID;
ALTER TABLE customer ADD COLUMN loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customer ADD COLUMN created_at TIMESTAMP(6) DEFAULT now();
ALTER TABLE customer ADD COLUMN updated_at TIMESTAMP(6) DEFAULT now();

ALTER TABLE employee ADD COLUMN company_id UUID;

ALTER TABLE movie ADD COLUMN company_id UUID;
ALTER TABLE movie ADD COLUMN release_date DATE;

ALTER TABLE seat_map ADD COLUMN company_id UUID;
ALTER TABLE seat_map ADD COLUMN name VARCHAR(100) DEFAULT 'Default Seat Map';
ALTER TABLE seat_map ADD COLUMN layout JSON;

ALTER TABLE seat ADD COLUMN is_active BOOLEAN DEFAULT true;

ALTER TABLE room ADD COLUMN company_id UUID;
ALTER TABLE room ADD COLUMN is_active BOOLEAN DEFAULT true;

ALTER TABLE session ADD COLUMN company_id UUID;
ALTER TABLE session ADD COLUMN base_price DECIMAL(10,2);

ALTER TABLE ticket ADD COLUMN company_id UUID;
ALTER TABLE ticket ADD COLUMN sale_id UUID;
ALTER TABLE ticket ADD COLUMN status ticket_status DEFAULT 'ISSUED';
ALTER TABLE ticket ADD COLUMN used_at TIMESTAMP(6);
ALTER TABLE ticket ADD COLUMN qr_code VARCHAR(100);

ALTER TABLE inventory_item ADD COLUMN company_id UUID;
ALTER TABLE inventory_item ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE inventory_item ADD COLUMN created_at TIMESTAMP(6) DEFAULT now();
ALTER TABLE inventory_item ADD COLUMN updated_at TIMESTAMP(6) DEFAULT now();

ALTER TABLE food ADD COLUMN category VARCHAR(100);

ALTER TABLE discount_code ADD COLUMN company_id UUID;
ALTER TABLE discount_code ADD COLUMN type discount_type DEFAULT 'PERCENT';
ALTER TABLE discount_code ADD COLUMN cpf_range_start VARCHAR(11);
ALTER TABLE discount_code ADD COLUMN cpf_range_end VARCHAR(11);
ALTER TABLE discount_code ADD COLUMN max_uses INTEGER;
ALTER TABLE discount_code ADD COLUMN current_uses INTEGER DEFAULT 0;
ALTER TABLE discount_code ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE discount_code ADD COLUMN created_at TIMESTAMP(6) DEFAULT now();
ALTER TABLE discount_code ADD COLUMN updated_at TIMESTAMP(6) DEFAULT now();

ALTER TABLE sale ADD COLUMN company_id UUID;
ALTER TABLE sale ADD COLUMN tax_total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sale ADD COLUMN updated_at TIMESTAMP(6) DEFAULT now();

ALTER TABLE sale_item ADD COLUMN session_id INTEGER;
ALTER TABLE sale_item ADD COLUMN seat_id VARCHAR(10);
ALTER TABLE sale_item ADD COLUMN line_total DECIMAL(10,2);
ALTER TABLE sale_item ADD COLUMN unit_price DECIMAL(10,2);
-- Rename existing price column to avoid conflicts
ALTER TABLE sale_item RENAME COLUMN price TO old_price;

ALTER TABLE sale_discount ADD COLUMN applied_at TIMESTAMP(6) DEFAULT now();
ALTER TABLE sale_discount ADD COLUMN discount_amount DECIMAL(10,2);

ALTER TABLE payment ADD COLUMN company_id UUID;
ALTER TABLE payment ADD COLUMN method payment_method DEFAULT 'CASH';
ALTER TABLE payment ADD COLUMN auth_code VARCHAR(100);
ALTER TABLE payment ADD COLUMN paid_at TIMESTAMP(6) DEFAULT now();
-- Rename columns to match new schema
ALTER TABLE payment RENAME COLUMN payment_method TO old_method;
ALTER TABLE payment RENAME COLUMN processed_at TO old_processed_at;

ALTER TABLE inventory_adjustment ADD COLUMN company_id UUID;
ALTER TABLE inventory_adjustment RENAME COLUMN qtyChange TO delta;
ALTER TABLE inventory_adjustment RENAME COLUMN adjustedBy TO actor_cpf;
ALTER TABLE inventory_adjustment RENAME COLUMN adjustedAt TO timestamp;
ALTER TABLE inventory_adjustment ADD COLUMN notes VARCHAR(500);

ALTER TABLE time_entry ADD COLUMN company_id UUID;

ALTER TABLE audit_log ADD COLUMN company_id UUID;

ALTER TABLE room_type_price ADD COLUMN company_id UUID;
ALTER TABLE room_type_price ADD COLUMN updated_at TIMESTAMP(6) DEFAULT now();

-- Populate company_id with default company for all existing records
UPDATE customer SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE employee SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE movie SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE seat_map SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE room SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE session SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE ticket SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE inventory_item SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE discount_code SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE sale SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE payment SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE inventory_adjustment SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE time_entry SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE audit_log SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;
UPDATE room_type_price SET company_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE company_id IS NULL;

-- Update sale_item calculations
UPDATE sale_item SET
  unit_price = COALESCE(old_price, 0),
  line_total = COALESCE(old_price * quantity, 0)
WHERE unit_price IS NULL;

-- Generate unique QR codes for existing tickets
UPDATE ticket SET qr_code = 'TKT-' || id::text WHERE qr_code IS NULL;

-- Update payment method enum values
UPDATE payment SET method =
  CASE old_method
    WHEN 'cash' THEN 'CASH'::payment_method
    WHEN 'card' THEN 'CARD'::payment_method
    WHEN 'pix' THEN 'PIX'::payment_method
    ELSE 'OTHER'::payment_method
  END
WHERE method IS NULL;

UPDATE payment SET paid_at = COALESCE(old_processed_at, created_at) WHERE paid_at IS NULL;

COMMIT;