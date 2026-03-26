export type SessionNotificationData = {
    studentName: string;
    mentorName: string;
    sessionTopic: string;
    dateTime: string;
};

export const getSessionNotificationHtml = (data: SessionNotificationData): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Session Confirmed</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        @media only screen and (max-width: 600px) {
          .container {
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .content {
            padding: 24px 20px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="background-color: #f8fafc; padding: 40px 0;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          <!-- Top Accent Bar -->
          <div style="background: linear-gradient(135deg, #ff6633 0%, #003d7a 100%); height: 6px;"></div>
          
          <div class="content" style="padding: 32px 40px;">
            <!-- Logo / Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="font-size: 24px; font-weight: 800; color: #003d7a; letter-spacing: -0.5px;">Student</span><span style="font-size: 24px; font-weight: 800; color: #ff6633;">Tracker</span>
            </div>

            <!-- Icon & Headline -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="background-color: #fff7f0; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <span style="font-size: 28px; line-height: 56px;">🎓</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">Mentorship Session Confirmed!</h1>
              <p style="font-size: 15px; color: #64748b; margin-top: 8px;">Your session has been successfully booked and scheduled.</p>
            </div>

            <!-- Greeting -->
            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
              Hi <strong>${data.studentName}</strong>,
            </p>

            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
              Here are the details for your upcoming mentorship session on <strong>Student Tracker</strong>.
            </p>

            <!-- Details Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #64748b; width: 100px;">Mentor</td>
                  <td style="padding-bottom: 12px; font-size: 15px; font-weight: 600; color: #0f172a;">${data.mentorName}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #64748b;">Topic</td>
                  <td style="padding-bottom: 12px; font-size: 15px; font-weight: 600; color: #0f172a;">${data.sessionTopic}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #64748b;">Date & Time</td>
                  <td style="font-size: 15px; font-weight: 600; color: #ff6633;">${data.dateTime}</td>
                </tr>
              </table>
            </div>

            <!-- Call to Action/Advice -->
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: top; width: 32px; font-size: 20px;">💡</td>
                  <td>
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0369a1;">Preparation is key!</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #0c4a6e; line-height: 1.5;">Please make sure to have your reports ready and questions listed before joining the meeting.</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Button -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="https://student-tracker.example.com" style="background-color: #ff6633; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 100px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 102, 51, 0.25);">View Session Workspace</a>
            </div>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; text-align: center; margin: 0;">
              If you have any questions or need to reschedule, please contact your mentor.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">
              You're receiving this because you are enrolled in a mentorship program on Student Tracker.
            </p>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 8px;">
              &copy; ${new Date().getFullYear()} Student Tracker. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
};
