const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Owner Account Approved</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#0f172a;
  font-family:Arial, Helvetica, sans-serif;
  color:#e2e8f0;
">

  <div style="
    width:100%;
    padding:40px 20px;
    box-sizing:border-box;
  ">

    <div style="
      max-width:700px;
      margin:0 auto;
      background:#111827;
      border:1px solid #334155;
      border-radius:16px;
      overflow:hidden;
    ">

      <!-- HERO -->
      <div style="
        background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
        padding:60px 40px;
        text-align:center;
        border-bottom:1px solid #334155;
      ">

        <div style="
          display:inline-block;
          background:rgba(201,168,76,0.15);
          color:#c9a84c;
          padding:8px 18px;
          border-radius:999px;
          font-size:13px;
          margin-bottom:24px;
        ">
          ZenHOTEL Owner Access
        </div>

        <h1 style="
          margin:0 0 20px 0;
          font-size:42px;
          line-height:1.2;
          color:#f8fafc;
          font-weight:bold;
        ">
          Account
          <span style="color:#c9a84c;">Approved</span>
        </h1>

        <p style="
          margin:0 auto 35px auto;
          max-width:520px;
          color:#94a3b8;
          font-size:17px;
          line-height:1.7;
        ">
          Your owner account has been successfully reviewed and approved by the ZenHOTEL administration team.
        </p>

        <a href="http://localhost:4200/login" style="
          display:inline-block;
          background:#c9a84c;
          color:#0f172a;
          text-decoration:none;
          padding:14px 28px;
          border-radius:10px;
          font-size:15px;
          font-weight:bold;
        ">
          Login to Dashboard
        </a>

      </div>

      <!-- CONTENT -->
      <div style="
        padding:40px;
      ">

        <!-- WELCOME CARD -->
        <div style="
          background:#1e293b;
          border:1px solid #334155;
          border-radius:12px;
          padding:24px;
          margin-bottom:24px;
        ">

          <h2 style="
            margin-top:0;
            margin-bottom:16px;
            color:#f8fafc;
            font-size:24px;
          ">
            Welcome,
            <span style="color:#c9a84c;">${user.name}</span>
          </h2>

          <p style="
            margin:0;
            color:#94a3b8;
            line-height:1.8;
            font-size:15px;
          ">
            Your account has been granted the
            <strong style="color:#f8fafc;">Owner</strong>
            role on the ZenHOTEL platform.
            You may now access your dashboard and begin managing hotels, rooms, bookings, and property listings.
          </p>

        </div>

        <!-- FEATURE CARD -->
        <div style="
          background:linear-gradient(135deg,#1e293b,#0f172a);
          border:1px solid #c9a84c;
          border-radius:12px;
          padding:24px;
        ">

          <h3 style="
            margin-top:0;
            color:#f8fafc;
            font-size:20px;
            margin-bottom:10px;
          ">
            Next Steps
          </h3>

          <p style="
            margin:0;
            color:#94a3b8;
            font-size:14px;
            line-height:1.7;
          ">
            Log in to your owner dashboard to configure your hotel profile,
            upload property images, manage availability, and track reservations in real time.
          </p>

        </div>

      </div>

      <!-- FOOTER -->
      <div style="
        border-top:1px solid #334155;
        padding:24px;
        text-align:center;
        color:#64748b;
        font-size:13px;
        background:#0f172a;
      ">
        © 2026 ZenHOTEL — Premium Hotel Management Platform
      </div>

    </div>

  </div>

</body>
</html>
`
    };
    await transporter.sendMail(mail);
}


//(incomplete) idea: email verification for all users on signup (before validation for owner)
exports.sendVerificationEmail = async(user, verificationLink) =>
{

    const mail = 
    {

        from: process.env.MAIL_FROM,
        to: user.email,

        subject: 'ZehHotels Account Verification',

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Verify Your Email</title>
</head>
<body style="
  margin:0;
  padding:0;
  background:#0f172a;
  font-family:Arial, Helvetica, sans-serif;
  color:#e2e8f0;
">
  <div style="
    width:100%;
    padding:40px 20px;
    box-sizing:border-box;
  ">

    <div style="
      max-width:700px;
      margin:0 auto;
      background:#111827;
      border:1px solid #334155;
      border-radius:16px;
      overflow:hidden;
    ">

      <!-- HERO -->
      <div style="
        background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
        padding:60px 40px;
        text-align:center;
        border-bottom:1px solid #334155;
      ">

        <div style="
          display:inline-block;
          background:rgba(201,168,76,0.15);
          color:#c9a84c;
          padding:8px 18px;
          border-radius:999px;
          font-size:13px;
          margin-bottom:24px;
        ">
          ZenHOTEL Verification
        </div>

        <h1 style="
          margin:0 0 20px 0;
          font-size:42px;
          line-height:1.2;
          color:#f8fafc;
          font-weight:bold;
        ">
          Verify Your
          <span style="color:#c9a84c;">Account</span>
        </h1>

        <p style="
          margin:0 auto 35px auto;
          max-width:520px;
          color:#94a3b8;
          font-size:17px;
          line-height:1.7;
        ">
          Complete your account setup and activate your ZenHOTEL experience securely.
        </p>

        <a href="${verificationLink}" style="
          display:inline-block;
          background:#c9a84c;
          color:#0f172a;
          text-decoration:none;
          padding:14px 28px;
          border-radius:10px;
          font-size:15px;
          font-weight:bold;
        ">
          Verify Email
        </a>

      </div>

      <!-- CONTENT -->
      <div style="
        padding:40px;
      ">

        <div style="
          background:#1e293b;
          border:1px solid #334155;
          border-radius:12px;
          padding:24px;
          margin-bottom:24px;
        ">

          <h2 style="
            margin-top:0;
            margin-bottom:16px;
            color:#f8fafc;
            font-size:24px;
          ">
            Welcome to
            <span style="color:#c9a84c;">ZenHOTEL</span>
          </h2>

          <p style="
            margin:0;
            color:#94a3b8;
            line-height:1.8;
            font-size:15px;
          ">
            This verification link secures your account and confirms your email address.
            If you did not create this account, you can safely ignore this message.
          </p>

        </div>

        <!-- INFO CARD -->
        <div style="
          background:linear-gradient(135deg,#1e293b,#0f172a);
          border:1px solid #c9a84c;
          border-radius:12px;
          padding:24px;
        ">

          <h3 style="
            margin-top:0;
            color:#f8fafc;
            font-size:20px;
            margin-bottom:10px;
          ">
            Secure Access
          </h3>

          <p style="
            margin:0;
            color:#94a3b8;
            font-size:14px;
            line-height:1.7;
          ">
            For security reasons, this verification link may expire after a limited period.
            Verify your account as soon as possible.
          </p>

        </div>

      </div>

      <!-- FOOTER -->
      <div style="
        border-top:1px solid #334155;
        padding:24px;
        text-align:center;
        color:#64748b;
        font-size:13px;
        background:#0f172a;
      ">
        © 2026 ZenHOTEL — Premium Hotel Booking Experience
      </div>

    </div>

  </div>
</body>
</html>
`
    };
    await transporter.sendMail(mail);
}



