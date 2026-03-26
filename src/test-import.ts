// backend/src/test-import.ts
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function testImports() {
  console.log('🧪 Testing Import APIs...\n');
  
  await login();
  
  // Create test CSV file for students
  const studentCsv = `name,email,program,track,status,joinDate,phone
Robert Kim,robert.kim@test.com,G-CMP,AI Product Development,active,2024-03-01,+1234567890
Sarah Lee,sarah.lee@test.com,G-GMP,Patent Track,active,2024-03-15,+1234567891
Mike Chen,mike.chen@test.com,PCP,AI Product Development,active,2024-03-20,+1234567892`;

  const studentCsvPath = path.join(__dirname, 'test-students.csv');
  fs.writeFileSync(studentCsvPath, studentCsv);
  
  // Test Student Import
  console.log('📁 Importing Students...');
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(studentCsvPath));
    
    const response = await axios.post(`${API_URL}/import/students`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Import results:', response.data);
  } catch (error: any) {
    console.log('❌ Student import failed:', error.response?.data);
  }
  
  // Clean up test file
  fs.unlinkSync(studentCsvPath);
  
  // Create test CSV file for outcomes
  const outcomeCsv = `studentEmail,type,title,status,date,tags
robert.kim@test.com,PATENT,AI Search System,FILED,2024-03-20,AI,Search
sarah.lee@test.com,PAPER,Advances in AI,PUBLISHED,2024-03-15,AI,Research
mike.chen@test.com,CERTIFICATION,AI Specialist,COMPLETED,2024-03-10,AI,Certification`;

  const outcomeCsvPath = path.join(__dirname, 'test-outcomes.csv');
  fs.writeFileSync(outcomeCsvPath, outcomeCsv);
  
  // Test Outcome Import
  console.log('\n📁 Importing Outcomes...');
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(outcomeCsvPath));
    
    const response = await axios.post(`${API_URL}/import/outcomes`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Import results:', response.data);
  } catch (error: any) {
    console.log('❌ Outcome import failed:', error.response?.data);
  }
  
  // Clean up test file
  fs.unlinkSync(outcomeCsvPath);
}

testImports();