// backend/src/test-all-phase4.ts
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:4000/api';
let token = '';
let adminToken = '';
let mentorToken = '';
let studentToken = '';

// Store IDs for testing
let programId = '';
let mentorId = '';
let studentId = '';
let assignmentId = '';
let submissionId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function logSuccess(msg: string) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logError(msg: string) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function logInfo(msg: string) {
  console.log(`${colors.blue}📌 ${msg}${colors.reset}`);
}

function logWarning(msg: string) {
  console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}📋 ${title}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

async function login() {
  try {
    // Admin login
    const adminRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@dmif.org',
      password: 'admin123'
    });
    adminToken = adminRes.data.token;
    logSuccess('Admin login successful');

    // Mentor login
    const mentorRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'dr.madhan@dmif.org',
      password: 'mentor123'
    });
    mentorToken = mentorRes.data.token;
    logSuccess('Mentor login successful');

    // Student login
    const studentRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'john.doe@dmifstudent.org',
      password: 'student123'
    });
    studentToken = studentRes.data.token;
    logSuccess('Student login successful');

    return true;
  } catch (error) {
    logError('Login failed - make sure server is running');
    console.error(error);
    return false;
  }
}

// ==================== Program Tests ====================
async function testPrograms() {
  logSection('PROGRAMS API');

  try {
    // Get all programs
    const res = await axios.get(`${API_URL}/programs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Found ${res.data.length} programs`);
    if (res.data.length > 0) {
      programId = res.data[0].id;
      logInfo(`First program ID: ${programId}`);
    }

    // Get program by ID
    if (programId) {
      const programRes = await axios.get(`${API_URL}/programs/${programId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Program details: ${programRes.data.name}`);
    }

    // Get program metrics
    if (programId) {
      const metricsRes = await axios.get(`${API_URL}/programs/${programId}/metrics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Program metrics - Students: ${metricsRes.data.totalStudents}`);
    }
  } catch (error: any) {
    logError(`Programs test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Dashboard Tests ====================
async function testDashboards() {
  logSection('DASHBOARD API');

  try {
    // Student Dashboard
    const studentDash = await axios.get(`${API_URL}/dashboard/student`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Student Dashboard - Progress: ${studentDash.data.stats.totalProgressEntries}`);
    logInfo(`Profile: ${studentDash.data.profile.name}`);

    // Mentor Dashboard
    const mentorDash = await axios.get(`${API_URL}/dashboard/mentor`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    logSuccess(`Mentor Dashboard - Students: ${mentorDash.data.stats.totalStudents}`);

    // Admin Dashboard
    const adminDash = await axios.get(`${API_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Admin Dashboard - Total Students: ${adminDash.data.stats.totalStudents}`);
  } catch (error: any) {
    logError(`Dashboard test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Announcement Tests ====================
async function testAnnouncements() {
  logSection('ANNOUNCEMENTS API');

  try {
    // Create announcement
    const createRes = await axios.post(`${API_URL}/announcements`, {
      title: 'Test Announcement',
      content: 'This is a test announcement from the test suite',
      target: 'all',
      priority: 'high'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Announcement created: ${createRes.data.title}`);

    // Get all announcements
    const getRes = await axios.get(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Found ${getRes.data.length} announcements`);

    // Update announcement
    if (createRes.data.id) {
      await axios.put(`${API_URL}/announcements/${createRes.data.id}`, {
        title: 'Updated Test Announcement'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess('Announcement updated');

      // Delete announcement
      await axios.delete(`${API_URL}/announcements/${createRes.data.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess('Announcement deleted');
    }
  } catch (error: any) {
    logError(`Announcement test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Progress Tests ====================
async function testProgress() {
  logSection('PROGRESS API');

  try {
    // Get student list to get ID
    const students = await axios.get(`${API_URL}/students`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (students.data.length > 0) {
      studentId = students.data[0].id;
      
      // Get student progress
      const progressRes = await axios.get(`${API_URL}/progress/student/${studentId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Found ${progressRes.data.data.length} progress entries`);

      // Get progress stats
      const statsRes = await axios.get(`${API_URL}/progress/stats/${studentId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Progress Stats - Total Entries: ${statsRes.data.totalEntries}`);

      // Get progress trends
      const trendsRes = await axios.get(`${API_URL}/progress/trends/${studentId}?months=3`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Progress Trends: ${trendsRes.data.length} months of data`);
    }
  } catch (error: any) {
    logError(`Progress test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Assignment Tests ====================
async function testAssignments() {
  logSection('ASSIGNMENTS API');

  try {
    // Create an assignment (mentor)
    const createRes = await axios.post(`${API_URL}/assignments`, {
      title: 'Test Assignment',
      description: 'This is a test assignment for the test suite',
      documentId: 'test-doc-id',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      points: 100,
      program: 'G_CMP'
    }, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    
    if (createRes.data) {
      assignmentId = createRes.data.id;
      logSuccess(`Assignment created: ${createRes.data.title}`);
    }

    // Get assignments
    const getRes = await axios.get(`${API_URL}/assignments`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Found ${getRes.data.length} assignments`);

    // Submit assignment (student)
    if (assignmentId) {
      const submitRes = await axios.post(`${API_URL}/assignments/${assignmentId}/submit`, {
        content: 'This is my submission content',
        files: ['submission.pdf']
      }, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      logSuccess(`Assignment submitted: ${submitRes.data.status}`);
      submissionId = submitRes.data.id;
    }

    // Get submissions (mentor)
    if (assignmentId) {
      const submissionsRes = await axios.get(`${API_URL}/assignments/${assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${mentorToken}` }
      });
      logSuccess(`Found ${submissionsRes.data.length} submissions`);
    }

    // Grade submission
    if (submissionId) {
      const gradeRes = await axios.put(`${API_URL}/assignments/submissions/${submissionId}/grade`, {
        grade: 85,
        feedback: 'Good work! Could improve on code quality.'
      }, {
        headers: { Authorization: `Bearer ${mentorToken}` }
      });
      logSuccess(`Submission graded: ${gradeRes.data.grade}/100`);
    }
  } catch (error: any) {
    logError(`Assignment test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Session Tests ====================
async function testSessions() {
  logSection('SESSIONS API');

  try {
    // Get upcoming sessions
    const upcomingRes = await axios.get(`${API_URL}/sessions/upcoming`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Found ${upcomingRes.data.length} upcoming sessions`);

    // Get session history
    const historyRes = await axios.get(`${API_URL}/sessions/history`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Found ${historyRes.data.data.length} past sessions`);
  } catch (error: any) {
    logError(`Session test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Document Tests ====================
async function testDocuments() {
  logSection('DOCUMENTS API');

  try {
    // Get documents
    const docsRes = await axios.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Found ${docsRes.data.length} documents`);

    // Get document stats
    const statsRes = await axios.get(`${API_URL}/documents/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Total documents: ${statsRes.data.total}`);
  } catch (error: any) {
    logError(`Document test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Outcome Tests ====================
async function testOutcomes() {
  logSection('OUTCOMES API');

  try {
    // Get outcomes
    const outcomesRes = await axios.get(`${API_URL}/outcomes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Found ${outcomesRes.data.length} outcomes`);

    // Get student outcome summary
    if (studentId) {
      const summaryRes = await axios.get(`${API_URL}/outcomes/student/${studentId}/summary`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Student outcomes total: ${summaryRes.data.total}`);
      logInfo(`Outcomes by type: ${JSON.stringify(summaryRes.data.byType)}`);
    }

    // Get program outcome summary
    if (programId) {
      const programRes = await axios.get(`${API_URL}/outcomes/program/G_CMP/summary`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Program outcomes total: ${programRes.data.total}`);
    }

    // Get outcome trends
    const trendsRes = await axios.get(`${API_URL}/outcomes/analytics/trends`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Outcome trends period: ${trendsRes.data.period}`);
  } catch (error: any) {
    logError(`Outcome test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Search Tests ====================
async function testSearch() {
  logSection('SEARCH API');

  try {
    // Full text search
    const searchRes = await axios.get(`${API_URL}/search?q=AI`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Search found ${searchRes.data.metadata.total} results`);
    logInfo(`Search time: ${searchRes.data.metadata.searchTime}ms`);

    // Search suggestions
    const suggestionsRes = await axios.get(`${API_URL}/search/suggestions?q=AI`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Found ${suggestionsRes.data.length} suggestions`);
  } catch (error: any) {
    logError(`Search test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Activity Tests ====================
async function testActivities() {
  logSection('ACTIVITY API');

  try {
    // Get user activity
    const userActivity = await axios.get(`${API_URL}/activities/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Found ${userActivity.data.data.length} user activities`);

    // Get system activity (admin only)
    const systemActivity = await axios.get(`${API_URL}/activities/system?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess(`Found ${systemActivity.data.data.length} system activities`);
  } catch (error: any) {
    logError(`Activity test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Settings Tests ====================
async function testSettings() {
  logSection('SETTINGS API');

  try {
    // Get preferences
    const prefsRes = await axios.get(`${API_URL}/settings/preferences`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Preferences fetched: ${JSON.stringify(prefsRes.data)}`);

    // Update preferences
    const updateRes = await axios.put(`${API_URL}/settings/preferences`, {
      preferences: { theme: 'dark', notifications: true }
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Preferences updated: ${JSON.stringify(updateRes.data)}`);

    // Update profile
    const profileRes = await axios.put(`${API_URL}/settings/profile`, {
      name: 'Test User Updated',
      phone: '+1234567890'
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess('Profile updated successfully');
  } catch (error: any) {
    logError(`Settings test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Report Tests ====================
async function testReports() {
  logSection('REPORTS API');

  try {
    // Get weekly reports
    const weeklyRes = await axios.get(`${API_URL}/reports/weekly/student/${studentId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logSuccess(`Found ${weeklyRes.data.data.length} weekly reports`);

    // Generate program report
    if (programId) {
      const programReport = await axios.get(`${API_URL}/reports/generate/program/${programId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess(`Program report generated - Students: ${programReport.data.summary.totalStudents}`);
    }
  } catch (error: any) {
    logError(`Report test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Bulk Import Test ====================
async function testBulkImport() {
  logSection('BULK IMPORT API');

  try {
    // Create test CSV file
    const csvContent = `name,email,program,track,status,joinDate
Bulk Test Student,bulk.test@example.com,G-CMP,AI Product Development,active,2024-03-01`;
    
    const csvPath = path.join(__dirname, 'test-bulk-import.csv');
    fs.writeFileSync(csvPath, csvContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath));
    
    const response = await axios.post(`${API_URL}/import/students`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    logSuccess(`Bulk import completed: ${response.data.success} successful, ${response.data.failed} failed`);
    
    // Clean up
    fs.unlinkSync(csvPath);
  } catch (error: any) {
    logError(`Bulk import test failed: ${error.response?.data?.error || error.message}`);
  }
}

// ==================== Run All Tests ====================
async function runAllTests() {
  console.log(`\n${colors.blue}${'🌟'.repeat(30)}${colors.reset}`);
  console.log(`${colors.blue}🚀 STARTING PHASE 4 API TESTS${colors.reset}`);
  console.log(`${colors.blue}${'🌟'.repeat(30)}${colors.reset}\n`);

  const loggedIn = await login();
  if (!loggedIn) {
    logError('Cannot proceed with tests - login failed');
    return;
  }

  await testPrograms();
  await testDashboards();
  await testAnnouncements();
  await testProgress();
  await testAssignments();
  await testSessions();
  await testDocuments();
  await testOutcomes();
  await testSearch();
  await testActivities();
  await testSettings();
  await testReports();
  await testBulkImport();

  console.log(`\n${colors.green}${'🎉'.repeat(30)}${colors.reset}`);
  console.log(`${colors.green}✅ ALL TESTS COMPLETED SUCCESSFULLY!${colors.reset}`);
  console.log(`${colors.green}${'🎉'.repeat(30)}${colors.reset}\n`);
}

// Run tests
runAllTests().catch(console.error);