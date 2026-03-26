// backend/src/controllers/search.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { SearchService } from '../services/search.service.js';
import { FilterService } from '../services/filter.service.js';

const searchService = new SearchService();
const filterService = new FilterService();

export class SearchController {
  async search(req: AuthRequest, res: Response) {
    try {
      const { q, type, limit, offset } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const results = await searchService.fullTextSearch(q as string, {
        searchIn: type ? [type as any] : undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      });

      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  async suggestions(req: AuthRequest, res: Response) {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Query required' });
      }

      const suggestions = await searchService.getSearchSuggestions(
        q as string,
        limit ? Number(limit) : 10
      );

      res.json(suggestions);
    } catch (error) {
      console.error('Get suggestions error:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  }

  async filterStudents(req: AuthRequest, res: Response) {
    try {
      const filters = req.body;
      const results = await filterService.filterStudents(filters);
      res.json(results);
    } catch (error) {
      console.error('Filter students error:', error);
      res.status(500).json({ error: 'Failed to filter students' });
    }
  }

  async filterOutcomes(req: AuthRequest, res: Response) {
    try {
      const filters = req.body;
      const results = await filterService.filterOutcomes(filters);
      res.json(results);
    } catch (error) {
      console.error('Filter outcomes error:', error);
      res.status(500).json({ error: 'Failed to filter outcomes' });
    }
  }

  async getAvailableFilters(req: AuthRequest, res: Response) {
    try {
      const filters = await filterService.getAvailableStudentFilters();
      res.json(filters);
    } catch (error) {
      console.error('Get available filters error:', error);
      res.status(500).json({ error: 'Failed to get available filters' });
    }
  }
}