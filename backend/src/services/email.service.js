const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({

    host: process.env.MAIL_HOST,

    port: process.env.MAIL_PORT,

    auth: {

        user: process.env.MAIL_USER,

        pass: process.env.MAIL_PASS,
    },
});

exports.sendOwnerValidationEmail = async(user) =>
{
    const mail = {

        from: process.env.MAIL_FROM,
        to: user.email,

        subject: 'ZenHotels Account has been approved',
    //     html:`
    //     <h2>Account Approved</h2>

    //     <pre>
    //     Hello ${user.name},
    //     Your account has been approved and granted the role of <b>'owner'</b>.
    //     You can now login and start managing your properties.
    //     Best regards,
    //     ZenHOTELS.
    //     </pre>
    //     `,
    // };
    html:
    `
    <style>
    .container
    {
        font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:40px 0;
    }
    .table-container
    {
        background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);
    }
    .header
    {        
        background:#1f2937; color:#ffffff; padding:20px 30px; text-align:center;
    }
    .email-title
    {
        margin:0; font-weight:600;
    }
    .email-body
    {
        padding:35px 30px; color:#333333; line-height:1.6; font-size:15px;
    }
    .subject
    {
        margin-top:0; color:#111827;
    }
    .button-container
    {
        text-align:center; margin:30px 0;
    }
    .redirect-button
    {
        background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:600; display:inline-block;
    }
    .signature
    {
        margin-top:25px;
    }
    .footer
    {
        background:#f3f4f6; text-align:center; padding:18px; font-size:13px; color:#6b7280;
    }
    </style>

    <div class="container">
  
  <table class="table-container"align="center" width="600" cellpadding="0" cellspacing="0">
    
    <!-- Header -->
    <tr>
      <td class="header">
        <h2 class="email-title">ZenHOTELS</h2>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td class="email-body">
        
        <h3 class="subject">Account Approved</h3>

        <p>Dear <strong>${user.name}</strong>,</p>

        <p>
        Your account has been successfully approved and you have been granted the role of 
        <strong>Owner</strong> on the ZenHOTELS platform.
        </p>

        <p>
        You may now log in and begin managing your properties.
        </p>

        <!-- Button -->
        <div class="button-container">
          <a href="http://localhost:${process.env.PORT}/api/auth/login"
             class="redirect-button">
            Login to Your Account
          </a>
        </div>

        <p>If you require assistance, please contact our support team.</p>

        <p class="signature">
        Kind regards,<br>
        <strong>The ZenHOTELS Team</strong>
        </p>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td class="footer">
        © 2026 ZenHOTELS. All rights reserved.
      </td>
    </tr>

  </table>

</div>
    `};
    await transporter.sendMail(mail);
}


//(incomplete) idea: email verification for all users on signup (before validation for owner)
exports.sendVerificationEmail = async(user) =>
{

    const mail = 
    {

        from: process.env.MAIL_FROM,
        to: user.email,

        subject: 'ZehHotels Account Verification',

        html: `<h2>account</h2>
        <pre>
        Thank you for Choosing ZenHotels.
        Bellow you'll find your account verification link:
        </pre>
        <a href=${'account link here'}>
        <button><b>Verify Account</b></button>
        </a>
        `
    };
    await transporter.sendMail(mail);
}