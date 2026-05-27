import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Apply Student or Admin protection
router.use(authenticate, authorize('STUDENT'));

router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        program: true,
        track: true,
        mentor: { include: { user: true, availability: true, assignedStudents: { select: { id: true } } } },
        user: true,
      }
    });

    if (!student) return res.status(404).json({ error: 'Profile not found' });
    
    // Format to match what frontend expects
    const profile = {
        id: student.registrationNumber,
        studentId: student.id,
        firstName: student.name.split(' ')[0] || '',
        lastName: student.name.split(' ').slice(1).join(' ') || '',
        email: student.user?.email || '',
        phone: student.phone || '',
        location: student.address || '',
        bio: 'Student at DMIF', // Not in DB yet
        avatar: student.avatar || '/assets/student-profile.jpg',
        joinDate: student.joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        programTrack: student.track?.name || student.program?.name || 'Unknown',
        programName: student.program?.name || null,
        trackName: student.track?.name || null,
        mentor: student.mentor?.name || 'Unassigned',
        mentorEmail: student.mentor?.user?.email || '',
        mentorDetails: student.mentor || null,
        website: '',
        linkedin: '',
        github: '',
        stats: {
            patentsCreated: 0,
            paperPublished: 0,
            productDeployed: 0,
            venturesStarted: 0,
            brainScore: student.progress || 0,
            mentorshipSessions: 0,
        }
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { firstName, lastName, phone, location } = req.body;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    const student = await prisma.student.update({
      where: { userId },
      data: {
        name: fullName || undefined,
        phone,
        address: location,
      }
    });
    
    res.json({ success: true, student });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/my-progress', (req: AuthRequest, res) => {
  res.json({
    message: 'Student access: personal progress data',
    stats: {
      completeness: '75%',
      nextMilestone: 'Lab 5'
    }
  });
});

export default router;