exports.sendOwnerRequestNotification = async (user) => {

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: "New Owner Validation Request",

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Owner Validation Request</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#0f172a;
  font-family:Arial, Helvetica, sans-serif;
  color:#e2e8f0;
">

  <div style="
    width:100%;
    padding:40px 20px;
    box-sizing:border-box;
  ">

    <div style="
      max-width:700px;
      margin:0 auto;
      background:#111827;
      border:1px solid #334155;
      border-radius:16px;
      overflow:hidden;
    ">

      <!-- HERO -->
      <div style="
        background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
        padding:60px 40px;
        text-align:center;
        border-bottom:1px solid #334155;
      ">

        <div style="
          display:inline-block;
          background:rgba(201,168,76,0.15);
          color:#c9a84c;
          padding:8px 18px;
          border-radius:999px;
          font-size:13px;
          margin-bottom:24px;
        ">
          ZenHOTEL Administration
        </div>

        <h1 style="
          margin:0 0 20px 0;
          font-size:40px;
          line-height:1.2;
          color:#f8fafc;
          font-weight:bold;
        ">
          New Owner
          <span style="color:#c9a84c;">Request</span>
        </h1>

        <p style="
          margin:0 auto 35px auto;
          max-width:520px;
          color:#94a3b8;
          font-size:17px;
          line-height:1.7;
        ">
          A new user has submitted a request for owner account validation on the ZenHOTEL platform.
        </p>

      </div>

      <!-- CONTENT -->
      <div style="
        padding:40px;
      ">

        <!-- USER CARD -->
        <div style="
          background:#1e293b;
          border:1px solid #334155;
          border-radius:12px;
          padding:24px;
          margin-bottom:24px;
        ">

          <h2 style="
            margin-top:0;
            margin-bottom:20px;
            color:#f8fafc;
            font-size:24px;
          ">
            Applicant Information
          </h2>

          <table width="100%" cellpadding="0" cellspacing="0">

            <tr>
              <td style="
                padding:10px 0;
                color:#94a3b8;
                width:140px;
              ">
                Full Name
              </td>

              <td style="
                padding:10px 0;
                color:#f8fafc;
                font-weight:bold;
              ">
                ${user.name}
              </td>
            </tr>

            <tr>
              <td style="
                padding:10px 0;
                color:#94a3b8;
              ">
                Email Address
              </td>

              <td style="
                padding:10px 0;
                color:#f8fafc;
                font-weight:bold;
              ">
                ${user.email}
              </td>
            </tr>

            <tr>
              <td style="
                padding:10px 0;
                color:#94a3b8;
              ">
                Requested Role
              </td>

              <td style="
                padding:10px 0;
                color:#c9a84c;
                font-weight:bold;
              ">
                Owner
              </td>
            </tr>

          </table>

        </div>

        <!-- ACTION CARD -->
        <div style="
          background:linear-gradient(135deg,#1e293b,#0f172a);
          border:1px solid #c9a84c;
          border-radius:12px;
          padding:24px;
        ">

          <h3 style="
            margin-top:0;
            color:#f8fafc;
            font-size:20px;
            margin-bottom:10px;
          ">
            Administrative Action Required
          </h3>

          <p style="
            margin:0 0 25px 0;
            color:#94a3b8;
            font-size:14px;
            line-height:1.7;
          ">
            Review the applicant information and approve or reject the owner access request from the administration dashboard.
          </p>

          <a href="http://localhost:4200/login"
             style="
              display:inline-block;
              background:#c9a84c;
              color:#0f172a;
              text-decoration:none;
              padding:14px 28px;
              border-radius:10px;
              font-size:15px;
              font-weight:bold;
             ">
            Open Admin Dashboard
          </a>

        </div>

      </div>

      <!-- FOOTER -->
      <div style="
        border-top:1px solid #334155;
        padding:24px;
        text-align:center;
        color:#64748b;
        font-size:13px;
        background:#0f172a;
      ">
        © 2026 ZenHOTEL — Administrative Notification System
      </div>

    </div>

  </div>

</body>
</html>
      `
    });

    console.log("Owner validation request email sent.");

};