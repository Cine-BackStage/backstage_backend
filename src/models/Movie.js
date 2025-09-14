const db = require('../database/connection');

class Movie {
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        m.id,
        m.title,
        m.duration_min,
        m.genre,
        m.description,
        m.rating,
        m.poster_url,
        m.is_active,
        m.created_at,
        m.updated_at,
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.start_time > CURRENT_TIMESTAMP THEN 1 END) as upcoming_sessions
      FROM movie m
      LEFT JOIN session s ON m.id = s.movie_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;

    // Add filters
    if (filters.is_active !== undefined) {
      query += ` AND m.is_active = $${paramCount}`;
      queryParams.push(filters.is_active);
      paramCount++;
    }

    if (filters.genre) {
      query += ` AND m.genre ILIKE $${paramCount}`;
      queryParams.push(`%${filters.genre}%`);
      paramCount++;
    }

    if (filters.title) {
      query += ` AND m.title ILIKE $${paramCount}`;
      queryParams.push(`%${filters.title}%`);
      paramCount++;
    }

    query += `
      GROUP BY m.id, m.title, m.duration_min, m.genre, m.description, 
               m.rating, m.poster_url, m.is_active, m.created_at, m.updated_at
      ORDER BY m.created_at DESC
    `;

    const result = await db.query(query, queryParams);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        m.id,
        m.title,
        m.duration_min,
        m.genre,
        m.description,
        m.rating,
        m.poster_url,
        m.is_active,
        m.created_at,
        m.updated_at,
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.start_time > CURRENT_TIMESTAMP THEN 1 END) as upcoming_sessions
      FROM movie m
      LEFT JOIN session s ON m.id = s.movie_id
      WHERE m.id = $1
      GROUP BY m.id, m.title, m.duration_min, m.genre, m.description, 
               m.rating, m.poster_url, m.is_active, m.created_at, m.updated_at
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByTitle(title) {
    const query = `
      SELECT * FROM movie 
      WHERE title ILIKE $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [`%${title}%`]);
    return result.rows;
  }

  static async create(movieData) {
    const { 
      title, 
      duration_min, 
      genre, 
      description, 
      rating = null,
      poster_url = null,
      is_active = true 
    } = movieData;
    
    const query = `
      INSERT INTO movie (title, duration_min, genre, description, rating, poster_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      title, 
      duration_min, 
      genre, 
      description, 
      rating, 
      poster_url, 
      is_active
    ]);
    return result.rows[0];
  }

  static async update(id, movieData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(movieData).forEach(key => {
      if (movieData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(movieData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE movie 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    // Soft delete by setting is_active to false
    const query = `
      UPDATE movie 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async hardDelete(id) {
    // Only allow if no sessions exist
    const checkQuery = 'SELECT COUNT(*) as count FROM session WHERE movie_id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      throw new Error('Cannot delete movie with existing sessions. Use soft delete instead.');
    }

    const query = 'DELETE FROM movie WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async activate(id) {
    const query = `
      UPDATE movie 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getMovieStats(id) {
    const query = `
      SELECT 
        m.title,
        m.genre,
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as completed_sessions,
        COUNT(t.id) as total_tickets_sold,
        COALESCE(SUM(t.price), 0) as total_revenue
      FROM movie m
      LEFT JOIN session s ON m.id = s.movie_id
      LEFT JOIN ticket t ON s.id = t.session_id
      WHERE m.id = $1
      GROUP BY m.id, m.title, m.genre
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Movie;