// backend/src/test-announcement.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';
let announcementId = '';

async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@dmif.org',
    password: 'admin123'
  });
  token = response.data.token;
  console.log('✅ Login successful');
}

async function testAnnouncements() {
  console.log('🧪 Testing Announcement APIs...\n');
  
  await login();
  
  // Create
  console.log('📢 Creating announcement...');
  try {
    const createRes = await axios.post(`${API_URL}/announcements`, {
      title: 'System Maintenance',
      content: 'The system will be down for maintenance on Sunday from 2-4 AM.',
      target: 'all',
      priority: 'high',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    announcementId = createRes.data.id;
    console.log('✅ Created:', createRes.data.title);
  } catch (error: any) {
    console.log('❌ Create failed:', error.response?.data);
  }
  
  // Get All
  console.log('\n📋 Getting all announcements...');
  try {
    const getRes = await axios.get(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Found', getRes.data.length, 'announcements');
  } catch (error: any) {
    console.log('❌ Get failed:', error.response?.data);
  }
  
  // Update
  if (announcementId) {
    console.log('\n✏️ Updating announcement...');
    try {
      await axios.put(`${API_URL}/announcements/${announcementId}`, {
        title: 'Updated: System Maintenance',
        priority: 'medium'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Updated successfully');
    } catch (error: any) {
      console.log('❌ Update failed:', error.response?.data);
    }
  }
  
  // Delete
  if (announcementId) {
    console.log('\n🗑️ Deleting announcement...');
    try {
      await axios.delete(`${API_URL}/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Deleted successfully');
    } catch (error: any) {
      console.log('❌ Delete failed:', error.response?.data);
    }
  }
}

testAnnouncements();