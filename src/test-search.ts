// backend/src/test-search.ts
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
    console.log('ℹ️ Auth not available');
    token = 'test-token';
  }
}

async function testSearch() {
  try {
    console.log('\n📝 Testing: Full-text search');
    const response = await axios.get(`${API_URL}/search?q=AI`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Search results:', response.data.metadata);
    console.log('   Students:', response.data.students?.length);
    console.log('   Programs:', response.data.programs?.length);
    console.log('   Documents:', response.data.documents?.length);
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

async function testSuggestions() {
  try {
    console.log('\n📝 Testing: Search suggestions');
    const response = await axios.get(`${API_URL}/search/suggestions?q=AI`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Suggestions:', response.data);
  } catch (error) {
    console.error('❌ Suggestions failed:', error);
  }
}

async function testStudentFilters() {
  try {
    console.log('\n📝 Testing: Student filters');
    const response = await axios.post(
      `${API_URL}/search/students`,
      {
        program: ['G_CMP'],
        progressMin: 50,
        sortBy: 'progress',
        sortOrder: 'desc',
        limit: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Filtered students:', response.data.pagination);
  } catch (error) {
    console.error('❌ Student filters failed:', error);
  }
}

async function testOutcomeFilters() {
  try {
    console.log('\n📝 Testing: Outcome filters');
    const response = await axios.post(
      `${API_URL}/search/outcomes`,
      {
        type: ['PATENT', 'PAPER'],
        status: ['PUBLISHED', 'GRANTED'],
        sortBy: 'date',
        sortOrder: 'desc'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Filtered outcomes:', response.data.pagination);
  } catch (error) {
    console.error('❌ Outcome filters failed:', error);
  }
}

async function runTests() {
  console.log('🧪 Starting Search & Filter API tests...\n');
  await login();
  await testSearch();
  await testSuggestions();
  await testStudentFilters();
  await testOutcomeFilters();
  console.log('\n✅ Tests completed!');
}

runTests();