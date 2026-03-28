// // backend/prisma/seed.ts
// import { Pool } from 'pg';
// import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaClient, ProgramType, UserRole, StudentStatus, MentorStatus } from '@prisma/client';
// import bcrypt from 'bcrypt';
// import dotenv from 'dotenv';
// import { fileURLToPath } from 'url';
// import { dirname, resolve } from 'path';

// // Get current directory in ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Load environment variables
// dotenv.config({ path: resolve(__dirname, '../.env') });

// // Create PostgreSQL connection pool
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// // Initialize Prisma with adapter
// const prisma = new PrismaClient({
//   adapter: new PrismaPg(pool),
//   log: ['query', 'error', 'warn'],
// });

// async function main() {
//   console.log('🌱 Seeding database...');

//   try {
//     // Check if programs already exist
//     console.log('Checking existing programs...');
    
//     // Create programs with upsert
//     console.log('\nCreating programs...');
    
//     const gCMP = await prisma.program.upsert({
//       where: { name: 'G-CMP' },
//       update: {},
//       create: {
//         name: 'G-CMP',
//         description: 'Global Coding Mentorship Program',
//         icon: 'Code',
//         color: 'green',
//         hasMentors: true,
//         hasOutcomes: false,
//         duration: '6 months'
//       }
//     });
//     console.log('✅ G-CMP program created:', gCMP.id);

//     const gGMP = await prisma.program.upsert({
//       where: { name: 'G-GMP' },
//       update: {},
//       create: {
//         name: 'G-GMP',
//         description: 'Global Guided Mentorship Program',
//         icon: 'Brain',
//         color: 'purple',
//         hasMentors: true,
//         hasOutcomes: true,
//         duration: '12 months'
//       }
//     });
//     console.log('✅ G-GMP program created:', gGMP.id);

//     const eTIP = await prisma.program.upsert({
//       where: { name: 'E-TIP' },
//       update: {},
//       create: {
//         name: 'E-TIP',
//         description: 'Executive Technology Immersion Program',
//         icon: 'Award',
//         color: 'blue',
//         hasMentors: true,
//         hasOutcomes: false,
//         duration: '8 weeks'
//       }
//     });
//     console.log('✅ E-TIP program created:', eTIP.id);

//     const pcp = await prisma.program.upsert({
//       where: { name: 'PCP' },
//       update: {},
//       create: {
//         name: 'PCP',
//         description: 'Professional Certification Program',
//         icon: 'BookOpen',
//         color: 'orange',
//         hasMentors: false,
//         hasOutcomes: true,
//         duration: 'Self-paced'
//       }
//     });
//     console.log('✅ PCP program created:', pcp.id);

//     // Create tracks
//     console.log('\nCreating tracks...');

//     const track1 = await prisma.track.upsert({
//       where: { 
//         name_programId: {
//           name: 'AI Product Development',
//           programId: gCMP.id
//         }
//       },
//       update: {},
//       create: {
//         name: 'AI Product Development',
//         description: 'Learn to build AI-powered products',
//         programId: gCMP.id,
//         requiresMentor: true
//       }
//     });
//     console.log('✅ Track created:', track1.name);

//     const track2 = await prisma.track.upsert({
//       where: { 
//         name_programId: {
//           name: 'Full Stack Development',
//           programId: gCMP.id
//         }
//       },
//       update: {},
//       create: {
//         name: 'Full Stack Development',
//         description: 'Master full stack development',
//         programId: gCMP.id,
//         requiresMentor: true
//       }
//     });
//     console.log('✅ Track created:', track2.name);

//     const track3 = await prisma.track.upsert({
//       where: { 
//         name_programId: {
//           name: 'Patent Track',
//           programId: gGMP.id
//         }
//       },
//       update: {},
//       create: {
//         name: 'Patent Track',
//         description: 'Learn patent filing and innovation',
//         programId: gGMP.id,
//         requiresMentor: true
//       }
//     });
//     console.log('✅ Track created:', track3.name);

//     // Create admin user
//     console.log('\nCreating users...');
    
//     const adminPassword = await bcrypt.hash('admin123', 10);
//     await prisma.user.upsert({
//       where: { email: 'admin@dmif.org' },
//       update: {},
//       create: {
//         email: 'admin@dmif.org',
//         password: adminPassword,
//         role: UserRole.ADMIN,
//         adminProfile: {
//           create: { name: 'Admin User' }
//         }
//       }
//     });
//     console.log('✅ Admin user created');

