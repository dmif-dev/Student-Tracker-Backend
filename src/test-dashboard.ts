// backend/src/test-dashboard.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@dmif.org',
      password: 'admin123'
    });
    token = response.data.token;
    console.log('✅ Login successful');
  } catch (error) {
    console.log('⚠️ Auth not available');
  }
}

async function testDashboards() {
  console.log('🧪 Testing Dashboard APIs...\n');
  
  await login();
  
  // Test Student Dashboard
  console.log('📊 Student Dashboard:');
  try {
    const studentRes = await axios.get(`${API_URL}/dashboard/student`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('  ✅ Stats:', studentRes.data.stats);
    console.log('  ✅ Profile:', studentRes.data.profile);
  } catch (error: any) {
    console.log('  ❌ Failed:', error.response?.data || error.message);
  }
  
  // Test Mentor Dashboard
  console.log('\n👨‍🏫 Mentor Dashboard:');
  try {
    const mentorRes = await axios.get(`${API_URL}/dashboard/mentor`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('  ✅ Stats:', mentorRes.data.stats);
    console.log('  ✅ Profile:', mentorRes.data.profile);
  } catch (error: any) {
    console.log('  ❌ Failed:', error.response?.data || error.message);
  }
  
  // Test Admin Dashboard
  console.log('\n👑 Admin Dashboard:');
  try {
    const adminRes = await axios.get(`${API_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('  ✅ Stats:', adminRes.data.stats);
    console.log('  ✅ Program Distribution:', adminRes.data.programDistribution);
  } catch (error: any) {
    console.log('  ❌ Failed:', error.response?.data || error.message);
  }
}

testDashboards();