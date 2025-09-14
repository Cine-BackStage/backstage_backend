const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Movie:
 *       type: object
 *       required:
 *         - title
 *         - duration_min
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Movie title
 *         duration_min:
 *           type: integer
 *           minimum: 1
 *           description: Movie duration in minutes
 *         genre:
 *           type: string
 *           maxLength: 80
 *           description: Movie genre
 *         description:
 *           type: string
 *           description: Movie description
 *         rating:
 *           type: string
 *           enum: [G, PG, PG-13, R, NC-17, NR]
 *           description: Movie rating
 *         poster_url:
 *           type: string
 *           maxLength: 500
 *           description: URL to movie poster
 *         is_active:
 *           type: boolean
 *           description: Whether the movie is active
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         total_sessions:
 *           type: integer
 *           description: Total number of sessions for this movie
 *         upcoming_sessions:
 *           type: integer
 *           description: Number of upcoming sessions
 *       example:
 *         id: 1
 *         title: "Avatar: The Way of Water"
 *         duration_min: 192
 *         genre: "Action/Adventure"
 *         description: "Set more than a decade after the events of the first film..."
 *         rating: "PG-13"
 *         poster_url: "https://example.com/avatar2-poster.jpg"
 *         is_active: true
 *         total_sessions: 5
 *         upcoming_sessions: 3
 *     MovieStats:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Movie title
 *         genre:
 *           type: string
 *           description: Movie genre
 *         total_sessions:
 *           type: integer
 *           description: Total sessions scheduled
 *         completed_sessions:
 *           type: integer
 *           description: Number of completed sessions
 *         total_tickets_sold:
 *           type: integer
 *           description: Total tickets sold
 *         total_revenue:
 *           type: number
 *           format: decimal
 *           description: Total revenue generated
 *   responses:
 *     NotFound:
 *       description: Movie not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: Movie not found
 */

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre (partial match)
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title (partial match)
 *     responses:
 *       200:
 *         description: List of movies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Movie'
 *                 count:
 *                   type: integer
 *                   example: 5
 */
router.get('/', movieController.getAllMovies);

/**
 * @swagger
 * /api/movies/search:
 *   get:
 *     summary: Search movies by title
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: Title to search for
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Movie'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Title parameter is required
 */
router.get('/search', movieController.searchMovies);

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', movieController.getMovieById);

/**
 * @swagger
 * /api/movies/{id}/stats:
 *   get:
 *     summary: Get movie statistics
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MovieStats'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/stats', movieController.getMovieStats);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Create a new movie
 *     tags: [Movies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - duration_min
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               duration_min:
 *                 type: integer
 *                 minimum: 1
 *               genre:
 *                 type: string
 *                 maxLength: 80
 *               description:
 *                 type: string
 *               rating:
 *                 type: string
 *                 enum: [G, PG, PG-13, R, NC-17, NR]
 *               poster_url:
 *                 type: string
 *                 maxLength: 500
 *               is_active:
 *                 type: boolean
 *                 default: true
 *           example:
 *             title: "Avatar: The Way of Water"
 *             duration_min: 192
 *             genre: "Action/Adventure"
 *             description: "Set more than a decade after the events of the first film..."
 *             rating: "PG-13"
 *             poster_url: "https://example.com/avatar2-poster.jpg"
 *     responses:
 *       201:
 *         description: Movie created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *                 message:
 *                   type: string
 *                   example: Movie created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Movie with this title already exists
 */
router.post('/', movieController.createMovie);

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Update a movie
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               duration_min:
 *                 type: integer
 *                 minimum: 1
 *               genre:
 *                 type: string
 *                 maxLength: 80
 *               description:
 *                 type: string
 *               rating:
 *                 type: string
 *                 enum: [G, PG, PG-13, R, NC-17, NR]
 *               poster_url:
 *                 type: string
 *                 maxLength: 500
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Movie updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *                 message:
 *                   type: string
 *                   example: Movie updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', movieController.updateMovie);

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Delete or deactivate a movie
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *       - in: query
 *         name: hard_delete
 *         schema:
 *           type: boolean
 *         description: Permanently delete the movie (only if no sessions exist)
 *     responses:
 *       200:
 *         description: Movie deleted or deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *                 message:
 *                   type: string
 *                   example: Movie deactivated successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Cannot delete movie with existing sessions
 */
router.delete('/:id', movieController.deleteMovie);

/**
 * @swagger
 * /api/movies/{id}/activate:
 *   patch:
 *     summary: Activate a movie
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *                 message:
 *                   type: string
 *                   example: Movie activated successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/activate', movieController.activateMovie);

module.exports = router;