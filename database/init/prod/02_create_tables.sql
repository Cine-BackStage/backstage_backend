-- =====================================
-- Production Tables - NO SAMPLE DATA
-- =====================================

-- People & Roles
CREATE TABLE person (
  cpf CHAR(11) PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer (
  cpf CHAR(11) PRIMARY KEY REFERENCES person(cpf) ON DELETE CASCADE,
  birth_date DATE
);

CREATE TABLE employee (
  cpf CHAR(11) PRIMARY KEY REFERENCES person(cpf) ON DELETE CASCADE,
  employee_id VARCHAR(40) UNIQUE NOT NULL,
  role VARCHAR(80) NOT NULL,
  hire_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE admin (
  cpf CHAR(11) PRIMARY KEY REFERENCES employee(cpf) ON DELETE CASCADE,
  permissions TEXT
);

-- Movies, Rooms, Sessions, Seats
CREATE TABLE movie (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  duration_min INTEGER NOT NULL,
  genre VARCHAR(80),
  description TEXT
);

CREATE TABLE seat_map (
  id SERIAL PRIMARY KEY,
  rows INTEGER NOT NULL,
  cols INTEGER NOT NULL,
  version INTEGER DEFAULT 1
);

CREATE TABLE room (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  room_type room_type NOT NULL,
  seatmap_id INTEGER REFERENCES seat_map(id)
);

CREATE TABLE seat (
  seatmap_id INTEGER REFERENCES seat_map(id),
  id VARCHAR(10),
  row_label VARCHAR(10) NOT NULL,
  number INTEGER NOT NULL,
  is_accessible BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (seatmap_id, id),
  UNIQUE (seatmap_id, row_label, number)
);

CREATE TABLE session (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movie(id),
  room_id INTEGER REFERENCES room(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status session_status DEFAULT 'SCHEDULED'
);

CREATE TABLE ticket (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES session(id),
  seatmap_id INTEGER,
  seat_id VARCHAR(10),
  price DECIMAL(10,2) NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seatmap_id, seat_id) REFERENCES seat(seatmap_id, id),
  UNIQUE (session_id, seatmap_id, seat_id)
);

-- Inventory & Stock
CREATE TABLE inventory_item (
  sku VARCHAR(40) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  qty_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  barcode VARCHAR(64)
);

CREATE TABLE food (
  sku VARCHAR(40) PRIMARY KEY REFERENCES inventory_item(sku) ON DELETE CASCADE,
  expiry_date DATE,
  is_combo BOOLEAN DEFAULT FALSE
);

CREATE TABLE collectable (
  sku VARCHAR(40) PRIMARY KEY REFERENCES inventory_item(sku) ON DELETE CASCADE,
  category VARCHAR(80),
  brand VARCHAR(80)
);

CREATE TABLE inventory_adjustment (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(40) REFERENCES inventory_item(sku),
  delta INTEGER NOT NULL,
  reason VARCHAR(120),
  actor_cpf CHAR(11) REFERENCES person(cpf),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales / POS
CREATE TABLE sale (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status sale_status DEFAULT 'OPEN',
  buyer_cpf CHAR(11) REFERENCES customer(cpf),
  cashier_cpf CHAR(11) REFERENCES employee(cpf),
  sub_total DECIMAL(10,2) DEFAULT 0,
  discount_total DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE sale_item (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sale(id) ON DELETE CASCADE,
  description VARCHAR(200) NOT NULL,
  sku VARCHAR(40) REFERENCES inventory_item(sku),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL
);

CREATE TABLE payment (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sale(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  auth_code VARCHAR(60),
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discounts
CREATE TABLE discount_code (
  code VARCHAR(40) PRIMARY KEY,
  description VARCHAR(200),
  type discount_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  cpf_range_start CHAR(11),
  cpf_range_end CHAR(11)
);

CREATE TABLE sale_discount (
  sale_id INTEGER REFERENCES sale(id) ON DELETE CASCADE,
  code VARCHAR(40) REFERENCES discount_code(code),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sale_id, code)
);

-- Auditing & Pricing
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  actor_cpf CHAR(11) REFERENCES person(cpf),
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id VARCHAR(60) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT
);

CREATE TABLE room_type_price (
  room_type room_type PRIMARY KEY,
  price DECIMAL(10,2) NOT NULL
);

-- Indexes for Performance
CREATE INDEX idx_person_email ON person(email);
CREATE INDEX idx_employee_active ON employee(is_active);
CREATE INDEX idx_session_start_time ON session(start_time);
CREATE INDEX idx_session_movie_room ON session(movie_id, room_id);
CREATE INDEX idx_ticket_session ON ticket(session_id);
CREATE INDEX idx_sale_created_at ON sale(created_at);
CREATE INDEX idx_sale_buyer ON sale(buyer_cpf);
CREATE INDEX idx_inventory_qty ON inventory_item(qty_on_hand);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_cpf);