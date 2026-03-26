import ejs from 'ejs';
import path from 'path';
import transporter from '../config/emailConfig.js';

export type AcademicUseCase = 'ASSIGNMENT_SUBMISSION' | 'TEST_SUBMISSION' | 'WARNING' | 'DAILY_MEETING';

export type AcademicEmailData = {
    email: string;
    studentName: string;
    subjectName?: string;
    title?: string;
    link?: string;
    testTitle?: string;
    marks?: number;
    totalMarks?: number;
    course?: string;
    attendance?: number;
    meetingLink?: string;
    remarks?: string;
};

export const sendAcademicMail = async (studentData: AcademicEmailData, useCase: AcademicUseCase) => {
  let templateName: string;
  let subject: string;

  // Map use cases to templates and subjects
  switch (useCase) {
    case 'ASSIGNMENT_SUBMISSION':
      templateName = 'assignment.ejs';
      subject = `Confirmation: Assignment Received - ${studentData.subjectName}`;
      break;
    case 'TEST_SUBMISSION':
      templateName = 'test.ejs';
      subject = `Test Submission Successful: ${studentData.testTitle}`;
      break;
    case 'WARNING':
      templateName = 'warning.ejs';
      subject = `Urgent: Attendance/Performance Warning`;
      break;
    case 'DAILY_MEETING':
      templateName = 'meeting.ejs';
      subject = `Daily Sync: Meeting Link & Progress Report`;
      break;
    default:
      throw new Error("Invalid Use Case");
  }

  // 1. Resolve template path (resolves to root /views folder)
  const templatePath = path.join(process.cwd(), 'views', 'emails', templateName);

  try {
    // 2. Render HTML with student-specific data
    const html = await ejs.renderFile(templatePath, { 
      data: studentData,
      subject: subject // Passed for header tag title
    });

    // 3. Send via SMTP2GO
    const info = await transporter.sendMail({
      from: `"Department of CS" <${process.env.FROM_EMAIL}>`,
      to: studentData.email,
      subject: subject,
      html: html,
    });

    return info;
  } catch (error) {
    console.error(`Failed to send academic email [${useCase}]:`, error);
    throw error;
  }
};
