import { Router } from 'express';
import { prisma } from '../lib/prisma.js'; // Adjust if prisma is exported from elsewhere, or skip db connection for mock

const router = Router();

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create a tag
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const newTag = await prisma.tag.create({ data });
    res.status(201).json(newTag);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update a tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedTag = await prisma.tag.update({ where: { id }, data });
    res.json(updatedTag);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete a tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tag.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