//     // Create mentor user
//     const mentorPassword = await bcrypt.hash('mentor123', 10);
//     const mentorUser = await prisma.user.upsert({
//       where: { email: 'mentor@dmif.org' },
//       update: {},
//       create: {
//         email: 'mentor@dmif.org',
//         password: mentorPassword,
//         role: UserRole.MENTOR,
//         mentor: {
//           create: {
//             name: 'Dr. Smith',
//             expertise: ['AI/ML', 'Full Stack', 'Patents'],
//             programs: [ProgramType.G_CMP, ProgramType.G_GMP],
//             rating: 4.8,
//             status: MentorStatus.ACTIVE,
//             joinDate: new Date(),
//             bio: 'Experienced mentor in AI and product development'
//           }
//         }
//       }
//     });
//     console.log('✅ Mentor user created');

//     // Get the mentor record
//     const mentorRecord = await prisma.mentor.findFirst({
//       where: { userId: mentorUser.id }
//     });

//     if (!mentorRecord) {
//       throw new Error('Mentor not found');
//     }

//     // Create student user
//     const studentPassword = await bcrypt.hash('student123', 10);
    
//     const studentUser = await prisma.user.upsert({
//       where: { email: 'student@dmif.org' },
//       update: {},
//       create: {
//         email: 'student@dmif.org',
//         password: studentPassword,
//         role: UserRole.STUDENT,
//         student: {
//           create: {
//             name: 'John Doe',
//             registrationNumber: 'DMIF2025G_CMP001',
//             program: { connect: { id: gCMP.id } },
//             track: { connect: { id: track1.id } },
//             mentor: { connect: { id: mentorRecord.id } },
//             status: StudentStatus.ACTIVE,
//             joinDate: new Date(),
//             lastActive: new Date(),
//             progress: 25
//           }
//         }
//       }
//     });
//     console.log('✅ Student user created');

//     // Get the student record
//     const studentRecord = await prisma.student.findFirst({
//       where: { userId: studentUser.id }
//     });

//     if (studentRecord) {
//       // Check if progress already exists for today
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
      
//       const existingProgress = await prisma.dailyProgress.findFirst({
//         where: {
//           studentId: studentRecord.id,
//           date: {
//             gte: today,
//             lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
//           }
//         }
//       });

//       if (!existingProgress) {
//         // Create sample daily progress
//         await prisma.dailyProgress.create({
//           data: {
//             studentId: studentRecord.id,
//             date: new Date(),
//             notes: 'Worked on AI model training',
//             topicsCovered: ['Machine Learning', 'Python', 'TensorFlow'],
//             attendanceStatus: 'PRESENT',
//             performanceRating: 8
//           }
//         });
//         console.log('✅ Sample progress created');
//       } else {
//         console.log('✅ Progress already exists for today');
//       }
//     }

//     console.log('\n🌱 Seeding complete!');
    
//     // Print summary
//     console.log('\n📊 Database Summary:');
//     console.log(`Programs: ${await prisma.program.count()}`);
//     console.log(`Tracks: ${await prisma.track.count()}`);
//     console.log(`Users: ${await prisma.user.count()}`);
//     console.log(`Students: ${await prisma.student.count()}`);
//     console.log(`Mentors: ${await prisma.mentor.count()}`);
    
//   } catch (error) {
//     console.error('❌ Seeding failed:', error);
//     throw error;
//   }
// }

// main()
//   .catch((e) => {
//     console.error('❌ Seeding failed:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

// backend/prisma/seed.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProgramType, UserRole, StudentStatus, MentorStatus, OutcomeType, OutcomeStatus, DocumentType, DocumentVisibility } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Setup Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getOrCreateSupabaseUser(email: string, password: string, role: string, name: string) {
  // 1. Try to sign in first to reliably get the real UUID if they already exist
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError && signInData?.user) return signInData.user;
  
  // 1b. Fallback for the admin account if password was different
  const { data: adminSignIn } = await supabase.auth.signInWithPassword({ email, password: 'admin123' });
  if (adminSignIn?.user) return adminSignIn.user;

  // 2. If login fails, try signing up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, name } }
  });

  // If signUp succeeds but returns an empty identities array, it means Supabase gave us a FAKE 
  // anti-enumeration UUID because the email actually exists but confirmation is enabled!
  if (signUpData?.user) {
    if (signUpData.user.identities && signUpData.user.identities.length === 0) {
      console.log(`⚠️ Supabase returned a dummy UID for ${email}. The user exists but cannot be accessed without the correct password or admin rights.`);
      return null;
    }
    return signUpData.user;
  }

  return null;
}

