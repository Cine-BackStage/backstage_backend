-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "room_type" AS ENUM ('TWO_D', 'THREE_D', 'IMAX', 'EXTREME', 'VIP');

-- CreateEnum
CREATE TYPE "sale_status" AS ENUM ('OPEN', 'FINALIZED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "employee_role" AS ENUM ('CASHIER', 'MANAGER', 'ADMIN', 'MAINTENANCE', 'SECURITY');

-- CreateEnum
CREATE TYPE "time_entry_type" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'PIX', 'OTHER');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('ISSUED', 'USED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('PERCENT', 'AMOUNT', 'BOGO');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "company" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "trade_name" VARCHAR(200),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "zip_code" VARCHAR(10),
    "phone" VARCHAR(20),
    "email" VARCHAR(200),
    "website" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_subscription" (
    "company_id" UUID NOT NULL,
    "plan" "subscription_plan" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "max_employees" INTEGER NOT NULL,
    "max_rooms" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "monthly_fee" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_subscription_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "system_admin" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "cpf" VARCHAR(11) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_pkey" PRIMARY KEY ("cpf")
);

-- CreateTable
CREATE TABLE "customer" (
    "cpf" VARCHAR(11) NOT NULL,
    "company_id" UUID NOT NULL,
    "birth_date" DATE,
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("cpf","company_id")
);

-- CreateTable
CREATE TABLE "employee" (
    "cpf" VARCHAR(11) NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "role" "employee_role" NOT NULL,
    "hire_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" VARCHAR(255),
    "permissions" JSONB,
    "last_login" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("cpf","company_id")
);

