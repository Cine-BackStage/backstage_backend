const db = require('../database/connection');

class Session {
  static async findAll() {
    const query = `
      SELECT 
        s.id as session_id,
        s.start_time,
        s.end_time,
        s.status,
        m.title as movie_title,
        m.duration_min,
        m.genre,
        r.name as room_name,
        r.room_type,
        rtp.price as base_price,
        (r.capacity - COALESCE(ticket_count.sold, 0)) as available_seats,
        r.capacity as total_capacity
      FROM session s
      JOIN movie m ON s.movie_id = m.id
      JOIN room r ON s.room_id = r.id
      JOIN room_type_price rtp ON r.room_type = rtp.room_type
      LEFT JOIN (
        SELECT session_id, COUNT(*) as sold
        FROM ticket
        GROUP BY session_id
      ) ticket_count ON s.id = ticket_count.session_id
      WHERE s.start_time > CURRENT_TIMESTAMP
      ORDER BY s.start_time
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        s.id as session_id,
        s.start_time,
        s.end_time,
        s.status,
        s.movie_id,
        s.room_id,
        m.title as movie_title,
        m.duration_min,
        m.genre,
        m.description as movie_description,
        r.name as room_name,
        r.room_type,
        r.capacity,
        r.seatmap_id,
        rtp.price as base_price
      FROM session s
      JOIN movie m ON s.movie_id = m.id
      JOIN room r ON s.room_id = r.id
      JOIN room_type_price rtp ON r.room_type = rtp.room_type
      WHERE s.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getAvailableSeats(sessionId) {
    const query = `
      SELECT 
        s.row_label,
        s.number,
        s.id as seat_id,
        s.is_accessible,
        CASE WHEN t.id IS NULL THEN 'AVAILABLE' ELSE 'SOLD' END as status
      FROM session sess
      JOIN room r ON sess.room_id = r.id
      JOIN seat s ON r.seatmap_id = s.seatmap_id
      LEFT JOIN ticket t ON t.session_id = sess.id 
        AND t.seatmap_id = s.seatmap_id 
        AND t.seat_id = s.id
      WHERE sess.id = $1
      ORDER BY s.row_label, s.number
    `;
    
    const result = await db.query(query, [sessionId]);
    return result.rows;
  }

  static async create(sessionData) {
    const { movie_id, room_id, start_time, end_time, status = 'SCHEDULED' } = sessionData;
    
    const query = `
      INSERT INTO session (movie_id, room_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [movie_id, room_id, start_time, end_time, status]);
    return result.rows[0];
  }

  static async update(id, sessionData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(sessionData).forEach(key => {
      if (sessionData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(sessionData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE session 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM session WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Session;