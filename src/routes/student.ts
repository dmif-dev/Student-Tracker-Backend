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

    let student = await prisma.student.findUnique({
      where: { userId },
      include: {
        program: true,
        track: true,
        mentor: { include: { user: true } },
        user: true,
      }
    });

    if (!student) {
      console.log(`⚠️ Student profile not found for user ${userId}. Creating profile in DB strictly without running seed file...`);
      
      const firstProgram = await prisma.program.findFirst() || await prisma.program.create({
        data: {
          name: 'G-CMP',
          description: 'Global Guided Mentorship Program',
          icon: 'Brain',
          color: 'purple',
          hasMentors: true,
          hasOutcomes: true,
          duration: '12 months'
        }
      });

      const firstTrack = await prisma.track.findFirst({
        where: { programId: firstProgram.id }
      }) || await prisma.track.create({
        data: {
          name: 'AI Product Development',
          description: 'Learn to build AI-powered products',
          programId: firstProgram.id,
          requiresMentor: true
        }
      });

      // Initialize the student profile record in PostgreSQL
      student = await prisma.student.create({
        data: {
          userId,
          name: req.user?.user_metadata?.name || req.user?.email?.split('@')[0] || 'Student User',
          registrationNumber: `DMIF${new Date().getFullYear()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          programId: firstProgram.id,
          trackId: firstTrack.id,
          status: 'ACTIVE',
          joinDate: new Date(),
          lastActive: new Date(),
          progress: 0,
          phone: '',
          address: '',
          avatar: '/assets/student-profile.jpg',
          bio: 'DMIF Student passionate about software engineering, building AI systems, and creating impactful outcomes.',
          website: '',
          linkedin: '',
          github: '',
        },
        include: {
          program: true,
          track: true,
          mentor: { include: { user: true } },
          user: true,
        }
      });

      // Create dashboard stats
      await prisma.dashboardStats.create({
        data: {
          studentId: student.id,
          totalSessions: 0,
          totalProgress: 0,
          currentStreak: 0,
          maxStreak: 0
        }
      });

      console.log(`✅ Automatically created new student profile: ${student.name} in DB successfully.`);
    }

    // Dynamically calculate statistics from database
    const [patents, papers, products, startups, sessionCount] = await Promise.all([
      prisma.outcome.count({ where: { studentId: student.id, type: 'PATENT' } }),
      prisma.outcome.count({ where: { studentId: student.id, type: 'PAPER' } }),
      prisma.outcome.count({ where: { studentId: student.id, type: 'PROJECT' } }),
      prisma.outcome.count({ where: { studentId: student.id, type: 'STARTUP' } }),
      prisma.session.count({ where: { studentId: student.id } }),
    ]);
    
    // Format to match what frontend expects
    const profile = {
        id: student.registrationNumber,
        firstName: student.name.split(' ')[0] || '',
        lastName: student.name.split(' ').slice(1).join(' ') || '',
        email: student.user?.email || '',
        phone: student.phone || '',
        location: student.address || '',
        bio: student.bio || `DMIF Student currently pursuing the ${student.program?.name || 'G-GMP'} program on the ${student.track?.name || 'Patent Track'} track. Passionate about software engineering, building AI systems, and creating impactful outcomes.`,
        avatar: student.avatar || '/assets/student-profile.jpg',
        joinDate: student.joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        programTrack: student.track?.name || student.program?.name || 'Unknown',
        mentor: student.mentor?.name || 'Unassigned',
        mentorEmail: student.mentor?.user?.email || '',
        website: student.website || '',
        linkedin: student.linkedin || '',
        github: student.github || '',
        stats: {
            patentsCreated: patents,
            paperPublished: papers,
            productDeployed: products,
            venturesStarted: startups,
            brainScore: student.progress || 0,
            mentorshipSessions: sessionCount,
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

    const { firstName, lastName, phone, location, bio, website, linkedin, github } = req.body;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    const student = await prisma.student.update({
      where: { userId },
      data: {
        name: fullName || undefined,
        phone,
        address: location,
        bio,
        website,
        linkedin,
        github,
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
