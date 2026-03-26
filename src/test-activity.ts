// backend/src/test-activity.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';

async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@dmif.org',
    password: 'admin123'
  });
  token = response.data.token;
  console.log('✅ Login successful');
}

async function testActivities() {
  console.log('🧪 Testing Activity APIs...\n');
  
  await login();
  
  // Test User Activity
  console.log('📋 User Activity:');
  try {
    const userRes = await axios.get(`${API_URL}/activities/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Found', userRes.data.data.length, 'activities');
    if (userRes.data.data.length > 0) {
      console.log('   Latest:', userRes.data.data[0].action);
    }
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.data);
  }
  
  // Test System Activity
  console.log('\n🌐 System Activity:');
  try {
    const systemRes = await axios.get(`${API_URL}/activities/system?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Found', systemRes.data.data.length, 'system activities');
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.data);
  }
}

testActivities();