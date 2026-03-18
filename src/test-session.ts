// backend/src/test-session.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';
let sessionId = '';

// Replace with actual IDs from your database
const STUDENT_ID = 'cmmspyj5c000c7s938py7w2wi';
const MENTOR_ID = 'cmmspyhf8000a7s93rgiee1cj';

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

async function testScheduleSession() {
  try {
    console.log('\n📝 Testing: Schedule a session');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const response = await axios.post(
      `${API_URL}/sessions`,
      {
        studentId: STUDENT_ID,
        mentorId: MENTOR_ID,
        date: dateStr,
        startTime: '10:00',
        endTime: '11:00',
        topic: 'Weekly Progress Review',
        meetingLink: 'https://meet.google.com/abc-defg-hij'
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Session scheduled:', response.data.id);
      sessionId = response.data.id;
    } else {
      console.log('❌ Failed to schedule session:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetUpcomingSessions() {
  try {
    console.log('\n📝 Testing: Get upcoming sessions');
    const response = await axios.get(
      `${API_URL}/sessions/upcoming?days=7`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'upcoming sessions');
    } else {
      console.log('❌ Failed to get upcoming sessions:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetSessionById() {
  if (!sessionId) return;
  
  try {
    console.log(`\n📝 Testing: Get session by ID ${sessionId}`);
    const response = await axios.get(
      `${API_URL}/sessions/${sessionId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Session found:', response.data.topic);
      console.log('   Status:', response.data.status);
      console.log('   Student:', response.data.student.name);
      console.log('   Mentor:', response.data.mentor.name);
    } else {
      console.log('❌ Failed to get session:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testAddSessionNotes() {
  if (!sessionId) return;
  
  try {
    console.log('\n📝 Testing: Add session notes');
    const response = await axios.post(
      `${API_URL}/sessions/${sessionId}/notes`,
      {
        content: 'Great session! Covered advanced topics in AI/ML. Student showed good understanding.',
        topics: ['Machine Learning', 'Neural Networks', 'Python'],
        duration: 55,
        feedback: 'Student needs to practice more with TensorFlow',
        nextSteps: 'Complete the TensorFlow tutorial before next session',
        resources: ['https://www.tensorflow.org/tutorials']
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Notes added successfully');
    } else {
      console.log('❌ Failed to add notes:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetSessionNotes() {
  if (!sessionId) return;
  
  try {
    console.log(`\n📝 Testing: Get notes for session ${sessionId}`);
    const response = await axios.get(
      `${API_URL}/sessions/${sessionId}/notes`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'notes');
    } else {
      console.log('❌ Failed to get notes:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetCalendarEvents() {
  try {
    console.log('\n📝 Testing: Get calendar events');
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const response = await axios.get(
      `${API_URL}/sessions/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'calendar events');
    } else {
      console.log('❌ Failed to get calendar events:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetSessionStats() {
  try {
    console.log('\n📝 Testing: Get session statistics');
    const response = await axios.get(
      `${API_URL}/sessions/stats`,
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

async function testCancelSession() {
  if (!sessionId) return;
  
  try {
    console.log(`\n📝 Testing: Cancel session ${sessionId}`);
    const response = await axios.delete(
      `${API_URL}/sessions/${sessionId}/cancel`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Session cancelled successfully');
    } else {
      console.log('❌ Failed to cancel session:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetSessionHistory() {
  try {
    console.log('\n📝 Testing: Get session history');
    const response = await axios.get(
      `${API_URL}/sessions/history?limit=10&offset=0`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.data.length, 'past sessions');
      console.log('   Total:', response.data.pagination.total);
    } else {
      console.log('❌ Failed to get session history:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Session API tests...\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Start the server: pnpm dev');
  console.log('   2. Update STUDENT_ID and MENTOR_ID with actual IDs from your database');
  console.log('   3. Temporarily disable authentication in routes for testing\n');
  
  await login();
  
//   if (STUDENT_ID === 'YOUR_STUDENT_ID_HERE' || MENTOR_ID === 'YOUR_MENTOR_ID_HERE') {
//     console.log('\n❌ Please update STUDENT_ID and MENTOR_ID with actual values from your database');
//     console.log('   Run: pnpm prisma:studio to see the IDs');
//     return;
//   }
  
  console.log('\n📋 Using:');
  console.log('   Student ID:', STUDENT_ID);
  console.log('   Mentor ID:', MENTOR_ID);
  
  // Run tests in sequence
  await testScheduleSession();
  await testGetUpcomingSessions();
  await testGetSessionById();
  await testAddSessionNotes();
  await testGetSessionNotes();
  await testGetCalendarEvents();
  await testGetSessionStats();
  await testGetSessionHistory();
  await testCancelSession();
  
  console.log('\n✅ Session API tests completed!');
}

runTests();