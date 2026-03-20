// backend/src/test-document.ts
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:4000/api';
let token = '';
let documentId = '';
let folderId = '';

// Replace with actual IDs from your database
const STUDENT_ID = 'cmmspyj5c000c7s938py7w2wi';
const MENTOR_ID = 'cmmspyapt00017s93p4o2hx0j';

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

async function testUploadDocument() {
  try {
    console.log('\n📝 Testing: Upload document');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test document content for DMIF Student Tracker.');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('title', 'Introduction to AI/ML');
    formData.append('description', 'Comprehensive guide to artificial intelligence and machine learning');
    formData.append('type', 'LEARNING_MATERIAL');
    formData.append('program', 'G_CMP');
    formData.append('track', 'AI Product Development');
    formData.append('visibility', 'STUDENT_ONLY');
    formData.append('metadata', JSON.stringify({
      readingTime: 45,
      required: true,
      tags: ['AI', 'ML', 'Introduction']
    }));
    formData.append('studentIds', JSON.stringify([STUDENT_ID]));

    const response = await axios.post(
      `${API_URL}/documents/upload`,
      formData,
      { 
        headers: { 
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`
        },
        validateStatus: (status) => status < 500
      }
    );

    // Clean up test file
    fs.unlinkSync(testFilePath);

    if (response.status === 201) {
      console.log('✅ Document uploaded:', response.data.title);
      documentId = response.data.id;
    } else {
      console.log('❌ Failed to upload document:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetDocuments() {
  try {
    console.log('\n📝 Testing: Get all documents');
    const response = await axios.get(
      `${API_URL}/documents`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'documents');
    } else {
      console.log('❌ Failed to get documents:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetDocumentById() {
  if (!documentId) return;
  
  try {
    console.log(`\n📝 Testing: Get document by ID ${documentId}`);
    const response = await axios.get(
      `${API_URL}/documents/${documentId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Document found:', response.data.title);
      console.log('   Type:', response.data.type);
      console.log('   Views:', response.data.stats?.viewCount || 0);
    } else {
      console.log('❌ Failed to get document:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGrantPermission() {
  if (!documentId) return;
  
  try {
    console.log('\n📝 Testing: Grant document permission');
    const response = await axios.post(
      `${API_URL}/documents/${documentId}/permissions`,
      {
        studentId: STUDENT_ID,
        canView: true,
        canDownload: true
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Permission granted');
    } else {
      console.log('❌ Failed to grant permission:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetPermissions() {
  if (!documentId) return;
  
  try {
    console.log('\n📝 Testing: Get document permissions');
    const response = await axios.get(
      `${API_URL}/documents/${documentId}/permissions`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'permissions');
    } else {
      console.log('❌ Failed to get permissions:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testCreateFolder() {
  try {
    console.log('\n📝 Testing: Create folder');
    const response = await axios.post(
      `${API_URL}/documents/folders`,
      {
        name: 'AI/ML Learning Materials',
        description: 'All resources for AI and Machine Learning',
        program: 'G_CMP',
        track: 'AI Product Development'
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 201) {
      console.log('✅ Folder created:', response.data.name);
      folderId = response.data.id;
    } else {
      console.log('❌ Failed to create folder:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGetFolders() {
  try {
    console.log('\n📝 Testing: Get folders');
    const response = await axios.get(
      `${API_URL}/documents/folders?program=G_CMP`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'folders');
    } else {
      console.log('❌ Failed to get folders:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testAddToFolder() {
  if (!documentId || !folderId) return;
  
  try {
    console.log('\n📝 Testing: Add document to folder');
    const response = await axios.post(
      `${API_URL}/documents/folders/${folderId}/documents/${documentId}`,
      {},
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Document added to folder');
    } else {
      console.log('❌ Failed to add to folder:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testDocumentStats() {
  try {
    console.log('\n📝 Testing: Get document statistics');
    const response = await axios.get(
      `${API_URL}/documents/stats?program=G_CMP`,
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

async function testDownloadDocument() {
  if (!documentId) return;
  
  try {
    console.log('\n📝 Testing: Download document');
    const response = await axios.get(
      `${API_URL}/documents/${documentId}/download`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'stream',
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Document downloaded successfully');
    } else {
      console.log('❌ Failed to download document:', response.status);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testViewDocument() {
  if (!documentId) return;
  
  try {
    console.log('\n📝 Testing: View document');
    const response = await axios.get(
      `${API_URL}/documents/${documentId}/view`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500,
        maxRedirects: 0
      }
    );

    if (response.status === 200) {
      console.log('✅ Document view successful');
    } else {
      console.log('❌ Failed to view document:', response.status);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testSearchDocuments() {
  try {
    console.log('\n📝 Testing: Search documents');
    const response = await axios.get(
      `${API_URL}/documents?search=AI&program=G_CMP`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Found', response.data.length, 'documents matching search');
    } else {
      console.log('❌ Failed to search documents:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Document API tests...\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Start the server: pnpm dev');
  console.log('   2. Create uploads directory: mkdir uploads');
  console.log('   3. Update STUDENT_ID and MENTOR_ID with actual IDs from your database');
  console.log('   4. Temporarily disable authentication in routes for testing\n');
  
  await login();
  
  // if (STUDENT_ID === 'YOUR_STUDENT_ID_HERE' || MENTOR_ID === 'YOUR_MENTOR_ID_HERE') {
  //   console.log('\n❌ Please update STUDENT_ID and MENTOR_ID with actual values from your database');
  //   console.log('   Run: pnpm prisma:studio to see the IDs');
  //   return;
  // }
  
  console.log('\n📋 Using:');
  console.log('   Student ID:', STUDENT_ID);
  console.log('   Mentor ID:', MENTOR_ID);
  
  // Run tests in sequence
  await testUploadDocument();
  await testGetDocuments();
  await testGetDocumentById();
  await testGrantPermission();
  await testGetPermissions();
  await testCreateFolder();
  await testGetFolders();
  await testAddToFolder();
  await testDocumentStats();
  await testDownloadDocument();
  await testViewDocument();
  await testSearchDocuments();
  
  console.log('\n✅ Document API tests completed!');
}

runTests();