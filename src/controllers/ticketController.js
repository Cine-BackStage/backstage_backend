const { db } = require('../database/prisma');
const { validateTicket, validateBulkTicket } = require('../utils/validation');

class TicketController {
  async getAllTickets(req, res) {
    try {
      const companyId = req.employee.companyId;

      const tickets = await db.ticket.findMany({
        where: { companyId },
        include: {
          session: {
            include: {
              movie: true,
              room: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: tickets,
        count: tickets.length
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tickets',
        error: error.message
      });
    }
  }

  async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const ticket = await TicketPrisma.findById(id);
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching ticket',
        error: error.message
      });
    }
  }

  async getTicketsBySession(req, res) {
    try {
      const { sessionId } = req.params;
      const tickets = await TicketPrisma.findBySession(sessionId);
      
      res.json({
        success: true,
        data: tickets,
        count: tickets.length
      });
    } catch (error) {
      console.error('Error fetching session tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session tickets',
        error: error.message
      });
    }
  }

  async createTicket(req, res) {
    try {
      const { error, value } = validateTicket(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const ticket = await TicketPrisma.create(value);
      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Ticket created successfully'
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      
      // Handle specific business logic errors
      if (error.message === 'Seat already taken') {
        return res.status(409).json({
          success: false,
          message: 'Seat is already taken',
          error: error.message
        });
      }
      
      if (error.message === 'Session not found' || error.message === 'Seat does not exist') {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating ticket',
        error: error.message
      });
    }
  }

  async createBulkTickets(req, res) {
    try {
      const { error, value } = validateBulkTicket(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { session_id, seat_ids, price } = value;
      const tickets = await TicketPrisma.bulkCreate(session_id, seat_ids, price);
      
      res.status(201).json({
        success: true,
        data: tickets,
        count: tickets.length,
        message: `${tickets.length} tickets created successfully`
      });
    } catch (error) {
      console.error('Error creating bulk tickets:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Seats already taken')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: error.message
        });
      }
      
      if (error.message === 'Session not found') {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating bulk tickets',
        error: error.message
      });
    }
  }

  async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      const ticket = await TicketPrisma.delete(id);
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      res.json({
        success: true,
        message: 'Ticket deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting ticket',
        error: error.message
      });
    }
  }
}

module.exports = new TicketController();