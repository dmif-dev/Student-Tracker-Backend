export type GeneralEmailData = {
    title: string;
    message: string;
    ctaText?: string;
    ctaLink?: string;
};

export const getGeneralEmailHtml = (data: GeneralEmailData): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title}</title>
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

            <!-- Content Area -->
            <div style="margin-bottom: 24px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">${data.title}</h1>
              
              <div style="font-size: 16px; color: #334155; line-height: 1.6; white-space: pre-line;">${data.message}</div>
            </div>

            ${data.ctaLink && data.ctaText ? `
            <!-- Optional Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.ctaLink}" style="background-color: #ff6633; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 100px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 102, 51, 0.25);">${data.ctaText}</a>
            </div>
            ` : ''}

            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 32px 0 0 0;">
              Best regards,<br>
              <strong>The Student Tracker Team</strong>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">
              This is an automated operational email sent from Student Tracker.
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
