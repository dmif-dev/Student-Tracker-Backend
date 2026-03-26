import { Request, Response } from 'express';
import transporter from '../config/emailConfig.js';
import { getSessionNotificationHtml } from '../templates/sessionNotification.js';
import { getGeneralEmailHtml } from '../templates/generalEmail.js';
import { sendAcademicMail, AcademicUseCase, AcademicEmailData } from '../services/academicEmailService.js';

export const sendSessionNotification = async (req: Request, res: Response) => {
  // Data coming from Frontend triggers
  const { recipientEmail, studentName, mentorName, sessionTopic, dateTime } = req.body;

  const htmlContent = getSessionNotificationHtml({
    studentName,
    mentorName,
    sessionTopic,
    dateTime
  });

  try {
    const info = await transporter.sendMail({
      from: `"Student Tracker" <${process.env.FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `[Student Tracker] Mentorship Session Booking: ${sessionTopic}`,
      html: htmlContent,
    });

    console.log('Session notification sent:', info.messageId);
    res.status(200).json({ success: true, message: 'Notification delivered.' });
  } catch (error) {
    console.error('Failed to send session update:', error);
    res.status(500).json({ success: false, message: 'Delivery failed.' });
  }
};

export const sendDirectEmail = async (req: Request, res: Response) => {
  const { to, subject, text, html, ctaText, ctaLink } = req.body;

  try {
    const htmlContent = html || getGeneralEmailHtml({
      title: subject,
      message: text,
      ctaText,
      ctaLink
    });

    const info = await transporter.sendMail({
      from: `"Support" <${process.env.FROM_EMAIL}>`,
      to: to,
      subject: subject,
      text: text,
      html: htmlContent, 
    });

    console.log('Message sent:', info.messageId);
    res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

export const sendAcademicEmailController = async (req: Request, res: Response) => {
  const { to, templateType, payload } = req.body;
  
  if (!to || !templateType || !payload) {
    res.status(400).json({ success: false, message: 'to, templateType and payload are required fields.' });
    return;
  }

  const useCaseMap: Record<string, AcademicUseCase> = {
    'ASSIGNMENT': 'ASSIGNMENT_SUBMISSION',
    'TEST': 'TEST_SUBMISSION',
    'MEETING': 'DAILY_MEETING',
    'WARNING': 'WARNING'
  };
  
  const useCase = useCaseMap[templateType];
  if (!useCase) {
    res.status(400).json({ success: false, message: 'Invalid templateType.' });
    return;
  }

  const studentData: AcademicEmailData = {
    email: to,
    studentName: payload.studentName || 'Student',
    subjectName: payload.courseName || '',
    title: payload.subject || 'Academic Notice',
    link: payload.link || '#',
    testTitle: payload.subject || '',
    marks: templateType === 'TEST' ? Number(payload.remarks) || 85 : 0,
    totalMarks: 100,
    course: payload.courseName || '',
    attendance: templateType === 'WARNING' ? Number(payload.remarks) || 0 : 0,
    meetingLink: payload.link || '',
    remarks: payload.remarks || ''
  };

  try {
    const info = await sendAcademicMail(studentData, useCase);
    res.status(200).json({ success: true, message: 'Academic email sent successfully!', info });
  } catch (error: any) {
    console.error('Failed to send academic email:', error);
    res.status(500).json({ success: false, message: 'Failed to send academic email', error: error.message });
  }
};
