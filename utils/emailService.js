const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.oauth2Client = null;
    this.init();
  }

  async init() {
    try {
      // For now, let's use basic Gmail authentication since service account requires additional setup
      // We'll implement the OAuth2 service account later when we set up domain delegation
      
      console.log('🔄 Initializing email service...');
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'mnitlive07@gmail.com',
          pass: process.env.EMAIL_PASS || 'wplw zspo imfz iljj'
        }
      });

      // Test connection
      console.log('📧 Testing email connection...');
      await this.transporter.verify();
      console.log('✅ Email service ready with Gmail');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      console.log('📝 Note: You may need to:');
      console.log('   1. Enable 2-factor authentication on Gmail');
      console.log('   2. Generate an App Password');
      console.log('   3. Update EMAIL_PASS in .env with the App Password');
      this.transporter = null;
    }
  }

  async sendOtpEmail(email, otp, fullName = 'User') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: {
          name: 'MNIT Live Platform',
          address: process.env.EMAIL_USER || 'mnitlive07@gmail.com'
        },
        to: email,
        subject: 'Email Verification - MNIT Live',
        text: `Hi ${fullName},

Your OTP for email verification is: ${otp}

This OTP is valid for 10 minutes only.

If you did not request this, please ignore this email.

Regards,
MNIT Live Team`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendVerificationEmail(email, verificationCode, userName) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: {
          name: 'MNIT Live - Hostel Dalali',
          address: process.env.EMAIL_USER || 'mnitlive07@gmail.com'
        },
        to: email,
        subject: 'Welcome to MNIT Live - Verify Your Account',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .verification-code { background: #667eea; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 5px; margin: 20px 0; letter-spacing: 2px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏠 Welcome to MNIT Live</h1>
                <p>Your Hostel Room Exchange Platform</p>
              </div>
              <div class="content">
                <h2>Hello ${userName}! 👋</h2>
                <p>Thank you for joining MNIT Live - Hostel Dalali! We're excited to help you find the perfect room exchange.</p>
                
                <p>To complete your registration, please verify your email address using the code below:</p>
                
                <div class="verification-code">
                  ${verificationCode}
                </div>
                
                <p>This verification code will expire in <strong>10 minutes</strong>.</p>
                
                <p>If you didn't create an account with MNIT Live, please ignore this email.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <h3>🎯 What's Next?</h3>
                  <ul>
                    <li>Complete your profile with room preferences</li>
                    <li>Browse available room exchanges</li>
                    <li>Connect with fellow MNITians</li>
                    <li>Track your CGPA and attendance</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Best regards,<br>The MNIT Live Team</p>
                <p><small>This is an automated email. Please do not reply.</small></p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, userName) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: {
          name: 'MNIT Live - Hostel Dalali',
          address: process.env.EMAIL_USER || 'mnitlive07@gmail.com'
        },
        to: email,
        subject: '🎉 Welcome to MNIT Live Community!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to MNIT Live!</h1>
                <p>Your account has been successfully verified</p>
              </div>
              <div class="content">
                <h2>Hello ${userName}! 🚀</h2>
                <p>Congratulations! Your email has been verified and your account is now active.</p>
                
                <h3>🏠 Platform Features:</h3>
                <div class="feature">
                  <strong>Room Exchange:</strong> Find and exchange hostel rooms with other students
                </div>
                <div class="feature">
                  <strong>CGPA Tracking:</strong> Monitor your academic performance
                </div>
                <div class="feature">
                  <strong>Attendance Management:</strong> Keep track of your class attendance
                </div>
                <div class="feature">
                  <strong>Community Connect:</strong> Build your network within MNIT
                </div>
                
                <p>Ready to get started? Log in to your account and complete your profile!</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
