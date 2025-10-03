const { db } = require('../database/prisma');
const Joi = require('joi');

// Validation schemas
const createRoomSchema = Joi.object({
  name: Joi.string().max(80).required(),
  capacity: Joi.number().integer().positive().required(),
  roomType: Joi.string().valid('TWO_D', 'THREE_D', 'IMAX', 'EXTREME', 'VIP').required(),
  seatMapId: Joi.string().uuid().optional().allow(null)
});

const updateRoomSchema = Joi.object({
  name: Joi.string().max(80).optional(),
  capacity: Joi.number().integer().positive().optional(),
  roomType: Joi.string().valid('TWO_D', 'THREE_D', 'IMAX', 'EXTREME', 'VIP').optional(),
  seatMapId: Joi.string().uuid().optional().allow(null),
  isActive: Joi.boolean().optional()
});

const createSeatMapSchema = Joi.object({
  name: Joi.string().max(100).required(),
  rows: Joi.number().integer().positive().max(50).required(),
  cols: Joi.number().integer().positive().max(50).required(),
  layout: Joi.object().optional()
});

const updateSeatMapSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  rows: Joi.number().integer().positive().max(50).optional(),
  cols: Joi.number().integer().positive().max(50).optional(),
  layout: Joi.object().optional()
});

const createSeatsSchema = Joi.object({
  seats: Joi.array().items(
    Joi.object({
      id: Joi.string().max(10).required(),
      rowLabel: Joi.string().max(5).required(),
      number: Joi.number().integer().positive().required(),
      isAccessible: Joi.boolean().default(false),
      isActive: Joi.boolean().default(true)
    })
  ).min(1).required()
});

const roomTypePriceSchema = Joi.object({
  roomType: Joi.string().valid('TWO_D', 'THREE_D', 'IMAX', 'EXTREME', 'VIP').required(),
  price: Joi.number().positive().precision(2).required()
});

class RoomController {
  // ===== ROOM CRUD =====

