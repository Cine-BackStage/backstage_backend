const Session = require('../models/Session');
const { validateSession } = require('../utils/validation');

class SessionController {
  async getAllSessions(req, res) {
    try {
      const sessions = await Session.findAll();
      res.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sessions',
        error: error.message
      });
    }
  }

  async getSessionById(req, res) {
    try {
      const { id } = req.params;
      const session = await Session.findById(id);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session',
        error: error.message
      });
    }
  }

  async getSessionSeats(req, res) {
    try {
      const { id } = req.params;
      const seats = await Session.getAvailableSeats(id);
      
      // Group seats by row for better frontend handling
      const seatMap = seats.reduce((acc, seat) => {
        if (!acc[seat.row_label]) {
          acc[seat.row_label] = [];
        }
        acc[seat.row_label].push(seat);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          seats: seats,
          seatMap: seatMap,
          available: seats.filter(s => s.status === 'AVAILABLE').length,
          sold: seats.filter(s => s.status === 'SOLD').length
        }
      });
    } catch (error) {
      console.error('Error fetching session seats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session seats',
        error: error.message
      });
    }
  }

  async createSession(req, res) {
    try {
      const { error, value } = validateSession(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const session = await Session.create(value);
      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully'
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating session',
        error: error.message
      });
    }
  }

  async updateSession(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = validateSession(req.body, true); // partial validation
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const session = await Session.update(id, value);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating session',
        error: error.message
      });
    }
  }

  async deleteSession(req, res) {
    try {
      const { id } = req.params;
      const session = await Session.delete(id);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting session',
        error: error.message
      });
    }
  }
}

module.exports = new SessionController();