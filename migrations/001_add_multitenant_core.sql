-- Multi-Tenant Migration Script - Phase 1: Core Tables
-- This script adds the core multi-tenant tables and enums

BEGIN;

-- Create new enums for multi-tenant features
CREATE TYPE subscription_plan AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE discount_type AS ENUM ('PERCENT', 'AMOUNT', 'BOGO');
CREATE TYPE ticket_status AS ENUM ('ISSUED', 'USED', 'REFUNDED');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'PIX', 'OTHER');

-- Update existing room_type enum to add new types
ALTER TYPE room_type ADD VALUE 'IMAX';
ALTER TYPE room_type ADD VALUE 'VIP';

-- Create Company table (central tenant entity)
CREATE TABLE company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  trade_name VARCHAR(200),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(200),
  website VARCHAR(200),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP(6) DEFAULT now() NOT NULL,
  updated_at TIMESTAMP(6) DEFAULT now() NOT NULL
);

-- Create indexes for company table
CREATE INDEX idx_company_active ON company(is_active);
CREATE INDEX idx_company_cnpj ON company(cnpj);

-- Create Company Subscription table
CREATE TABLE company_subscription (
  company_id UUID PRIMARY KEY REFERENCES company(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  max_employees INTEGER NOT NULL,
  max_rooms INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  monthly_fee DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP(6) DEFAULT now() NOT NULL,
  updated_at TIMESTAMP(6) DEFAULT now() NOT NULL
);

-- Create System Admin table (cross-tenant administrators)
CREATE TABLE system_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_login TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT now() NOT NULL,
  updated_at TIMESTAMP(6) DEFAULT now() NOT NULL
);

-- Create indexes for system_admin
CREATE INDEX idx_system_admin_active ON system_admin(is_active);

-- Insert default company for existing data migration
INSERT INTO company (
  id,
  name,
  cnpj,
  trade_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Default Cinema Company',
  '00.000.000/0001-00',
  'Default Cinema',
  true,
  now(),
  now()
);

-- Insert default subscription for existing company
INSERT INTO company_subscription (
  company_id,
  plan,
  start_date,
  max_employees,
  max_rooms,
  monthly_fee,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'ENTERPRISE',
  CURRENT_DATE,
  1000,
  100,
  0.00,
  true
);

-- Create default system admin
INSERT INTO system_admin (
  username,
  email,
  password_hash,
  is_active
) VALUES (
  'sysadmin',
  'admin@cinema-system.com',
  '$2a$12$KNgxwb.Tz1v/6eV5WfXvXOMwv/rLDnBo7iK2LRAccMpjwjaQqfr7m', -- 'admin123'
  true
);

COMMIT;