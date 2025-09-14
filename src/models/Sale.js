const db = require('../database/connection');

class Sale {
  static async findAll(limit = 50, offset = 0) {
    const query = `
      SELECT 
        s.id,
        s.created_at,
        s.status,
        s.sub_total,
        s.discount_total,
        s.grand_total,
        p.full_name as buyer_name,
        emp.full_name as cashier_name
      FROM sale s
      LEFT JOIN customer c ON s.buyer_cpf = c.cpf
      LEFT JOIN person p ON c.cpf = p.cpf
      LEFT JOIN employee e ON s.cashier_cpf = e.cpf
      LEFT JOIN person emp ON e.cpf = emp.cpf
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        s.id,
        s.created_at,
        s.status,
        s.buyer_cpf,
        s.cashier_cpf,
        s.sub_total,
        s.discount_total,
        s.grand_total,
        p.full_name as buyer_name,
        p.email as buyer_email,
        emp.full_name as cashier_name
      FROM sale s
      LEFT JOIN customer c ON s.buyer_cpf = c.cpf
      LEFT JOIN person p ON c.cpf = p.cpf
      LEFT JOIN employee e ON s.cashier_cpf = e.cpf
      LEFT JOIN person emp ON e.cpf = emp.cpf
      WHERE s.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getSaleItems(saleId) {
    const query = `
      SELECT 
        si.id,
        si.description,
        si.sku,
        si.quantity,
        si.unit_price,
        si.line_total
      FROM sale_item si
      WHERE si.sale_id = $1
      ORDER BY si.id
    `;
    
    const result = await db.query(query, [saleId]);
    return result.rows;
  }

  static async getSalePayments(saleId) {
    const query = `
      SELECT 
        p.id,
        p.method,
        p.amount,
        p.auth_code,
        p.paid_at
      FROM payment p
      WHERE p.sale_id = $1
      ORDER BY p.paid_at
    `;
    
    const result = await db.query(query, [saleId]);
    return result.rows;
  }

  static async create(saleData) {
    const { buyer_cpf, cashier_cpf } = saleData;
    
    const query = `
      INSERT INTO sale (buyer_cpf, cashier_cpf, status)
      VALUES ($1, $2, 'OPEN')
      RETURNING *
    `;
    
    const result = await db.query(query, [buyer_cpf, cashier_cpf]);
    return result.rows[0];
  }

  static async addItem(saleId, itemData) {
    const { description, sku, quantity, unit_price } = itemData;
    const line_total = quantity * unit_price;
    
    const query = `
      INSERT INTO sale_item (sale_id, description, sku, quantity, unit_price, line_total)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      saleId, description, sku, quantity, unit_price, line_total
    ]);
    
    // Recalculate totals
    await this.recalculateTotals(saleId);
    
    return result.rows[0];
  }

  static async removeItem(saleId, itemId) {
    const query = 'DELETE FROM sale_item WHERE id = $1 AND sale_id = $2 RETURNING *';
    const result = await db.query(query, [itemId, saleId]);
    
    if (result.rows.length > 0) {
      await this.recalculateTotals(saleId);
    }
    
    return result.rows[0];
  }

  static async applyDiscount(saleId, discountCode) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if discount code exists and is valid
      const discountQuery = `
        SELECT * FROM discount_code 
        WHERE code = $1 
        AND valid_from <= CURRENT_TIMESTAMP 
        AND valid_to >= CURRENT_TIMESTAMP
      `;
      
      const discountResult = await client.query(discountQuery, [discountCode]);
      if (discountResult.rows.length === 0) {
        throw new Error('Discount code not found or expired');
      }
      
      const discount = discountResult.rows[0];
      
      // Check if sale has buyer (required for discounts)
      const saleQuery = 'SELECT buyer_cpf FROM sale WHERE id = $1';
      const saleResult = await client.query(saleQuery, [saleId]);
      
      if (!saleResult.rows[0].buyer_cpf) {
        throw new Error('Buyer information required to apply discount');
      }
      
      // Check if discount already applied
      const existingQuery = 'SELECT 1 FROM sale_discount WHERE sale_id = $1 AND code = $2';
      const existing = await client.query(existingQuery, [saleId, discountCode]);
      
      if (existing.rows.length > 0) {
        throw new Error('Discount code already applied to this sale');
      }
      
      // Apply discount
      const applyQuery = `
        INSERT INTO sale_discount (sale_id, code)
        VALUES ($1, $2)
      `;
      
      await client.query(applyQuery, [saleId, discountCode]);
      
      // Recalculate totals
      await this.recalculateTotals(saleId);
      
      await client.query('COMMIT');
      return { message: 'Discount applied successfully' };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async recalculateTotals(saleId) {
    const query = `
      UPDATE sale 
      SET 
        sub_total = (
          SELECT COALESCE(SUM(line_total), 0) 
          FROM sale_item 
          WHERE sale_id = $1
        ),
        discount_total = (
          SELECT COALESCE(SUM(
            CASE 
              WHEN dc.type = 'PERCENT' THEN (
                SELECT SUM(si.line_total) * dc.value / 100 
                FROM sale_item si 
                WHERE si.sale_id = $1
              )
              ELSE dc.value 
            END
          ), 0)
          FROM sale_discount sd
          JOIN discount_code dc ON sd.code = dc.code
          WHERE sd.sale_id = $1
        )
      WHERE id = $1
    `;
    
    await db.query(query, [saleId]);
    
    // Update grand total
    const grandTotalQuery = `
      UPDATE sale 
      SET grand_total = sub_total - discount_total
      WHERE id = $1
    `;
    
    await db.query(grandTotalQuery, [saleId]);
  }

  static async finalize(saleId, paymentData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get sale total
      const saleQuery = 'SELECT grand_total FROM sale WHERE id = $1';
      const saleResult = await client.query(saleQuery, [saleId]);
      
      if (saleResult.rows.length === 0) {
        throw new Error('Sale not found');
      }
      
      const grandTotal = parseFloat(saleResult.rows[0].grand_total);
      
      // Calculate total payments
      const paymentsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_paid 
        FROM payment 
        WHERE sale_id = $1
      `;
      
      const paymentsResult = await client.query(paymentsQuery, [saleId]);
      let totalPaid = parseFloat(paymentsResult.rows[0].total_paid);
      
      // Add new payments
      for (const payment of paymentData) {
        const paymentQuery = `
          INSERT INTO payment (sale_id, method, amount, auth_code)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        
        await client.query(paymentQuery, [
          saleId, payment.method, payment.amount, payment.auth_code
        ]);
        
        totalPaid += parseFloat(payment.amount);
      }
      
      // Check if payment is sufficient
      if (totalPaid < grandTotal) {
        throw new Error(`Insufficient payment. Required: ${grandTotal}, Received: ${totalPaid}`);
      }
      
      // Finalize sale
      const finalizeQuery = `
        UPDATE sale 
        SET status = 'FINALIZED'
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(finalizeQuery, [saleId]);
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async cancel(saleId, reason) {
    const query = `
      UPDATE sale 
      SET status = 'CANCELED'
      WHERE id = $1 AND status = 'OPEN'
      RETURNING *
    `;
    
    const result = await db.query(query, [saleId]);
    
    if (result.rows.length > 0) {
      // Log the cancellation reason
      const logQuery = `
        INSERT INTO audit_log (actor_cpf, action, target_type, target_id, metadata_json)
        VALUES ($1, 'CANCEL_SALE', 'sale', $2, $3)
      `;
      
      await db.query(logQuery, [
        result.rows[0].cashier_cpf,
        saleId.toString(),
        JSON.stringify({ reason })
      ]);
    }
    
    return result.rows[0];
  }
}

module.exports = Sale;