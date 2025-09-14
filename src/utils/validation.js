const Joi = require('joi');

const sessionSchema = Joi.object({
  movie_id: Joi.number().integer().positive().required(),
  room_id: Joi.number().integer().positive().required(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().min(Joi.ref('start_time')).required(),
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'CANCELED', 'COMPLETED').optional()
});

const ticketSchema = Joi.object({
  session_id: Joi.number().integer().positive().required(),
  seat_id: Joi.string().max(10).required(),
  price: Joi.number().precision(2).positive().optional()
});

const bulkTicketSchema = Joi.object({
  session_id: Joi.number().integer().positive().required(),
  seat_ids: Joi.array().items(Joi.string().max(10)).min(1).max(50).required(),
  price: Joi.number().precision(2).positive().optional()
});

const saleSchema = Joi.object({
  buyer_cpf: Joi.string().length(11).pattern(/^\d+$/).optional(),
  cashier_cpf: Joi.string().length(11).pattern(/^\d+$/).required()
});

const saleItemSchema = Joi.object({
  description: Joi.string().max(200).required(),
  sku: Joi.string().max(40).optional(),
  quantity: Joi.number().integer().positive().required(),
  unit_price: Joi.number().precision(2).positive().required()
});

const paymentSchema = Joi.object({
  payments: Joi.array().items(
    Joi.object({
      method: Joi.string().valid('CASH', 'CARD', 'PIX', 'OTHER').required(),
      amount: Joi.number().precision(2).positive().required(),
      auth_code: Joi.string().max(60).optional()
    })
  ).min(1).required()
});

const customerSchema = Joi.object({
  cpf: Joi.string().length(11).pattern(/^\d+$/).required(),
  full_name: Joi.string().max(200).required(),
  email: Joi.string().email().max(200).required(),
  phone: Joi.string().max(40).optional(),
  birth_date: Joi.date().iso().optional()
});

const employeeSchema = Joi.object({
  cpf: Joi.string().length(11).pattern(/^\d+$/).required(),
  full_name: Joi.string().max(200).required(),
  email: Joi.string().email().max(200).required(),
  phone: Joi.string().max(40).optional(),
  employee_id: Joi.string().max(40).required(),
  role: Joi.string().max(80).required(),
  hire_date: Joi.date().iso().required(),
  is_active: Joi.boolean().optional()
});

const inventoryItemSchema = Joi.object({
  sku: Joi.string().max(40).required(),
  name: Joi.string().max(200).required(),
  unit_price: Joi.number().precision(2).positive().required(),
  qty_on_hand: Joi.number().integer().min(0).optional(),
  reorder_level: Joi.number().integer().min(0).optional(),
  barcode: Joi.string().max(64).optional(),
  // For food items
  expiry_date: Joi.date().iso().optional(),
  is_combo: Joi.boolean().optional(),
  // For collectables
  category: Joi.string().max(80).optional(),
  brand: Joi.string().max(80).optional(),
  item_type: Joi.string().valid('food', 'collectable').optional()
});

const movieSchema = Joi.object({
  title: Joi.string().max(200).required(),
  duration_min: Joi.number().integer().positive().required(),
  genre: Joi.string().max(80).optional(),
  description: Joi.string().optional(),
  rating: Joi.string().max(10).valid('G', 'PG', 'PG-13', 'R', 'NC-17', 'NR').optional(),
  poster_url: Joi.string().uri().max(500).optional(),
  is_active: Joi.boolean().optional()
});

const roomSchema = Joi.object({
  name: Joi.string().max(80).required(),
  capacity: Joi.number().integer().positive().required(),
  room_type: Joi.string().valid('TWO_D', 'THREE_D', 'EXTREME').required(),
  seatmap_id: Joi.number().integer().positive().required()
});

const discountCodeSchema = Joi.object({
  code: Joi.string().max(40).required(),
  description: Joi.string().max(200).optional(),
  type: Joi.string().valid('PERCENT', 'AMOUNT').required(),
  value: Joi.number().precision(2).positive().required(),
  valid_from: Joi.date().iso().required(),
  valid_to: Joi.date().iso().min(Joi.ref('valid_from')).required(),
  cpf_range_start: Joi.string().length(11).pattern(/^\d+$/).optional(),
  cpf_range_end: Joi.string().length(11).pattern(/^\d+$/).optional()
});

function validateSession(data, partial = false) {
  const schema = partial ? sessionSchema.fork(Object.keys(sessionSchema.describe().keys), (schema) => schema.optional()) : sessionSchema;
  return schema.validate(data);
}

function validateTicket(data) {
  return ticketSchema.validate(data);
}

function validateBulkTicket(data) {
  return bulkTicketSchema.validate(data);
}

function validateSale(data) {
  return saleSchema.validate(data);
}

function validateSaleItem(data) {
  return saleItemSchema.validate(data);
}

function validatePayment(data) {
  return paymentSchema.validate(data);
}

function validateCustomer(data) {
  return customerSchema.validate(data);
}

function validateEmployee(data) {
  return employeeSchema.validate(data);
}

function validateInventoryItem(data) {
  return inventoryItemSchema.validate(data);
}

function validateMovie(data, partial = false) {
  const schema = partial ? movieSchema.fork(Object.keys(movieSchema.describe().keys), (schema) => schema.optional()) : movieSchema;
  return schema.validate(data);
}

function validateRoom(data, partial = false) {
  const schema = partial ? roomSchema.fork(Object.keys(roomSchema.describe().keys), (schema) => schema.optional()) : roomSchema;
  return schema.validate(data);
}

function validateDiscountCode(data, partial = false) {
  const schema = partial ? discountCodeSchema.fork(Object.keys(discountCodeSchema.describe().keys), (schema) => schema.optional()) : discountCodeSchema;
  return schema.validate(data);
}

module.exports = {
  validateSession,
  validateTicket,
  validateBulkTicket,
  validateSale,
  validateSaleItem,
  validatePayment,
  validateCustomer,
  validateEmployee,
  validateInventoryItem,
  validateMovie,
  validateRoom,
  validateDiscountCode
};