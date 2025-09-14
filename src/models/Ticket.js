const db = require('../database/connection');

class Ticket {
  static async findAll() {
    const query = `
      SELECT 
        t.id,
        t.session_id,
        t.seat_id,
        t.price,
        t.issued_at,
        m.title as movie_title,
        r.name as room_name,
        s.start_time,
        seat.row_label,
        seat.number
      FROM ticket t
      JOIN session s ON t.session_id = s.id
      JOIN movie m ON s.movie_id = m.id
      JOIN room r ON s.room_id = r.id
      JOIN seat ON t.seatmap_id = seat.seatmap_id AND t.seat_id = seat.id
      ORDER BY t.issued_at DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        t.id,
        t.session_id,
        t.seat_id,
        t.price,
        t.issued_at,
        m.title as movie_title,
        r.name as room_name,
        s.start_time,
        s.end_time,
        seat.row_label,
        seat.number,
        seat.is_accessible
      FROM ticket t
      JOIN session s ON t.session_id = s.id
      JOIN movie m ON s.movie_id = m.id
      JOIN room r ON s.room_id = r.id
      JOIN seat ON t.seatmap_id = seat.seatmap_id AND t.seat_id = seat.id
      WHERE t.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findBySession(sessionId) {
    const query = `
      SELECT 
        t.id,
        t.seat_id,
        t.price,
        t.issued_at,
        seat.row_label,
        seat.number,
        seat.is_accessible
      FROM ticket t
      JOIN seat ON t.seatmap_id = seat.seatmap_id AND t.seat_id = seat.id
      WHERE t.session_id = $1
      ORDER BY seat.row_label, seat.number
    `;
    
    const result = await db.query(query, [sessionId]);
    return result.rows;
  }

  static async create(ticketData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get session and seat information
      const sessionQuery = `
        SELECT s.id, r.seatmap_id, rtp.price
        FROM session s
        JOIN room r ON s.room_id = r.id
        JOIN room_type_price rtp ON r.room_type = rtp.room_type
        WHERE s.id = $1
      `;
      
      const sessionResult = await client.query(sessionQuery, [ticketData.session_id]);
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessionResult.rows[0];
      
      // Check if seat is available
      const seatCheckQuery = `
        SELECT 1 FROM ticket 
        WHERE session_id = $1 AND seatmap_id = $2 AND seat_id = $3
      `;
      
      const seatCheck = await client.query(seatCheckQuery, [
        ticketData.session_id,
        session.seatmap_id,
        ticketData.seat_id
      ]);
      
      if (seatCheck.rows.length > 0) {
        throw new Error('Seat already taken');
      }
      
      // Verify seat exists
      const seatExistsQuery = `
        SELECT 1 FROM seat WHERE seatmap_id = $1 AND id = $2
      `;
      
      const seatExists = await client.query(seatExistsQuery, [
        session.seatmap_id,
        ticketData.seat_id
      ]);
      
      if (seatExists.rows.length === 0) {
        throw new Error('Seat does not exist');
      }
      
      // Create ticket
      const insertQuery = `
        INSERT INTO ticket (session_id, seatmap_id, seat_id, price)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const price = ticketData.price || session.price;
      const result = await client.query(insertQuery, [
        ticketData.session_id,
        session.seatmap_id,
        ticketData.seat_id,
        price
      ]);
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM ticket WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async bulkCreate(sessionId, seatIds, price) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get session information
      const sessionQuery = `
        SELECT s.id, r.seatmap_id, rtp.price
        FROM session s
        JOIN room r ON s.room_id = r.id
        JOIN room_type_price rtp ON r.room_type = rtp.room_type
        WHERE s.id = $1
      `;
      
      const sessionResult = await client.query(sessionQuery, [sessionId]);
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessionResult.rows[0];
      const ticketPrice = price || session.price;
      
      // Check if any seats are already taken
      const seatCheckQuery = `
        SELECT seat_id FROM ticket 
        WHERE session_id = $1 AND seatmap_id = $2 AND seat_id = ANY($3)
      `;
      
      const seatCheck = await client.query(seatCheckQuery, [
        sessionId,
        session.seatmap_id,
        seatIds
      ]);
      
      if (seatCheck.rows.length > 0) {
        throw new Error(`Seats already taken: ${seatCheck.rows.map(r => r.seat_id).join(', ')}`);
      }
      
      // Create multiple tickets
      const tickets = [];
      for (const seatId of seatIds) {
        const insertQuery = `
          INSERT INTO ticket (session_id, seatmap_id, seat_id, price)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        
        const result = await client.query(insertQuery, [
          sessionId,
          session.seatmap_id,
          seatId,
          ticketPrice
        ]);
        
        tickets.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return tickets;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Ticket;