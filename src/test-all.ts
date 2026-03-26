// backend/src/test-all.ts
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:4000/api';
let token = '';
let studentId = '';
let mentorId = '';
let announcementId = '';

// Get IDs from your database - you can run prisma studio to get these
// For now, we'll fetch them dynamically

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
    console.log('⚠️ Auth not available - check if auth is implemented');
    console.log('Continuing without token...');
    token = 'test-token';
    return false;
  }
}

async function getTestIds() {
  try {
    // Get first student
    const studentsRes = await axios.get(`${API_URL}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => ({ data: [] }));
    
    if (studentsRes.data.length > 0) {
      studentId = studentsRes.data[0].id;
      console.log('✅ Found student ID:', studentId);
    }

    // Get first mentor
    const mentorsRes = await axios.get(`${API_URL}/mentors`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => ({ data: [] }));
    
    if (mentorsRes.data.length > 0) {
      mentorId = mentorsRes.data[0].id;
      console.log('✅ Found mentor ID:', mentorId);
    }
  } catch (error) {
    console.log('⚠️ Could not fetch IDs, using placeholder values');
  }
}

// ==================== Dashboard Tests ====================

async function testStudentDashboard() {
  if (!studentId) {
    console.log('\n⚠️ Skipping student dashboard test - no student ID found');
    return;
  }
  
  try {
    console.log('\n📊 Testing: Student Dashboard');
    const response = await axios.get(`${API_URL}/dashboard/student`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Student dashboard stats:', response.data.stats);
    console.log('   Profile:', response.data.profile);
  } catch (error: any) {
    console.log('❌ Student dashboard failed:', error.response?.data || error.message);
  }
}

async function testMentorDashboard() {
  if (!mentorId) {
    console.log('\n⚠️ Skipping mentor dashboard test - no mentor ID found');
    return;
  }
  
  try {
    console.log('\n📊 Testing: Mentor Dashboard');
    const response = await axios.get(`${API_URL}/dashboard/mentor`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Mentor dashboard stats:', response.data.stats);
    console.log('   Profile:', response.data.profile);
  } catch (error: any) {
    console.log('❌ Mentor dashboard failed:', error.response?.data || error.message);
  }
}

async function testAdminDashboard() {
  try {
    console.log('\n📊 Testing: Admin Dashboard');
    const response = await axios.get(`${API_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Admin dashboard stats:', response.data.stats);
    console.log('   Program distribution:', response.data.programDistribution);
  } catch (error: any) {
    console.log('❌ Admin dashboard failed:', error.response?.data || error.message);
  }
}

// ==================== Announcement Tests ====================

async function testCreateAnnouncement() {
  try {
    console.log('\n📢 Testing: Create Announcement');
    const response = await axios.post(`${API_URL}/announcements`, {
      title: 'Test Announcement',
      content: 'This is a test announcement from the API test suite.',
      target: 'all',
      priority: 'medium',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    announcementId = response.data.id;
    console.log('✅ Announcement created:', response.data.title);
  } catch (error: any) {
    console.log('❌ Create announcement failed:', error.response?.data || error.message);
  }
}

async function testGetAnnouncements() {
  try {
    console.log('\n📢 Testing: Get Announcements');
    const response = await axios.get(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Found', response.data.length, 'announcements');
  } catch (error: any) {
    console.log('❌ Get announcements failed:', error.response?.data || error.message);
  }
}

async function testUpdateAnnouncement() {
  if (!announcementId) return;
  
  try {
    console.log('\n📢 Testing: Update Announcement');
    const response = await axios.put(`${API_URL}/announcements/${announcementId}`, {
      title: 'Updated Test Announcement',
      priority: 'high'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Announcement updated');
  } catch (error: any) {
    console.log('❌ Update announcement failed:', error.response?.data || error.message);
  }
}

async function testDeleteAnnouncement() {
  if (!announcementId) return;
  
  try {
    console.log('\n📢 Testing: Delete Announcement');
    await axios.delete(`${API_URL}/announcements/${announcementId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Announcement deleted');
  } catch (error: any) {
    console.log('❌ Delete announcement failed:', error.response?.data || error.message);
  }
}

// ==================== Activity Tests ====================

async function testGetUserActivity() {
  try {
    console.log('\n📋 Testing: Get User Activity');
    const response = await axios.get(`${API_URL}/activities/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Found', response.data.data.length, 'activities');
    if (response.data.data.length > 0) {
      console.log('   Latest activity:', response.data.data[0].action);
    }
  } catch (error: any) {
    console.log('❌ Get user activity failed:', error.response?.data || error.message);
  }
}

async function testGetSystemActivity() {
  try {
    console.log('\n📋 Testing: Get System Activity');
    const response = await axios.get(`${API_URL}/activities/system?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Found', response.data.data.length, 'system activities');
  } catch (error: any) {
    console.log('❌ Get system activity failed:', error.response?.data || error.message);
  }
}

// ==================== Import Tests ====================

async function testImportStudents() {
  try {
    console.log('\n📁 Testing: Import Students from CSV');
    
    // Create a test CSV file
    const csvContent = `name,email,program,track,status,joinDate
John Doe,john.test@example.com,G-CMP,AI Product Development,active,2024-01-15
Jane Smith,jane.test@example.com,G-GMP,Patent Track,active,2024-02-01`;
    
    const csvPath = path.join(__dirname, 'test-students.csv');
    fs.writeFileSync(csvPath, csvContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath));
    
    const response = await axios.post(`${API_URL}/import/students`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Import results:', response.data);
    
    // Clean up
    fs.unlinkSync(csvPath);
  } catch (error: any) {
    console.log('❌ Import students failed:', error.response?.data || error.message);
  }
}

async function testImportOutcomes() {
  try {
    console.log('\n📁 Testing: Import Outcomes from CSV');
    
    // Create a test CSV file for outcomes
    const csvContent = `studentEmail,type,title,status,date,tags
john.test@example.com,PATENT,AI-based Patent Search System,FILED,2024-03-20,AI,Patent
jane.test@example.com,PAPER,Advances in AI Research,PUBLISHED,2024-03-15,AI,Research`;
    
    const csvPath = path.join(__dirname, 'test-outcomes.csv');
    fs.writeFileSync(csvPath, csvContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath));
    
    const response = await axios.post(`${API_URL}/import/outcomes`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Import results:', response.data);
    
    // Clean up
    fs.unlinkSync(csvPath);
  } catch (error: any) {
    console.log('❌ Import outcomes failed:', error.response?.data || error.message);
  }
}

// ==================== Search Tests ====================

async function testSearch() {
  try {
    console.log('\n🔍 Testing: Search');
    const response = await axios.get(`${API_URL}/search?q=AI`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Search results:', response.data.metadata);
    console.log('   Students:', response.data.students?.length);
    console.log('   Programs:', response.data.programs?.length);
  } catch (error: any) {
    console.log('❌ Search failed:', error.response?.data || error.message);
  }
}

async function testSearchSuggestions() {
  try {
    console.log('\n💡 Testing: Search Suggestions');
    const response = await axios.get(`${API_URL}/search/suggestions?q=AI`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Suggestions:', response.data.slice(0, 3));
  } catch (error: any) {
    console.log('❌ Search suggestions failed:', error.response?.data || error.message);
  }
}

// ==================== Run All Tests ====================

async function runAllTests() {
  console.log('🧪 Starting Complete Backend API Tests...\n');
  console.log('='.repeat(50));
  
  await login();
  await getTestIds();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DASHBOARD TESTS');
  console.log('='.repeat(50));
  await testStudentDashboard();
  await testMentorDashboard();
  await testAdminDashboard();
  
  console.log('\n' + '='.repeat(50));
  console.log('📢 ANNOUNCEMENT TESTS');
  console.log('='.repeat(50));
  await testCreateAnnouncement();
  await testGetAnnouncements();
  await testUpdateAnnouncement();
  await testDeleteAnnouncement();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 ACTIVITY TESTS');
  console.log('='.repeat(50));
  await testGetUserActivity();
  await testGetSystemActivity();
  
  console.log('\n' + '='.repeat(50));
  console.log('📁 IMPORT TESTS');
  console.log('='.repeat(50));
  await testImportStudents();
  await testImportOutcomes();
  
  console.log('\n' + '='.repeat(50));
  console.log('🔍 SEARCH TESTS');
  console.log('='.repeat(50));
  await testSearch();
  await testSearchSuggestions();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
}

// Run all tests
runAllTests().catch(console.error);