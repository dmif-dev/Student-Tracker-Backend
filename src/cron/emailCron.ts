import cron from 'node-cron';
import { sendAcademicMail } from '../services/academicEmailService.js';

// Setup Mock User query for illustrative purposes or add actual Database Model imports
// import { User } from '../models/User.js';

// Automated Trigger Sample Strategy 1: Daily Meetings
export const setupDailyMeetingCron = () => {
    // Runs every morning at 8:00 AM (0 8 * * *)
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron Job] Triggering Daily Meeting Emails...');
        try {
            // const students = await User.find({ role: 'student' });
            const mockStudents = [
                { name: 'Sathwik', email: 'sathwik.s@wisework.in', meetingLink: 'https://meet.google.com/xyz-abc', remarks: "Don't forget your project updates!" }
            ];

            mockStudents.forEach(student => {
                sendAcademicMail({
                    studentName: student.name,
                    email: student.email,
                    meetingLink: student.meetingLink,
                    remarks: student.remarks
                }, 'DAILY_MEETING');
            });
        } catch (error) {
            console.error('[Cron Job] Failed triggering meetings layout:', error);
        }
    });
};

// Automated Trigger Sample Strategy 2: Attendance Warnings
export const setupWarningCron = () => {
    // Runs every Sunday at midnight (0 0 * * 0)
    cron.schedule('0 0 * * 0', async () => {
        console.log('[Cron Job] Triggering Attendance Warnings...');
        // Add low attendance fetching DB logic here and call sendAcademicMail 'WARNING'
    });
};
