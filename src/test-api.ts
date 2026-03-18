// backend/src/test-api.ts
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
    return token;
  } catch (error) {
    console.error('❌ Login failed:', error);
    process.exit(1);
  }
}

async function testPrograms() {
  try {
    const response = await axios.get(`${API_URL}/programs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Programs fetched:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Programs test failed:', error);
  }
}

async function testProgress(studentId: string) {
  try {
    const response = await axios.get(`${API_URL}/progress/student/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Progress fetched:', response.data.data?.length || 0);
  } catch (error) {
    console.error('❌ Progress test failed:', error);
  }
}

async function testStats(studentId: string) {
  try {
    const response = await axios.get(`${API_URL}/progress/stats/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Stats fetched:', response.data);
  } catch (error) {
    console.error('❌ Stats test failed:', error);
  }
}

async function runTests() {
  console.log('🧪 Starting API tests...\n');
  
  await login();
  
  const programs = await testPrograms();
  if (programs && programs.length > 0) {
    const firstProgram = programs[0];
    console.log('📊 First program:', firstProgram.name);
  }
  
  // Get first student from programs
  const students = await axios.get(`${API_URL}/students`, {
    headers: { Authorization: `Bearer ${token}` }
  }).catch(() => ({ data: [] }));
  
  if (students.data.length > 0) {
    const firstStudent = students.data[0];
    await testProgress(firstStudent.id);
    await testStats(firstStudent.id);
  }
  
  console.log('\n✅ Tests completed!');
}

runTests();