// Create PostgreSQL connection pool (same as in lib/prisma.ts)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Prisma with adapter (same as in lib/prisma.ts)
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ['error', 'warn'],
});

// Helper function to convert program display name to enum value
function getProgramEnum(programName: string): ProgramType {
  const mapping: Record<string, ProgramType> = {
    'G-CMP': 'G_CMP',
    'G-GMP': 'G_GMP',
    'E-TIP': 'E_TIP',
    'PCP': 'PCP'
  };
  return mapping[programName] || 'G_CMP';
}

// Program configurations
const PROGRAMS = [
  {
    name: 'G-CMP',
    description: 'Global Coding Mentorship Program - Building Real Engineers in the Age of AI',
    icon: 'Code',
    color: 'green',
    hasMentors: true,
    hasOutcomes: false,
    duration: '6-12 months',
    tracks: [
      { name: 'AI Product Development', description: 'Learn to build AI-powered products using real-world use cases', requiresMentor: true },
      { name: 'Full Stack Development', description: 'Understand end-to-end application development from frontend to backend', requiresMentor: true },
      { name: 'Cloud Development & Deployment', description: 'Learn how to develop, deploy, scale, and manage applications on the Cloud', requiresMentor: true },
      { name: 'Agentic AI Development', description: 'Explore how intelligent agents work and how to build autonomous AI systems', requiresMentor: true }
    ]
  },
  {
    name: 'G-GMP',
    description: 'Global Guided Mentorship Program - Innovation, Research & Entrepreneurship',
    icon: 'Brain',
    color: 'purple',
    hasMentors: true,
    hasOutcomes: true,
    duration: '12 months',
    tracks: [
      { name: 'Patent Track', description: 'Learn patent filing and innovation strategies', requiresMentor: true },
      { name: 'Research Paper Track', description: 'Master research methodology and paper publication', requiresMentor: true },
      { name: 'Entrepreneurship Track', description: 'Build and launch your startup', requiresMentor: true },
      { name: 'Inventor Foundation Track', description: 'Develop creative thinking and innovation skills', requiresMentor: true }
    ]
  },
  {
    name: 'E-TIP',
    description: 'Executive Technology Immersion Program - Technical Leadership for Executives',
    icon: 'Award',
    color: 'blue',
    hasMentors: true,
    hasOutcomes: false,
    duration: '8 weeks',
    tracks: [
      { name: 'AI Product Development', description: 'Hands-on exposure to AI product design and architecture', requiresMentor: true },
      { name: 'Full Stack', description: 'Practical walkthrough of end-to-end application development', requiresMentor: true },
      { name: 'Cloud Development', description: 'Hands-on cloud deployment and scaling with real-time demonstrations', requiresMentor: true },
      { name: 'Agentic AI', description: 'Direct interaction with agentic AI systems through guided builds', requiresMentor: true },
      { name: 'Custom Track', description: 'Personalized executive track tailored to role and experience', requiresMentor: true }
    ]
  },
  {
    name: 'PCP',
    description: 'Professional Certification Program - Industry-Grade AI Certifications (Self-Paced)',
    icon: 'BookOpen',
    color: 'orange',
    hasMentors: false,
    hasOutcomes: true,
    duration: 'Self-paced',
    tracks: [
      { name: 'AI Product Development', description: 'Build end-to-end AI-driven products', requiresMentor: false },
      { name: 'Agentic AI Systems', description: 'Design and build intelligent autonomous AI systems', requiresMentor: false },
      { name: 'AI for Finance', description: 'AI applications in financial systems and analytics', requiresMentor: false },
      { name: 'AI Security', description: 'AI system security, model risks, and data protection', requiresMentor: false }
    ]
  }
];

// Mentors data
const MENTORS = [
  {
    name: 'Dr. Madhan Kumar Srinivasan',
    email: 'dr.madhan@dmif.org',
    expertise: ['AI/ML', 'Patents', 'Innovation Strategy', 'Research Methodology', 'Entrepreneurship'],
    programs: ['G_GMP', 'G_CMP', 'E_TIP'] as ProgramType[],
    rating: 4.9,
    bio: 'Founder of DMIF, prolific inventor with 120+ patents, IIM Calcutta alumnus. Expert in guiding innovators and researchers.',
    phone: '+1 234 567 8901',
    location: 'Chennai, India',
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isRecurring: true },
      { dayOfWeek: 3, startTime: '14:00', endTime: '17:00', isRecurring: true },
      { dayOfWeek: 5, startTime: '10:00', endTime: '13:00', isRecurring: true }
    ]
  },
  {
    name: 'Dr. Smith',
    email: 'smith@dmif.org',
    expertise: ['AI/ML', 'Patents', 'Research Methodology', 'Computer Vision'],
    programs: ['G_GMP', 'G_CMP'] as ProgramType[],
    rating: 4.8,
    bio: 'PhD in Computer Science with 15+ years of experience in AI research and patent filing.',
    phone: '+1 234 567 8902',
    location: 'New York, USA',
    availability: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '13:00', isRecurring: true },
      { dayOfWeek: 4, startTime: '14:00', endTime: '17:00', isRecurring: true }
    ]
  },
  {
    name: 'Prof. Johnson',
    email: 'johnson@dmif.org',
    expertise: ['Full Stack', 'Cloud Architecture', 'DevOps', 'System Design'],
    programs: ['G_CMP'] as ProgramType[],
    rating: 4.9,
    bio: 'Former CTO with extensive experience in product development and cloud infrastructure.',
    phone: '+1 234 567 8903',
    location: 'San Francisco, USA',
    availability: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '14:00', isRecurring: true },
      { dayOfWeek: 4, startTime: '13:00', endTime: '17:00', isRecurring: true }
    ]
  },
  {
    name: 'Dr. Williams',
    email: 'williams@dmif.org',
    expertise: ['Agentic AI', 'Research', 'Entrepreneurship', 'AI Strategy'],
    programs: ['E_TIP', 'G_GMP'] as ProgramType[],
    rating: 4.7,
    bio: 'Serial entrepreneur and AI researcher with multiple patents in autonomous systems.',
    phone: '+1 234 567 8904',
    location: 'Boston, USA',
    availability: [
      { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', isRecurring: true }
    ]
  },
  {
    name: 'Dr. Brown',
    email: 'brown@dmif.org',
    expertise: ['Product Development', 'AI Strategy', 'Leadership', 'Executive Coaching'],
    programs: ['E_TIP'] as ProgramType[],
    rating: 4.6,
    bio: 'Product leader with experience at top tech companies.',
    phone: '+1 234 567 8905',
    location: 'Austin, USA',
    availability: [
      { dayOfWeek: 4, startTime: '11:00', endTime: '15:00', isRecurring: true }
    ]
  }
];

// Students data
const STUDENTS = [
  {
    name: 'John Doe',
    email: 'john.doe@dmifstudent.org',
    program: 'G-CMP',
    track: 'AI Product Development',
    mentor: 'Dr. Smith',
    registrationNumber: 'DMIF2025G_CMP001',
    progress: 45,
    joinDate: '2024-01-15',
    phone: '+1 234 567 8910',
    address: '123 Main St, New York, NY 10001',
    outcomes: [
      { type: 'PROJECT', title: 'AI-Powered Chatbot', status: 'COMPLETED', date: '2024-02-15', description: 'Built a chatbot using RAG architecture' }
    ]
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@dmifstudent.org',
    program: 'G-GMP',
    track: 'Patent Track',
    mentor: 'Dr. Madhan Kumar Srinivasan',
    registrationNumber: 'DMIF2025G_GMP001',
    progress: 35,
    joinDate: '2024-02-01',
    phone: '+1 234 567 8911',
    address: '456 Oak Ave, Los Angeles, CA 90001',
    outcomes: [
      { type: 'PATENT', title: 'AI-based Patent Search System', status: 'FILED', date: '2024-03-20', description: 'Novel system for searching and analyzing patents' },
      { type: 'PAPER', title: 'Advances in Agentic AI Systems', status: 'PUBLISHED', date: '2024-03-15', description: 'Research on autonomous AI systems' }
    ]
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@dmifstudent.org',
    program: 'E-TIP',
    track: 'Cloud Development',
    mentor: 'Dr. Williams',
    registrationNumber: 'DMIF2025E_TIP001',
    progress: 25,
    joinDate: '2024-02-15',
    phone: '+1 234 567 8912',
    address: '789 Pine St, Chicago, IL 60601',
    outcomes: []
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@dmifstudent.org',
    program: 'PCP',
    track: 'Agentic AI Systems',
    mentor: null,
    registrationNumber: 'DMIF2025PCP001',
    progress: 75,
    joinDate: '2024-01-20',
    phone: '+1 234 567 8913',
    address: '321 Elm St, Seattle, WA 98101',
    outcomes: [
      { type: 'CERTIFICATION', title: 'Agentic AI Specialist', status: 'COMPLETED', date: '2024-03-05', description: 'Professional certification in Agentic AI' }
    ]
  },
  {
    name: 'Alex Chen',
    email: 'alex.chen@dmifstudent.org',
    program: 'G-GMP',
    track: 'Research Paper Track',
    mentor: 'Dr. Madhan Kumar Srinivasan',
    registrationNumber: 'DMIF2025G_GMP002',
    progress: 55,
    joinDate: '2024-01-25',
    phone: '+1 234 567 8914',
    address: '555 Tech Blvd, San Jose, CA 95113',
    outcomes: [
      { type: 'PAPER', title: 'Ethical Considerations in AI', status: 'PUBLISHED', date: '2024-02-25', description: 'Research on AI ethics' }
    ]
  },
  {
    name: 'Emily Brown',
    email: 'emily.brown@dmifstudent.org',
    program: 'G-CMP',
    track: 'Full Stack Development',
    mentor: 'Prof. Johnson',
    registrationNumber: 'DMIF2025G_CMP002',
    progress: 30,
    joinDate: '2024-02-10',
    phone: '+1 234 567 8915',
    address: '777 Dev Lane, Austin, TX 78701',
    outcomes: []
  },
  {
    name: 'David Lee',
    email: 'david.lee@dmifstudent.org',
    program: 'G-CMP',
    track: 'Agentic AI Development',
    mentor: 'Dr. Smith',
    registrationNumber: 'DMIF2025G_CMP003',
    progress: 20,
    joinDate: '2024-03-01',
    phone: '+1 234 567 8916',
    address: '888 AI Ave, Boston, MA 02101',
    outcomes: []
  },
  {
    name: 'Lisa Chen',
    email: 'lisa.chen@dmifstudent.org',
    program: 'E-TIP',
    track: 'AI Product Development',
    mentor: 'Dr. Brown',
    registrationNumber: 'DMIF2025E_TIP002',
    progress: 15,
    joinDate: '2024-03-10',
    phone: '+1 234 567 8917',
    address: '999 Executive Way, New York, NY 10001',
    outcomes: []
  },
  {
    name: 'Robert Kim',
    email: 'robert.kim@dmifstudent.org',
    program: 'PCP',
    track: 'AI Security',
    mentor: null,
    registrationNumber: 'DMIF2025PCP002',
    progress: 40,
    joinDate: '2024-02-20',
    phone: '+1 234 567 8918',
    address: '111 Security St, Washington, DC 20001',
    outcomes: []
  },
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@dmifstudent.org',
    program: 'G-GMP',
    track: 'Entrepreneurship Track',
    mentor: 'Dr. Williams',
    registrationNumber: 'DMIF2025G_GMP003',
    progress: 60,
    joinDate: '2024-01-10',
    phone: '+1 234 567 8919',
    address: '222 Startup Way, San Francisco, CA 94105',
    outcomes: [
      { type: 'STARTUP', title: 'AI-powered Education Platform', status: 'PENDING', date: '2024-03-18', description: 'EdTech startup concept' }
    ]
  }
];

// Sample daily progress entries
const PROGRESS_ENTRIES = [
  { notes: 'Worked on AI model training', topicsCovered: ['Machine Learning', 'Python', 'TensorFlow'], attendanceStatus: 'PRESENT', performanceRating: 8 },
  { notes: 'Completed patent research', topicsCovered: ['Patent Filing', 'Prior Art Search', 'Patent Claims'], attendanceStatus: 'PRESENT', performanceRating: 9 },
  { notes: 'Cloud architecture design', topicsCovered: ['AWS', 'Microservices', 'Serverless'], attendanceStatus: 'PRESENT', performanceRating: 7 },
  { notes: 'Research paper review', topicsCovered: ['Literature Review', 'Methodology', 'Results'], attendanceStatus: 'PRESENT', performanceRating: 8 },
  { notes: 'Startup pitch preparation', topicsCovered: ['Business Model', 'Market Analysis', 'Pitch Deck'], attendanceStatus: 'PRESENT', performanceRating: 8 },
];

// Sample sessions
const SESSIONS = [
  { date: '2026-03-25', startTime: '10:00', endTime: '11:00', topic: 'AI Model Architecture Review' },
  { date: '2026-03-26', startTime: '14:00', endTime: '15:00', topic: 'Patent Drafting Workshop' },
  { date: '2026-03-27', startTime: '11:00', endTime: '12:00', topic: 'Cloud Deployment Strategy' },
  { date: '2026-03-28', startTime: '15:00', endTime: '16:00', topic: 'Research Paper Writing' },
  { date: '2026-03-29', startTime: '09:00', endTime: '10:00', topic: 'Startup Pitch Feedback' },
];

async function main() {
  console.log('🌱 Seeding database for DMIF Student Tracker...\n');

  try {
    console.log('🧹 Clearing old data to ensure pristine seeding environment without unique constraint violations...');
    const tableNames = ['OutcomeAnalytics', 'Outcome', 'Submission', 'Assignment', 'DocumentPermission', 'Document', 'SessionNote', 'Session', 'DailyProgress', 'WeeklyReport', 'DashboardStats', 'StudentTag', 'TagAssignment', 'Achievement', 'SavedReport', 'Dashboard', 'Notification', 'UserActivity', 'Student', 'Availability', 'MentorPreference', 'Folder', 'Mentor', 'Admin', 'User', 'Track', 'Program', 'Tag', 'BulkImportJob', 'ScheduledReport', 'AuditLog'];
    for (const tableName of tableNames) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    }
    console.log('🧹 Old local data cleared.');

    // ==================== Create Admin User ====================
    console.log('📝 Creating admin user in Supabase & Postgres...');
    const authAdmin = await getOrCreateSupabaseUser('admin@dmif.org', 'admin123', 'ADMIN', 'DMIF Administrator');
    if (!authAdmin) throw new Error('Failed to create admin in Supabase');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        id: authAdmin.id,
        email: 'admin@dmif.org',
        password: adminPassword,
        role: 'ADMIN',
        adminProfile: {
          create: { name: 'DMIF Administrator' }
        }
      },
      include: {
        adminProfile: true
      }
    });
    console.log(`✅ Admin created - ID matched to Supabase: ${authAdmin.id}`);

    // ==================== Create Programs and Tracks ====================
    console.log('\n📚 Creating programs and tracks...');
    const programMap = new Map();

    for (const programData of PROGRAMS) {
      const program = await prisma.program.upsert({
        where: { name: programData.name },
        update: {},
        create: {
          name: programData.name,
          description: programData.description,
          icon: programData.icon,
          color: programData.color,
          hasMentors: programData.hasMentors,
          hasOutcomes: programData.hasOutcomes,
          duration: programData.duration
        }
      });
      programMap.set(programData.name, program);

      // Create tracks for this program
      for (const trackData of programData.tracks) {
        await prisma.track.upsert({
          where: {
            name_programId: {
              name: trackData.name,
              programId: program.id
            }
          },
          update: {},
          create: {
            name: trackData.name,
            description: trackData.description,
            programId: program.id,
            requiresMentor: trackData.requiresMentor
          }
        });
      }
      console.log(`  ✅ ${programData.name} - ${programData.tracks.length} tracks`);
    }

    // ==================== Create Mentors ====================
    console.log('\n👨‍🏫 Creating mentors...');
    const mentorMap = new Map();

    for (const mentorData of MENTORS) {
      // Supabase Auth
      const authMentor = await getOrCreateSupabaseUser(mentorData.email, 'mentor123', 'MENTOR', mentorData.name);
      if (!authMentor) continue;

      // Create user for mentor
      const user = await prisma.user.create({
        data: {
          id: authMentor.id,
          email: mentorData.email,
          password: await bcrypt.hash('mentor123', 10),
          role: 'MENTOR'
        }
      });

      // Create mentor profile
      const mentor = await prisma.mentor.create({
        data: {
          userId: user.id,
          name: mentorData.name,
          expertise: mentorData.expertise,
          programs: mentorData.programs,
          rating: mentorData.rating,
          status: 'ACTIVE',
          joinDate: new Date(),
          bio: mentorData.bio,
          phone: mentorData.phone,
          location: mentorData.location
        }
      });
      mentorMap.set(mentorData.name, mentor);

      // Create availability slots
      for (const slot of mentorData.availability) {
        await prisma.availability.create({
          data: {
            mentorId: mentor.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring
          }
        });
      }
      console.log(`  ✅ ${mentorData.name} (${mentorData.expertise.slice(0, 3).join(', ')}...) [Matched in Supabase]`);
    }

    // ==================== Create Students ====================
    console.log('\n🎓 Creating students...');
    const studentMap = new Map();

    for (const studentData of STUDENTS) {
      // Supabase Auth
      const authStudent = await getOrCreateSupabaseUser(studentData.email, 'student123', 'STUDENT', studentData.name);
      if (!authStudent) continue;

      // Create user for student
      const user = await prisma.user.create({
        data: {
          id: authStudent.id,
          email: studentData.email,
          password: await bcrypt.hash('student123', 10),
          role: 'STUDENT'
        }
      });

      // Get program
      const program = programMap.get(studentData.program);
      if (!program) {
        console.log(`  ⚠️ Program ${studentData.program} not found for student ${studentData.name}`);
        continue;
      }

      // Get track
      const track = await prisma.track.findFirst({
        where: {
          name: studentData.track,
          programId: program.id
        }
      });
      if (!track) {
        console.log(`  ⚠️ Track ${studentData.track} not found for student ${studentData.name}`);
        continue;
      }

      // Get mentor
      let mentorId = null;
      if (studentData.mentor) {
        const mentor = mentorMap.get(studentData.mentor);
        if (mentor) mentorId = mentor.id;
      }

      // Create student
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          name: studentData.name,
          registrationNumber: studentData.registrationNumber,
          programId: program.id,
          trackId: track.id,
          mentorId,
          status: 'ACTIVE',
          joinDate: new Date(studentData.joinDate),
          lastActive: new Date(),
          phone: studentData.phone,
          address: studentData.address,
          progress: studentData.progress
        }
      });
      studentMap.set(studentData.name, student);

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

      // Create outcomes - using the mapping function
      for (const outcomeData of studentData.outcomes) {
        await prisma.outcome.create({
          data: {
            type: outcomeData.type as OutcomeType,
            title: outcomeData.title,
            description: outcomeData.description,
            studentId: student.id,
            mentorId,
            status: outcomeData.status as OutcomeStatus,
            date: new Date(outcomeData.date),
            program: getProgramEnum(studentData.program), // Use mapping function
            tags: [outcomeData.type.toLowerCase()],
            metadata: outcomeData.type === 'PATENT' ? { applicationNumber: `US2024/${Math.floor(Math.random() * 100000)}` } : {}
          }
        });
      }
      console.log(`  ✅ ${studentData.name} - ${studentData.program} (${studentData.track})`);
    }

    // ==================== Create Daily Progress Entries ====================
    console.log('\n📊 Creating daily progress entries...');

    for (const [studentName, student] of studentMap) {
      // Create 3-5 progress entries for each student
      const numEntries = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < numEntries; i++) {
        const entry = PROGRESS_ENTRIES[i % PROGRESS_ENTRIES.length];
        const date = new Date();
        date.setDate(date.getDate() - i);

        await prisma.dailyProgress.create({
          data: {
            studentId: student.id,
            date,
            notes: entry.notes,
            topicsCovered: entry.topicsCovered,
            attendanceStatus: entry.attendanceStatus as any,
            performanceRating: entry.performanceRating
          }
        });
      }
      console.log(`  ✅ ${studentName} - ${numEntries} progress entries`);
    }

    // ==================== Create Sessions ====================
    console.log('\n📅 Creating sessions...');

    const studentsList = Array.from(studentMap.values());
    const mentorsList = Array.from(mentorMap.values());

    for (let i = 0; i < SESSIONS.length; i++) {
      const sessionData = SESSIONS[i];
      const student = studentsList[i % studentsList.length];
      const mentor = mentorsList[i % mentorsList.length];

      await prisma.session.create({
        data: {
          studentId: student.id,
          mentorId: mentor.id,
          date: new Date(sessionData.date),
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          topic: sessionData.topic,
          status: i % 3 === 0 ? 'COMPLETED' : 'SCHEDULED',
          meetingLink: 'https://meet.google.com/abc-defg-hij'
        }
      });
      console.log(`  ✅ Session: ${student.name} with ${mentor.name} - ${sessionData.topic}`);
    }

    // ==================== Create Documents ====================
    console.log('\n📄 Creating documents...');

    const documents = [
      { title: 'G-CMP Module 1: Introduction to AI Product Development', type: 'LEARNING_MATERIAL', fileName: 'gcmp_module1.pdf', description: 'Comprehensive guide to AI product development' },
      { title: 'G-CMP Assignment: Build a Simple AI Model', type: 'ASSIGNMENT_MATERIAL', fileName: 'assignment1.pdf', description: 'First assignment - due in 2 weeks' },
      { title: 'G-CMP Pre-reading: Neural Networks Basics', type: 'PRE_READING_MATERIAL', fileName: 'prereading.pdf', description: 'Pre-reading material before Week 3 session' },
      { title: 'Patent Filing Guide', type: 'LEARNING_MATERIAL', fileName: 'patent_guide.pdf', description: 'Complete guide to patent filing process' },
      { title: 'Research Paper Writing Workshop', type: 'LEARNING_MATERIAL', fileName: 'paper_writing.pdf', description: 'How to write and publish research papers' },
      { title: 'Startup Pitch Deck Template', type: 'ASSIGNMENT_MATERIAL', fileName: 'pitch_deck.pptx', description: 'Template for startup pitch presentations' }
    ];

    for (const doc of documents) {
      const mentor = mentorsList[0];
      await prisma.document.create({
        data: {
          title: doc.title,
          description: doc.description,
          type: doc.type as DocumentType,
          fileName: doc.fileName,
          fileSize: Math.floor(Math.random() * 5 * 1024 * 1024),
          fileType: 'application/pdf',
          fileUrl: `/uploads/${doc.fileName}`,
          uploadedById: mentor.id,
          program: 'G_CMP' as ProgramType,
          visibility: 'STUDENT_ONLY' as DocumentVisibility,
          status: 'PUBLISHED',
          metadata: { version: 1, required: true }
        }
      });
      console.log(`  ✅ ${doc.title}`);
    }

    // ==================== Create Announcements ====================
    console.log('\n📢 Creating announcements...');

    const announcements = [
      { title: 'Welcome to DMIF Student Tracker!', content: 'We\'re excited to have you onboard. Start tracking your learning journey today!', target: 'all', priority: 'high' },
      { title: 'New Course Added: Agentic AI Development', content: 'Check out our new course on building autonomous AI systems.', target: 'students', priority: 'medium' },
      { title: 'Patent Filing Workshop', content: 'Join us for a workshop on patent filing strategies on March 30th.', target: 'students', priority: 'high' },
      { title: 'Mentor Orientation', content: 'New mentors, please join the orientation session.', target: 'mentors', priority: 'medium' }
    ];

    for (const announcement of announcements) {
      await prisma.announcement.create({
        data: {
          title: announcement.title,
          content: announcement.content,
          target: announcement.target,
          priority: announcement.priority,
          createdBy: admin.adminProfile?.id || '',
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      console.log(`  ✅ ${announcement.title}`);
    }

    // ==================== Summary ====================
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Programs: ${await prisma.program.count()}`);
    console.log(`✅ Tracks: ${await prisma.track.count()}`);
    console.log(`✅ Mentors: ${await prisma.mentor.count()}`);
    console.log(`✅ Students: ${await prisma.student.count()}`);
    console.log(`✅ Outcomes: ${await prisma.outcome.count()}`);
    console.log(`✅ Sessions: ${await prisma.session.count()}`);
    console.log(`✅ Daily Progress: ${await prisma.dailyProgress.count()}`);
    console.log(`✅ Documents: ${await prisma.document.count()}`);
    console.log(`✅ Announcements: ${await prisma.announcement.count()}`);

    console.log('\n🌱 Seeding completed successfully!');
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin: admin@dmif.org / admin123');
    console.log('   Mentor: smith@dmif.org / mentor123');
    console.log('   Student: john.doe@dmifstudent.org / student123');

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