-- =====================================
-- Create Enums - Production
-- =====================================

CREATE TYPE sale_status AS ENUM (
  'OPEN',
  'FINALIZED',
  'CANCELED',
  'REFUNDED'
);

CREATE TYPE payment_method AS ENUM (
  'CASH',
  'CARD',
  'PIX',
  'OTHER'
);

CREATE TYPE session_status AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'CANCELED',
  'COMPLETED'
);

CREATE TYPE room_type AS ENUM (
  'TWO_D',
  'THREE_D',
  'EXTREME'
);

CREATE TYPE discount_type AS ENUM (
  'PERCENT',
  'AMOUNT'
);