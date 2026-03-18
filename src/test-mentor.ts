// backend/src/test-mentor.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';
let mentorId = '';

// Replace with actual IDs from your database
const STUDENT_ID = 'cmmspyi77000b7s93ndg631br';

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

async function testCreateMentor() {
  try {
    console.log('\n📝 Testing: Create mentor');
    const response = await axios.post(
      `${API_URL}/mentors`,
      {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@dmif.org',
        expertise: ['AI/ML', 'Cloud Computing', 'Product Strategy'],
        programs: ['G_GMP', 'G_CMP', 'E_TIP'],
        bio: 'Experienced mentor with 10+ years in tech',
        phone: '+1 234 567 8901',
        location: 'New York, USA',
        status: 'ACTIVE',
        joinDate: new Date().toISOString().split('T')[0]
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Mentor created:', response.data.name);
      mentorId = response.data.id;
    } else if (response.status === 401) {
      console.log('❌ Authentication failed (admin only)');
    } else {
      console.log('❌ Failed to create mentor:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetAllMentors() {
  try {
    console.log('\n📝 Testing: Get all mentors');
    const response = await axios.get(
      `${API_URL}/mentors`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'mentors');
      if (response.data.length > 0 && !mentorId) {
        mentorId = response.data[0].id;
      }
    } else {
      console.log('❌ Failed to get mentors:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetMentorById() {
  if (!mentorId) return;
  
  try {
    console.log(`\n📝 Testing: Get mentor by ID ${mentorId}`);
    const response = await axios.get(
      `${API_URL}/mentors/${mentorId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Mentor found:', response.data.name);
      console.log('   Students:', response.data.assignedStudents?.length || 0);
      console.log('   Rating:', response.data.rating);
    } else {
      console.log('❌ Failed to get mentor:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testAddAvailability() {
  if (!mentorId) return;
  
  try {
    console.log('\n📝 Testing: Add availability slot');
    const response = await axios.post(
      `${API_URL}/mentors/${mentorId}/availability`,
      {
        mentorId,
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '12:00',
        isRecurring: true
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Availability added');
    } else {
      console.log('❌ Failed to add availability:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetAvailability() {
  if (!mentorId) return;
  
  try {
    console.log(`\n📝 Testing: Get availability for mentor ${mentorId}`);
    const response = await axios.get(
      `${API_URL}/mentors/${mentorId}/availability`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'availability slots');
    } else {
      console.log('❌ Failed to get availability:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testAssignStudent() {
  if (!mentorId || !STUDENT_ID ) return;
  
  try {
    console.log(`\n📝 Testing: Assign student to mentor`);
    const response = await axios.post(
      `${API_URL}/mentors/${mentorId}/students/${STUDENT_ID}/assign`,
      {},
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Student assigned successfully');
    } else {
      console.log('❌ Failed to assign student:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetAssignedStudents() {
  if (!mentorId) return;
  
  try {
    console.log(`\n📝 Testing: Get assigned students`);
    const response = await axios.get(
      `${API_URL}/mentors/${mentorId}/students`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'assigned students');
    } else {
      console.log('❌ Failed to get assigned students:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testCheckAvailability() {
  if (!mentorId) return;
  
  try {
    console.log(`\n📝 Testing: Check mentor availability`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/mentors/${mentorId}/check-availability?date=${dateStr}&startTime=10:00&endTime=11:00`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Available:', response.data.available);
    } else {
      console.log('❌ Failed to check availability:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetMentorStats() {
  if (!mentorId) return;
  
  try {
    console.log(`\n📝 Testing: Get mentor stats`);
    const response = await axios.get(
      `${API_URL}/mentors/${mentorId}/stats`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Stats:', response.data);
    } else {
      console.log('❌ Failed to get stats:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetMentorPerformance() {
  if (!mentorId) return;
  
  try {
    console.log(`\n📝 Testing: Get mentor performance`);
    const response = await axios.get(
      `${API_URL}/mentors/${mentorId}/performance?period=month`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Performance:', response.data);
    } else {
      console.log('❌ Failed to get performance:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Mentor API tests...\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Start the server: pnpm dev');
  console.log('   2. Update STUDENT_ID with actual ID from your database');
  console.log('   3. Admin role required for create/update/delete operations\n');
  
  await login();
  
  // Run tests in sequence
  await testCreateMentor();
  await testGetAllMentors();
  await testGetMentorById();
  await testAddAvailability();
  await testGetAvailability();
  await testAssignStudent();
  await testGetAssignedStudents();
  await testCheckAvailability();
  await testGetMentorStats();
  await testGetMentorPerformance();
  
  console.log('\n✅ Mentor API tests completed!');
}

runTests();