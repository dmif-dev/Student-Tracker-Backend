// backend/prisma/seed.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProgramType, UserRole, StudentStatus, MentorStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Prisma with adapter
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Check if programs already exist
    console.log('Checking existing programs...');
    
    // Create programs with upsert
    console.log('\nCreating programs...');
    
    const gCMP = await prisma.program.upsert({
      where: { name: 'G-CMP' },
      update: {},
      create: {
        name: 'G-CMP',
        description: 'Global Coding Mentorship Program',
        icon: 'Code',
        color: 'green',
        hasMentors: true,
        hasOutcomes: false,
        duration: '6 months'
      }
    });
    console.log('✅ G-CMP program created:', gCMP.id);

    const gGMP = await prisma.program.upsert({
      where: { name: 'G-GMP' },
      update: {},
      create: {
        name: 'G-GMP',
        description: 'Global Guided Mentorship Program',
        icon: 'Brain',
        color: 'purple',
        hasMentors: true,
        hasOutcomes: true,
        duration: '12 months'
      }
    });
    console.log('✅ G-GMP program created:', gGMP.id);

    const eTIP = await prisma.program.upsert({
      where: { name: 'E-TIP' },
      update: {},
      create: {
        name: 'E-TIP',
        description: 'Executive Technology Immersion Program',
        icon: 'Award',
        color: 'blue',
        hasMentors: true,
        hasOutcomes: false,
        duration: '8 weeks'
      }
    });
    console.log('✅ E-TIP program created:', eTIP.id);

    const pcp = await prisma.program.upsert({
      where: { name: 'PCP' },
      update: {},
      create: {
        name: 'PCP',
        description: 'Professional Certification Program',
        icon: 'BookOpen',
        color: 'orange',
        hasMentors: false,
        hasOutcomes: true,
        duration: 'Self-paced'
      }
    });
    console.log('✅ PCP program created:', pcp.id);

    // Create tracks
    console.log('\nCreating tracks...');

    const track1 = await prisma.track.upsert({
      where: { 
        name_programId: {
          name: 'AI Product Development',
          programId: gCMP.id
        }
      },
      update: {},
      create: {
        name: 'AI Product Development',
        description: 'Learn to build AI-powered products',
        programId: gCMP.id,
        requiresMentor: true
      }
    });
    console.log('✅ Track created:', track1.name);

    const track2 = await prisma.track.upsert({
      where: { 
        name_programId: {
          name: 'Full Stack Development',
          programId: gCMP.id
        }
      },
      update: {},
      create: {
        name: 'Full Stack Development',
        description: 'Master full stack development',
        programId: gCMP.id,
        requiresMentor: true
      }
    });
    console.log('✅ Track created:', track2.name);

    const track3 = await prisma.track.upsert({
      where: { 
        name_programId: {
          name: 'Patent Track',
          programId: gGMP.id
        }
      },
      update: {},
      create: {
        name: 'Patent Track',
        description: 'Learn patent filing and innovation',
        programId: gGMP.id,
        requiresMentor: true
      }
    });
    console.log('✅ Track created:', track3.name);

    // Create admin user
    console.log('\nCreating users...');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@dmif.org' },
      update: {},
      create: {
        email: 'admin@dmif.org',
        password: adminPassword,
        role: UserRole.ADMIN,
        adminProfile: {
          create: { name: 'Admin User' }
        }
      }
    });
    console.log('✅ Admin user created');

    // Create mentor user
    const mentorPassword = await bcrypt.hash('mentor123', 10);
    const mentorUser = await prisma.user.upsert({
      where: { email: 'mentor@dmif.org' },
      update: {},
      create: {
        email: 'mentor@dmif.org',
        password: mentorPassword,
        role: UserRole.MENTOR,
        mentor: {
          create: {
            name: 'Dr. Smith',
            expertise: ['AI/ML', 'Full Stack', 'Patents'],
            programs: [ProgramType.G_CMP, ProgramType.G_GMP],
            rating: 4.8,
            status: MentorStatus.ACTIVE,
            joinDate: new Date(),
            bio: 'Experienced mentor in AI and product development'
          }
        }
      }
    });
    console.log('✅ Mentor user created');

    // Get the mentor record
    const mentorRecord = await prisma.mentor.findFirst({
      where: { userId: mentorUser.id }
    });

    if (!mentorRecord) {
      throw new Error('Mentor not found');
    }

    // Create student user
    const studentPassword = await bcrypt.hash('student123', 10);
    
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@dmif.org' },
      update: {},
      create: {
        email: 'student@dmif.org',
        password: studentPassword,
        role: UserRole.STUDENT,
        student: {
          create: {
            name: 'John Doe',
            registrationNumber: 'DMIF2025G_CMP001',
            program: { connect: { id: gCMP.id } },
            track: { connect: { id: track1.id } },
            mentor: { connect: { id: mentorRecord.id } },
            status: StudentStatus.ACTIVE,
            joinDate: new Date(),
            lastActive: new Date(),
            progress: 25
          }
        }
      }
    });
    console.log('✅ Student user created');

    // Get the student record
    const studentRecord = await prisma.student.findFirst({
      where: { userId: studentUser.id }
    });

    if (studentRecord) {
      // Check if progress already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingProgress = await prisma.dailyProgress.findFirst({
        where: {
          studentId: studentRecord.id,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!existingProgress) {
        // Create sample daily progress
        await prisma.dailyProgress.create({
          data: {
            studentId: studentRecord.id,
            date: new Date(),
            notes: 'Worked on AI model training',
            topicsCovered: ['Machine Learning', 'Python', 'TensorFlow'],
            attendanceStatus: 'PRESENT',
            performanceRating: 8
          }
        });
        console.log('✅ Sample progress created');
      } else {
        console.log('✅ Progress already exists for today');
      }
    }

    console.log('\n🌱 Seeding complete!');
    
    // Print summary
    console.log('\n📊 Database Summary:');
    console.log(`Programs: ${await prisma.program.count()}`);
    console.log(`Tracks: ${await prisma.track.count()}`);
    console.log(`Users: ${await prisma.user.count()}`);
    console.log(`Students: ${await prisma.student.count()}`);
    console.log(`Mentors: ${await prisma.mentor.count()}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });