// backend/src/test-outcome.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';
let outcomeId = '';

// Replace with actual IDs from your database
const STUDENT_ID = 'YOUR_STUDENT_ID_HERE';
const MENTOR_ID = 'YOUR_MENTOR_ID_HERE';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@dmif.org',
      password: 'admin123'
    });
    token = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('ℹ️ Auth not available - continuing without token');
    token = 'test-token';
    return false;
  }
}

async function testCreatePatent() {
  try {
    console.log('\n📝 Testing: Create patent outcome');
    
    const response = await axios.post(
      `${API_URL}/outcomes`,
      {
        type: 'PATENT',
        title: 'AI-based Patent Search System',
        description: 'A novel system for searching and analyzing patents using machine learning',
        studentId: STUDENT_ID,
        mentorId: MENTOR_ID,
        status: 'FILED',
        date: new Date().toISOString().split('T')[0],
        program: 'G_GMP',
        tags: ['AI', 'Machine Learning', 'Patent'],
        impact: 'High',
        metadata: {
          applicationNumber: 'US2024/123456',
          filingDate: new Date().toISOString().split('T')[0],
          jurisdiction: 'United States',
          inventors: ['John Doe', 'Dr. Smith']
        }
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Patent created:', response.data.title);
      outcomeId = response.data.id;
    } else {
      console.log('❌ Failed to create patent:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testCreatePaper() {
  try {
    console.log('\n📝 Testing: Create research paper');
    
    const response = await axios.post(
      `${API_URL}/outcomes`,
      {
        type: 'PAPER',
        title: 'Advances in Agentic AI Systems',
        description: 'Research paper on autonomous AI systems and their applications',
        studentId: STUDENT_ID,
        mentorId: MENTOR_ID,
        status: 'PUBLISHED',
        date: new Date().toISOString().split('T')[0],
        program: 'G_GMP',
        tags: ['AI', 'Research', 'Agentic Systems'],
        metadata: {
          journal: 'Journal of Artificial Intelligence',
          volume: '45',
          pages: '123-145',
          doi: '10.1007/s12345-024-001',
          coAuthors: ['Dr. Smith', 'Prof. Johnson']
        }
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Paper created:', response.data.title);
    } else {
      console.log('❌ Failed to create paper:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testCreateStartup() {
  try {
    console.log('\n📝 Testing: Create startup concept');
    
    const response = await axios.post(
      `${API_URL}/outcomes`,
      {
        type: 'STARTUP',
        title: 'AI-powered Education Platform',
        description: 'EdTech startup focused on personalized learning',
        studentId: STUDENT_ID,
        mentorId: MENTOR_ID,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0],
        program: 'G_GMP',
        tags: ['EdTech', 'AI', 'Startup'],
        metadata: {
          fundingStage: 'Seed',
          fundingAmount: 50000,
          teamSize: 3,
          website: 'https://example.com'
        }
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Startup created:', response.data.title);
    } else {
      console.log('❌ Failed to create startup:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testCreateCertification() {
  try {
    console.log('\n📝 Testing: Create certification');
    
    const response = await axios.post(
      `${API_URL}/outcomes`,
      {
        type: 'CERTIFICATION',
        title: 'Agentic AI Specialist',
        description: 'Professional certification in Agentic AI Systems',
        studentId: STUDENT_ID,
        status: 'COMPLETED',
        date: new Date().toISOString().split('T')[0],
        program: 'PCP',
        tags: ['AI', 'Certification'],
        metadata: {
          certificateNumber: 'CERT-2024-001',
          issuingBody: 'DMIF',
          level: 'Specialist',
          score: 92
        }
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Certification created:', response.data.title);
    } else {
      console.log('❌ Failed to create certification:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetOutcomes() {
  try {
    console.log('\n📝 Testing: Get all outcomes');
    const response = await axios.get(
      `${API_URL}/outcomes`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'outcomes');
    } else {
      console.log('❌ Failed to get outcomes:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetOutcomeById() {
  if (!outcomeId) return;
  
  try {
    console.log(`\n📝 Testing: Get outcome by ID ${outcomeId}`);
    const response = await axios.get(
      `${API_URL}/outcomes/${outcomeId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Outcome found:', response.data.title);
      console.log('   Views:', response.data.analytics?.views || 0);
    } else {
      console.log('❌ Failed to get outcome:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testStudentSummary() {
  try {
    console.log('\n📝 Testing: Get student outcome summary');
    const response = await axios.get(
      `${API_URL}/outcomes/student/${STUDENT_ID}/summary`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Student summary:', response.data);
    } else {
      console.log('❌ Failed to get student summary:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testProgramSummary() {
  try {
    console.log('\n📝 Testing: Get program outcome summary');
    const response = await axios.get(
      `${API_URL}/outcomes/program/G_GMP/summary`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Program summary:', response.data);
    } else {
      console.log('❌ Failed to get program summary:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testOutcomeTrends() {
  try {
    console.log('\n📝 Testing: Get outcome trends');
    const response = await axios.get(
      `${API_URL}/outcomes/analytics/trends?months=6`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Trends:', response.data);
    } else {
      console.log('❌ Failed to get trends:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testDashboard() {
  try {
    console.log('\n📝 Testing: Get dashboard stats');
    const response = await axios.get(
      `${API_URL}/outcomes/analytics/dashboard`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Dashboard stats:', response.data);
    } else {
      console.log('❌ Failed to get dashboard:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testTrackInteraction() {
  if (!outcomeId) return;
  
  try {
    console.log('\n📝 Testing: Track outcome interaction');
    const response = await axios.post(
      `${API_URL}/outcomes/${outcomeId}/interact`,
      { type: 'view' },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Interaction tracked');
    } else {
      console.log('❌ Failed to track interaction:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testExport() {
  try {
    console.log('\n📝 Testing: Export outcomes');
    const response = await axios.get(
      `${API_URL}/outcomes/export/all?format=csv`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Export successful');
    } else {
      console.log('❌ Failed to export:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Outcomes API tests...\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Start the server: pnpm dev');
  console.log('   2. Update STUDENT_ID and MENTOR_ID with actual IDs from your database');
  console.log('   3. Temporarily disable authentication in routes for testing\n');
  
  await login();
  
  if (STUDENT_ID === 'YOUR_STUDENT_ID_HERE' || MENTOR_ID === 'YOUR_MENTOR_ID_HERE') {
    console.log('\n❌ Please update STUDENT_ID and MENTOR_ID with actual values from your database');
    console.log('   Run: pnpm prisma:studio to see the IDs');
    return;
  }
  
  console.log('\n📋 Using:');
  console.log('   Student ID:', STUDENT_ID);
  console.log('   Mentor ID:', MENTOR_ID);
  
  // Run tests
  await testCreatePatent();
  await testCreatePaper();
  await testCreateStartup();
  await testCreateCertification();
  await testGetOutcomes();
  await testGetOutcomeById();
  await testStudentSummary();
  await testProgramSummary();
  await testOutcomeTrends();
  await testDashboard();
  await testTrackInteraction();
  await testExport();
  
  console.log('\n✅ Outcomes API tests completed!');
}

runTests();