-- CreateTable
CREATE TABLE "time_entry" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_cpf" VARCHAR(11) NOT NULL,
    "entry_type" "time_entry_type" NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "location" VARCHAR(100),

    CONSTRAINT "time_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "genre" VARCHAR(80),
    "description" TEXT,
    "rating" VARCHAR(10),
    "poster_url" VARCHAR(500),
    "release_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_map" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "layout" JSONB,

    CONSTRAINT "seat_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat" (
    "id" VARCHAR(10) NOT NULL,
    "seat_map_id" UUID NOT NULL,
    "row_label" VARCHAR(5) NOT NULL,
    "number" INTEGER NOT NULL,
    "is_accessible" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "seat_pkey" PRIMARY KEY ("seat_map_id","id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "room_type" "room_type" NOT NULL,
    "seat_map_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_price" (
    "company_id" UUID NOT NULL,
    "room_type" "room_type" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_type_price_pkey" PRIMARY KEY ("company_id","room_type")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,
    "base_price" DECIMAL(10,2),
    "status" "session_status" NOT NULL DEFAULT 'SCHEDULED',
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "seat_map_id" UUID NOT NULL,
    "seat_id" VARCHAR(10) NOT NULL,
    "sale_id" UUID,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "ticket_status" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(6),
    "qr_code" VARCHAR(100) NOT NULL,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_reservation" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "seat_map_id" UUID NOT NULL,
    "seat_id" VARCHAR(10) NOT NULL,
    "reservation_token" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "seat_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "sku" VARCHAR(50) NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "qty_on_hand" INTEGER NOT NULL,
    "reorder_level" INTEGER NOT NULL,
    "barcode" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("company_id","sku")
);

-- CreateTable
CREATE TABLE "food" (
    "company_id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "expiry_date" DATE,
    "is_combo" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(100),

    CONSTRAINT "food_pkey" PRIMARY KEY ("company_id","sku")
);

-- CreateTable
CREATE TABLE "collectable" (
    "company_id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,

    CONSTRAINT "collectable_pkey" PRIMARY KEY ("company_id","sku")
);

-- CreateTable
CREATE TABLE "inventory_adjustment" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "actor_cpf" VARCHAR(11) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(500),

    CONSTRAINT "inventory_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_code" (
    "code" VARCHAR(50) NOT NULL,
    "company_id" UUID NOT NULL,
    "description" VARCHAR(200),
    "type" "discount_type" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "valid_from" TIMESTAMP(6) NOT NULL,
    "valid_to" TIMESTAMP(6) NOT NULL,
    "cpf_range_start" VARCHAR(11),
    "cpf_range_end" VARCHAR(11),
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_code_pkey" PRIMARY KEY ("company_id","code")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cashier_cpf" VARCHAR(11) NOT NULL,
    "buyer_cpf" VARCHAR(11),
    "sub_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "sale_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "sku" VARCHAR(50),
    "session_id" UUID,
    "seat_id" VARCHAR(10),
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_discount" (
    "sale_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "applied_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_discount_pkey" PRIMARY KEY ("sale_id","company_id","code")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "method" "payment_method" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "auth_code" VARCHAR(100),
    "paid_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "actor_cpf" VARCHAR(11) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" VARCHAR(100),
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata_json" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_cnpj_key" ON "company"("cnpj");

-- CreateIndex
CREATE INDEX "company_is_active_idx" ON "company"("is_active");

-- CreateIndex
CREATE INDEX "company_cnpj_idx" ON "company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_username_key" ON "system_admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_email_key" ON "system_admin"("email");

-- CreateIndex
CREATE INDEX "person_email_idx" ON "person"("email");

-- CreateIndex
CREATE INDEX "customer_company_id_idx" ON "customer"("company_id");

-- CreateIndex
CREATE INDEX "employee_company_id_idx" ON "employee"("company_id");

-- CreateIndex
CREATE INDEX "employee_company_id_is_active_idx" ON "employee"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "employee_company_id_role_idx" ON "employee"("company_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "employee_company_id_employee_id_key" ON "employee"("company_id", "employee_id");

-- CreateIndex
CREATE INDEX "time_entry_company_id_idx" ON "time_entry"("company_id");

-- CreateIndex
CREATE INDEX "time_entry_company_id_employee_cpf_idx" ON "time_entry"("company_id", "employee_cpf");

-- CreateIndex
CREATE INDEX "time_entry_company_id_timestamp_idx" ON "time_entry"("company_id", "timestamp");

-- CreateIndex
CREATE INDEX "time_entry_company_id_entry_type_idx" ON "time_entry"("company_id", "entry_type");

-- CreateIndex
CREATE INDEX "movie_company_id_idx" ON "movie"("company_id");

-- CreateIndex
CREATE INDEX "movie_company_id_is_active_idx" ON "movie"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "movie_company_id_deleted_at_idx" ON "movie"("company_id", "deleted_at");

-- CreateIndex
CREATE INDEX "seat_map_company_id_idx" ON "seat_map"("company_id");

-- CreateIndex
CREATE INDEX "seat_seat_map_id_is_active_idx" ON "seat"("seat_map_id", "is_active");

-- CreateIndex
CREATE INDEX "room_company_id_idx" ON "room"("company_id");

-- CreateIndex
CREATE INDEX "room_company_id_is_active_idx" ON "room"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "room_company_id_deleted_at_idx" ON "room"("company_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "room_company_id_name_key" ON "room"("company_id", "name");

-- CreateIndex
CREATE INDEX "session_company_id_idx" ON "session"("company_id");

-- CreateIndex
CREATE INDEX "session_company_id_movie_id_idx" ON "session"("company_id", "movie_id");

-- CreateIndex
CREATE INDEX "session_company_id_room_id_idx" ON "session"("company_id", "room_id");

-- CreateIndex
CREATE INDEX "session_company_id_start_time_idx" ON "session"("company_id", "start_time");

-- CreateIndex
CREATE INDEX "session_company_id_deleted_at_idx" ON "session"("company_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_qr_code_key" ON "ticket"("qr_code");

-- CreateIndex
CREATE INDEX "ticket_company_id_idx" ON "ticket"("company_id");

-- CreateIndex
CREATE INDEX "ticket_company_id_session_id_idx" ON "ticket"("company_id", "session_id");

-- CreateIndex
CREATE INDEX "ticket_company_id_status_idx" ON "ticket"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_company_id_session_id_seat_map_id_seat_id_key" ON "ticket"("company_id", "session_id", "seat_map_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_reservation_reservation_token_key" ON "seat_reservation"("reservation_token");

-- CreateIndex
CREATE INDEX "seat_reservation_company_id_idx" ON "seat_reservation"("company_id");

-- CreateIndex
CREATE INDEX "seat_reservation_company_id_session_id_idx" ON "seat_reservation"("company_id", "session_id");

-- CreateIndex
CREATE INDEX "seat_reservation_reservation_token_idx" ON "seat_reservation"("reservation_token");

-- CreateIndex
CREATE INDEX "seat_reservation_expires_at_idx" ON "seat_reservation"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "seat_reservation_company_id_session_id_seat_map_id_seat_id_key" ON "seat_reservation"("company_id", "session_id", "seat_map_id", "seat_id");

-- CreateIndex
CREATE INDEX "inventory_item_company_id_idx" ON "inventory_item"("company_id");

-- CreateIndex
CREATE INDEX "inventory_item_company_id_is_active_idx" ON "inventory_item"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "inventory_item_company_id_barcode_idx" ON "inventory_item"("company_id", "barcode");

-- CreateIndex
CREATE INDEX "inventory_adjustment_company_id_idx" ON "inventory_adjustment"("company_id");

-- CreateIndex
CREATE INDEX "inventory_adjustment_company_id_sku_idx" ON "inventory_adjustment"("company_id", "sku");

-- CreateIndex
CREATE INDEX "inventory_adjustment_company_id_timestamp_idx" ON "inventory_adjustment"("company_id", "timestamp");

-- CreateIndex
CREATE INDEX "discount_code_company_id_idx" ON "discount_code"("company_id");

-- CreateIndex
CREATE INDEX "discount_code_company_id_is_active_idx" ON "discount_code"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "discount_code_company_id_valid_from_valid_to_idx" ON "discount_code"("company_id", "valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "sale_company_id_idx" ON "sale"("company_id");

-- CreateIndex
CREATE INDEX "sale_company_id_cashier_cpf_idx" ON "sale"("company_id", "cashier_cpf");

-- CreateIndex
CREATE INDEX "sale_company_id_buyer_cpf_idx" ON "sale"("company_id", "buyer_cpf");

-- CreateIndex
CREATE INDEX "sale_company_id_created_at_idx" ON "sale"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "sale_company_id_status_idx" ON "sale"("company_id", "status");

-- CreateIndex
CREATE INDEX "sale_item_sale_id_idx" ON "sale_item"("sale_id");

-- CreateIndex
CREATE INDEX "sale_item_company_id_idx" ON "sale_item"("company_id");

-- CreateIndex
CREATE INDEX "payment_company_id_idx" ON "payment"("company_id");

-- CreateIndex
CREATE INDEX "payment_company_id_sale_id_idx" ON "payment"("company_id", "sale_id");

-- CreateIndex
CREATE INDEX "audit_log_company_id_idx" ON "audit_log"("company_id");

-- CreateIndex
CREATE INDEX "audit_log_company_id_actor_cpf_idx" ON "audit_log"("company_id", "actor_cpf");

-- CreateIndex
CREATE INDEX "audit_log_company_id_timestamp_idx" ON "audit_log"("company_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_log_company_id_action_idx" ON "audit_log"("company_id", "action");

-- CreateIndex
CREATE INDEX "audit_log_company_id_target_type_idx" ON "audit_log"("company_id", "target_type");

-- AddForeignKey
ALTER TABLE "company_subscription" ADD CONSTRAINT "company_subscription_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_cpf_fkey" FOREIGN KEY ("cpf") REFERENCES "person"("cpf") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_cpf_fkey" FOREIGN KEY ("cpf") REFERENCES "person"("cpf") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_employee_cpf_company_id_fkey" FOREIGN KEY ("employee_cpf", "company_id") REFERENCES "employee"("cpf", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie" ADD CONSTRAINT "movie_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_map" ADD CONSTRAINT "seat_map_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat" ADD CONSTRAINT "seat_seat_map_id_fkey" FOREIGN KEY ("seat_map_id") REFERENCES "seat_map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_seat_map_id_fkey" FOREIGN KEY ("seat_map_id") REFERENCES "seat_map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_price" ADD CONSTRAINT "room_type_price_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_seat_map_id_seat_id_fkey" FOREIGN KEY ("seat_map_id", "seat_id") REFERENCES "seat"("seat_map_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_reservation" ADD CONSTRAINT "seat_reservation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_reservation" ADD CONSTRAINT "seat_reservation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_reservation" ADD CONSTRAINT "seat_reservation_seat_map_id_seat_id_fkey" FOREIGN KEY ("seat_map_id", "seat_id") REFERENCES "seat"("seat_map_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food" ADD CONSTRAINT "food_company_id_sku_fkey" FOREIGN KEY ("company_id", "sku") REFERENCES "inventory_item"("company_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectable" ADD CONSTRAINT "collectable_company_id_sku_fkey" FOREIGN KEY ("company_id", "sku") REFERENCES "inventory_item"("company_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_company_id_sku_fkey" FOREIGN KEY ("company_id", "sku") REFERENCES "inventory_item"("company_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_actor_cpf_company_id_fkey" FOREIGN KEY ("actor_cpf", "company_id") REFERENCES "employee"("cpf", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_code" ADD CONSTRAINT "discount_code_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_cashier_cpf_company_id_fkey" FOREIGN KEY ("cashier_cpf", "company_id") REFERENCES "employee"("cpf", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_buyer_cpf_company_id_fkey" FOREIGN KEY ("buyer_cpf", "company_id") REFERENCES "customer"("cpf", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_company_id_sku_fkey" FOREIGN KEY ("company_id", "sku") REFERENCES "inventory_item"("company_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_discount" ADD CONSTRAINT "sale_discount_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_discount" ADD CONSTRAINT "sale_discount_company_id_code_fkey" FOREIGN KEY ("company_id", "code") REFERENCES "discount_code"("company_id", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_cpf_company_id_fkey" FOREIGN KEY ("actor_cpf", "company_id") REFERENCES "employee"("cpf", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