  async getAllRooms(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { isActive, roomType } = req.query;

      const where = { companyId };

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (roomType) {
        where.roomType = roomType;
      }

      const rooms = await db.room.findMany({
        where,
        include: {
          seatMap: {
            include: {
              seats: {
                where: { isActive: true }
              }
            }
          },
          _count: {
            select: {
              sessions: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: rooms,
        count: rooms.length
      });
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching rooms',
        error: error.message
      });
    }
  }

  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const room = await db.room.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          seatMap: {
            include: {
              seats: {
                where: { isActive: true },
                orderBy: [
                  { rowLabel: 'asc' },
                  { number: 'asc' }
                ]
              }
            }
          },
          sessions: {
            where: {
              startTime: {
                gte: new Date()
              }
            },
            orderBy: {
              startTime: 'asc'
            },
            take: 10
          }
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching room',
        error: error.message
      });
    }
  }

  async createRoom(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { error, value } = createRoomSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if room name already exists for this company
      const existingRoom = await db.room.findFirst({
        where: {
          companyId,
          name: value.name
        }
      });

      if (existingRoom) {
        return res.status(409).json({
          success: false,
          message: 'Room with this name already exists'
        });
      }

      // Verify seat map exists if provided
      if (value.seatMapId) {
        const seatMap = await db.seatMap.findFirst({
          where: {
            id: value.seatMapId,
            companyId
          }
        });

        if (!seatMap) {
          return res.status(404).json({
            success: false,
            message: 'Seat map not found'
          });
        }
      }

      const room = await db.room.create({
        data: {
          companyId,
          name: value.name,
          capacity: value.capacity,
          roomType: value.roomType,
          seatMapId: value.seatMapId || null
        },
        include: {
          seatMap: true
        }
      });

      res.status(201).json({
        success: true,
        data: room,
        message: 'Room created successfully'
      });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating room',
        error: error.message
      });
    }
  }

  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const { error, value } = updateRoomSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if room exists
      const existingRoom = await db.room.findFirst({
        where: { id, companyId }
      });

      if (!existingRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check name uniqueness if changing name
      if (value.name && value.name !== existingRoom.name) {
        const duplicateName = await db.room.findFirst({
          where: {
            companyId,
            name: value.name,
            id: { not: id }
          }
        });

        if (duplicateName) {
          return res.status(409).json({
            success: false,
            message: 'Room with this name already exists'
          });
        }
      }

      // Verify seat map if changing
      if (value.seatMapId) {
        const seatMap = await db.seatMap.findFirst({
          where: {
            id: value.seatMapId,
            companyId
          }
        });

        if (!seatMap) {
          return res.status(404).json({
            success: false,
            message: 'Seat map not found'
          });
        }
      }

      const room = await db.room.update({
        where: { id },
        data: value,
        include: {
          seatMap: true
        }
      });

      res.json({
        success: true,
        data: room,
        message: 'Room updated successfully'
      });
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating room',
        error: error.message
      });
    }
  }

  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const { permanent } = req.query;

      // Check if room exists
      const room = await db.room.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: {
              sessions: true
            }
          }
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check if room has sessions
      if (room._count.sessions > 0 && permanent === 'true') {
        return res.status(409).json({
          success: false,
          message: 'Cannot permanently delete room with existing sessions. Use soft delete instead.'
        });
      }

      if (permanent === 'true') {
        // Hard delete
        await db.room.delete({
          where: { id }
        });

        res.json({
          success: true,
          message: 'Room permanently deleted'
        });
      } else {
        // Soft delete
        await db.room.update({
          where: { id },
          data: { isActive: false }
        });

        res.json({
          success: true,
          message: 'Room deactivated successfully'
        });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting room',
        error: error.message
      });
    }
  }

  async activateRoom(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const room = await db.room.findFirst({
        where: { id, companyId }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const updatedRoom = await db.room.update({
        where: { id },
        data: { isActive: true }
      });

      res.json({
        success: true,
        data: updatedRoom,
        message: 'Room activated successfully'
      });
    } catch (error) {
      console.error('Error activating room:', error);
      res.status(500).json({
        success: false,
        message: 'Error activating room',
        error: error.message
      });
    }
  }

  // ===== SEAT MAP CRUD =====

  async getAllSeatMaps(req, res) {
    try {
      const companyId = req.employee.companyId;

      const seatMaps = await db.seatMap.findMany({
        where: { companyId },
        include: {
          _count: {
            select: {
              seats: true,
              rooms: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: seatMaps,
        count: seatMaps.length
      });
    } catch (error) {
      console.error('Error fetching seat maps:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching seat maps',
        error: error.message
      });
    }
  }

  async getSeatMapById(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const seatMap = await db.seatMap.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          seats: {
            where: { isActive: true },
            orderBy: [
              { rowLabel: 'asc' },
              { number: 'asc' }
            ]
          },
          rooms: true
        }
      });

      if (!seatMap) {
        return res.status(404).json({
          success: false,
          message: 'Seat map not found'
        });
      }

      res.json({
        success: true,
        data: seatMap
      });
    } catch (error) {
      console.error('Error fetching seat map:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching seat map',
        error: error.message
      });
    }
  }

  async createSeatMap(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { error, value } = createSeatMapSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const seatMap = await db.seatMap.create({
        data: {
          companyId,
          name: value.name,
          rows: value.rows,
          cols: value.cols,
          layout: value.layout || null
        }
      });

      res.status(201).json({
        success: true,
        data: seatMap,
        message: 'Seat map created successfully'
      });
    } catch (error) {
      console.error('Error creating seat map:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating seat map',
        error: error.message
      });
    }
  }

  async updateSeatMap(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const { error, value } = updateSeatMapSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if seat map exists
      const existingSeatMap = await db.seatMap.findFirst({
        where: { id, companyId }
      });

      if (!existingSeatMap) {
        return res.status(404).json({
          success: false,
          message: 'Seat map not found'
        });
      }

      // Increment version when updating
      const seatMap = await db.seatMap.update({
        where: { id },
        data: {
          ...value,
          version: existingSeatMap.version + 1
        }
      });

      res.json({
        success: true,
        data: seatMap,
        message: 'Seat map updated successfully'
      });
    } catch (error) {
      console.error('Error updating seat map:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating seat map',
        error: error.message
      });
    }
  }

  async deleteSeatMap(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      // Check if seat map exists
      const seatMap = await db.seatMap.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: {
              rooms: true
            }
          }
        }
      });

      if (!seatMap) {
        return res.status(404).json({
          success: false,
          message: 'Seat map not found'
        });
      }

      if (seatMap._count.rooms > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete seat map that is in use by rooms'
        });
      }

      // Delete seats first, then seat map
      await db.seat.deleteMany({
        where: { seatMapId: id }
      });

      await db.seatMap.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Seat map deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting seat map:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting seat map',
        error: error.message
      });
    }
  }

  // ===== SEAT MANAGEMENT =====

  async createSeats(req, res) {
    try {
      const { seatMapId } = req.params;
      const companyId = req.employee.companyId;
      const { error, value } = createSeatsSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Verify seat map exists
      const seatMap = await db.seatMap.findFirst({
        where: {
          id: seatMapId,
          companyId
        }
      });

      if (!seatMap) {
        return res.status(404).json({
          success: false,
          message: 'Seat map not found'
        });
      }

      // Create seats
      const seats = await db.seat.createMany({
        data: value.seats.map(seat => ({
          ...seat,
          seatMapId
        })),
        skipDuplicates: true
      });

      res.status(201).json({
        success: true,
        data: { created: seats.count },
        message: `${seats.count} seats created successfully`
      });
    } catch (error) {
      console.error('Error creating seats:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating seats',
        error: error.message
      });
    }
  }

  // ===== ROOM TYPE PRICING =====

  async getRoomTypePrices(req, res) {
    try {
      const companyId = req.employee.companyId;

      const prices = await db.roomTypePrice.findMany({
        where: { companyId },
        orderBy: { roomType: 'asc' }
      });

      res.json({
        success: true,
        data: prices
      });
    } catch (error) {
      console.error('Error fetching room type prices:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching room type prices',
        error: error.message
      });
    }
  }

  async setRoomTypePrice(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { error, value } = roomTypePriceSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const price = await db.roomTypePrice.upsert({
        where: {
          companyId_roomType: {
            companyId,
            roomType: value.roomType
          }
        },
        update: {
          price: value.price
        },
        create: {
          companyId,
          roomType: value.roomType,
          price: value.price
        }
      });

      res.json({
        success: true,
        data: price,
        message: 'Room type price set successfully'
      });
    } catch (error) {
      console.error('Error setting room type price:', error);
      res.status(500).json({
        success: false,
        message: 'Error setting room type price',
        error: error.message
      });
    }
  }
}

module.exports = new RoomController();
