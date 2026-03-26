// backend/src/routes/search.routes.ts
import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const searchController = new SearchController();

// Search endpoints
router.get('/', authenticate, searchController.search);
router.get('/suggestions', authenticate, searchController.suggestions);
router.get('/filters', authenticate, searchController.getAvailableFilters);

// Filter endpoints (POST for complex filters)
router.post('/students', authenticate, searchController.filterStudents);
router.post('/outcomes', authenticate, searchController.filterOutcomes);

export default router;