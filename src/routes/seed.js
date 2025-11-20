const express = require('express');
const router = express.Router();
const MultiTenantSeeder = require('../database/seed-multitenant');

/**
 * @swagger
 * /seed:
 *   post:
 *     summary: Seed database with multi-tenant sample data (production-safe)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Database seeded successfully
 *       500:
 *         description: Seed failed
 */
router.post('/', async (req, res) => {
  try {
    console.log('🌱 Seeding database via HTTP endpoint...');
    const seeder = new MultiTenantSeeder();
    await seeder.run();

    res.json({
      success: true,
      message: 'Database seeded successfully with multi-tenant data',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Seed failed:', error);
    res.status(500).json({
      success: false,
      message: 'Seed failed',
      error: error.message
    });
  }
});

module.exports = router;
