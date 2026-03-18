// backend/src/test-reports.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let token = '';
// Use the actual student ID from your database - replace with your actual ID
const STUDENT_ID = 'cmmspyj5c000c7s938py7w2wi'; // TODO: Replace with actual student ID from Prisma Studio
// Use the actual program ID from your database - replace with your actual ID
const PROGRAM_ID = 'cmmspyapt00017s93p4o2hx0j'; // TODO: Replace with actual program ID from Prisma Studio

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
    console.log('ℹ️ Auth not available - continuing without token (make sure to disable auth in routes)');
    token = 'test-token';
    return false;
  }
}

async function testGenerateWeeklyReport() {
  try {
    console.log(`\n📝 Testing: Generate weekly report for student ${STUDENT_ID}`);
    const response = await axios.post(
      `${API_URL}/reports/weekly/generate/${STUDENT_ID}`,
      {},
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      }
    );
    
    if (response.status === 201) {
      console.log('✅ Weekly report generated:', response.data.id);
      return response.data.id;
    } else if (response.status === 400 && response.data.error === 'Report already exists for this week') {
      console.log('ℹ️ Report already exists for this week');
      return null;
    } else if (response.status === 401) {
      console.log('❌ Authentication failed. Make sure to disable auth in routes or provide valid token');
      return null;
    } else {
      console.log('❌ Failed to generate report:', response.data);
      return null;
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Make sure to start the server with: pnpm dev');
    } else if (error.response) {
      console.log('❌ Error:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
    return null;
  }
}

async function testGetStudentReports() {
  try {
    console.log(`\n📝 Testing: Get all reports for student ${STUDENT_ID}`);
    const response = await axios.get(
      `${API_URL}/reports/weekly/student/${STUDENT_ID}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Found', response.data.data.length, 'reports');
      if (response.data.data.length > 0) {
        console.log('   First report ID:', response.data.data[0].id);
        return response.data.data[0].id;
      }
    } else if (response.status === 401) {
      console.log('❌ Authentication failed');
    } else {
      console.log('❌ Failed to get reports:', response.data);
    }
    return null;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running');
    } else {
      console.log('❌ Error:', error.message);
    }
    return null;
  }
}

async function testGetReportById(reportId: string) {
  if (!reportId) return;
  
  try {
    console.log(`\n📝 Testing: Get report by ID ${reportId}`);
    const response = await axios.get(
      `${API_URL}/reports/weekly/${reportId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Successfully fetched report');
      console.log('   Week:', new Date(response.data.weekStart).toLocaleDateString(), 'to', new Date(response.data.weekEnd).toLocaleDateString());
      console.log('   Summary:', response.data.summary.substring(0, 100) + '...');
    } else {
      console.log('❌ Failed to get report:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testGenerateProgramReport() {
  try {
    console.log(`\n📝 Testing: Generate program report for program ${PROGRAM_ID}`);
    const response = await axios.get(
      `${API_URL}/reports/generate/program/${PROGRAM_ID}?startDate=2026-03-01&endDate=2026-03-18`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Program report generated');
      console.log('   Total Students:', response.data.summary.totalStudents);
      console.log('   Average Progress:', response.data.summary.averageProgress.toFixed(1) + '%');
      console.log('   Total Entries:', response.data.summary.totalEntries);
    } else {
      console.log('❌ Failed to generate program report:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testScheduleReport() {
  try {
    console.log(`\n📝 Testing: Schedule a weekly report`);
    const response = await axios.post(
      `${API_URL}/reports/schedule`,
      {
        name: 'Test Weekly Report',
        frequency: 'weekly',
        config: {
          programId: PROGRAM_ID,
          includeTopics: true
        },
        recipients: ['test@example.com'],
        startDate: new Date().toISOString().split('T')[0]
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500
      }
    );
    
    if (response.status === 201) {
      console.log('✅ Report scheduled:', response.data.id);
    } else if (response.status === 401) {
      console.log('❌ Authentication failed for schedule (admin only)');
    } else {
      console.log('❌ Failed to schedule report:', response.data);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function testExportReport(reportId: string) {
  if (!reportId) return;
  
  try {
    console.log(`\n📝 Testing: Export report as PDF`);
    const response = await axios.get(
      `${API_URL}/reports/export/${reportId}?format=pdf`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500
      }
    );
    
    if (response.status === 200) {
      console.log('✅ PDF exported successfully (', response.data.length, 'bytes)');
    } else {
      console.log('❌ Failed to export report:', response.status);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Reports API tests...\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Start the server: pnpm dev');
  console.log('   2. Replace STUDENT_ID and PROGRAM_ID with actual IDs from your database');
  console.log('   3. Temporarily disable authentication in reports.routes.ts for testing\n');
  
  await login();
  
//   if (STUDENT_ID === '_STUDENT_ID_HERE' || PROGRAM_ID === 'PROGRAM_ID_HERE') {
//     console.log('\n❌ Please update STUDENT_ID and PROGRAM_ID with actual values from your database');
//     console.log('   Run: pnpm prisma:studio to see the IDs');
//     return;
//   }
  
  console.log('\n📋 Using:');
  console.log('   Student ID:', STUDENT_ID);
  console.log('   Program ID:', PROGRAM_ID);
  
  // Run tests
  const reportId = await testGenerateWeeklyReport();
  const existingReportId = await testGetStudentReports();
  await testGetReportById(reportId || existingReportId || '');
  await testGenerateProgramReport();
  await testScheduleReport();
  await testExportReport(reportId || existingReportId || '');
  
  console.log('\n✅ Tests completed!');
}

runTests();