const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendOwnerValidationEmail = async (user) => {
  const mail = {
    from: process.env.MAIL_FROM,
    to: user.email,

    subject: "ZenHotels Account has been approved",
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
`,
  };
  await transporter.sendMail(mail);
};

//(incomplete) idea: email verification for all users on signup (before validation for owner)
exports.sendVerificationEmail = async (user, verificationLink) => {
  const mail = {
    from: process.env.MAIL_FROM,
    to: user.email,

    subject: "ZehHotels Account Verification",

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
`,
  };
  await transporter.sendMail(mail);
};

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
      `,
  });

  console.log("Owner validation request email sent.");
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Format a Date object as "Mon 15 May 2026" */
function fmtDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Reusable email shell — dark ZenHOTEL theme */
function zenShell({ badge, title, titleAccent, subtitle, body, footerNote }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
  <div style="width:100%;padding:40px 20px;box-sizing:border-box;">
    <div style="max-width:680px;margin:0 auto;background:#111827;border:1px solid #334155;border-radius:16px;overflow:hidden;">

      <!-- HERO -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:56px 40px;text-align:center;border-bottom:1px solid #334155;">
        <div style="display:inline-block;background:rgba(201,168,76,0.15);color:#c9a84c;padding:7px 18px;border-radius:999px;font-size:13px;margin-bottom:22px;">${badge}</div>
        <h1 style="margin:0 0 16px;font-size:38px;line-height:1.2;color:#f8fafc;font-weight:bold;">
          ${title} <span style="color:#c9a84c;">${titleAccent}</span>
        </h1>
        <p style="margin:0 auto;max-width:500px;color:#94a3b8;font-size:16px;line-height:1.7;">${subtitle}</p>
      </div>

      <!-- BODY -->
      <div style="padding:36px 40px;">${body}</div>

      <!-- FOOTER -->
      <div style="border-top:1px solid #334155;padding:22px 40px;text-align:center;color:#64748b;font-size:12px;background:#0f172a;">
        ${footerNote ? `<p style="margin:0 0 6px;color:#94a3b8;font-size:13px;">${footerNote}</p>` : ""}
        &copy; 2026 ZenHOTEL &mdash; Premium Hotel Booking Platform
      </div>

    </div>
  </div>
</body>
</html>`;
}

/** Reusable booking-details card (used in all three booking emails) */
function bookingCard({ hotel, room, checkIn, checkOut, nights, totalPrice }) {
  const pricePerNight = room.pricePerNight?.$numberDecimal
    ? parseFloat(room.pricePerNight.$numberDecimal)
    : parseFloat(room.pricePerNight?.toString() ?? "0");

  const row = (label, value) =>
    `<tr>
      <td style="padding:9px 0;color:#94a3b8;width:150px;font-size:14px;">${label}</td>
      <td style="padding:9px 0;color:#f8fafc;font-weight:600;font-size:14px;">${value}</td>
    </tr>`;

  return `
  <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px;">
    <h3 style="margin:0 0 18px;color:#f8fafc;font-size:18px;">Booking Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Hotel", hotel.name)}
      ${row("Location", hotel.location)}
      ${row("Room", `#${room.roomNumber} &mdash; ${room.type}`)}
      ${row("Check&#8209;in", fmtDate(checkIn))}
      ${row("Check&#8209;out", fmtDate(checkOut))}
      ${row("Duration", `${nights} night${nights !== 1 ? "s" : ""}`)}
      ${row("Price / night", `$${pricePerNight.toFixed(2)}`)}
      ${row("Total", `<span style="color:#c9a84c;font-size:16px;">$${Number(totalPrice).toFixed(2)}</span>`)}
    </table>
  </div>`;
}

// ─── 1. New booking → hotel owner ─────────────────────────────────────────────

/**
 * Notify the hotel owner that a client has just placed a booking request.
 *
 * @param {{ owner, client, hotel, room, checkIn, checkOut, nights, totalPrice }} params
 */
exports.sendBookingRequestToOwner = async ({
  owner,
  client,
  hotel,
  room,
  checkIn,
  checkOut,
  nights,
  totalPrice,
}) => {
  const details = bookingCard({
    hotel,
    room,
    checkIn,
    checkOut,
    nights,
    totalPrice,
  });

  const body = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;color:#f8fafc;font-size:22px;">Hello, <span style="color:#c9a84c;">${owner.name}</span></h2>
      <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">
        <strong style="color:#f8fafc;">${client.name}</strong> (${client.email}) has requested to book
        a room at <strong style="color:#f8fafc;">${hotel.name}</strong>.
        Head to your owner dashboard to confirm or decline the reservation.
      </p>
    </div>

    ${details}

    <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #c9a84c;border-radius:12px;padding:24px;text-align:center;">
      <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">
        Please review and respond to this booking request from your dashboard.
      </p>
      <a href="http://localhost:4200/dashboard/owner"
         style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:bold;">
        Go to Owner Dashboard
      </a>
    </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: owner.email,
    subject: `New Booking Request — ${hotel.name}`,
    html: zenShell({
      badge: "ZenHOTEL Booking Request",
      title: "New Booking",
      titleAccent: "Request",
      subtitle: `${client.name} wants to book Room #${room.roomNumber} at ${hotel.name}.`,
      body,
      footerNote: "You received this because you own this hotel on ZenHOTEL.",
    }),
  });
};

// ─── 2. Booking confirmed → client ────────────────────────────────────────────

/**
 * Notify the client that the owner confirmed their booking.
 *
 * @param {{ booking: PopulatedBooking, nights: number }} params
 */
exports.sendBookingConfirmedToClient = async ({ booking, nights }) => {
  const { client, hotel, room, checkIn, checkOut, totalPrice } = booking;

  const details = bookingCard({
    hotel,
    room,
    checkIn,
    checkOut,
    nights,
    totalPrice,
  });

  const body = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;color:#f8fafc;font-size:22px;">Great news, <span style="color:#c9a84c;">${client.name}</span>!</h2>
      <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">
        Your booking at <strong style="color:#f8fafc;">${hotel.name}</strong> has been
        <strong style="color:#c9a84c;">confirmed</strong> by the owner.
        We look forward to welcoming you!
      </p>
    </div>

    ${details}

    <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #c9a84c;border-radius:12px;padding:24px;text-align:center;">
      <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">
        View your full booking history and details in your personal dashboard.
      </p>
      <a href="http://localhost:4200/dashboard/client"
         style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:bold;">
        View My Bookings
      </a>
    </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: client.email,
    subject: `Booking Confirmed — ${hotel.name}`,
    html: zenShell({
      badge: "ZenHOTEL Booking Confirmed",
      title: "Booking",
      titleAccent: "Confirmed!",
      subtitle: `Your stay at ${hotel.name} is all set. See you there!`,
      body,
      footerNote: null,
    }),
  });
};

// ─── 3. Booking cancelled → client ────────────────────────────────────────────

/**
 * Notify the client that an owner or admin cancelled their booking.
 *
 * @param {{ booking: PopulatedBooking, nights: number, cancelReason: string|null, cancelledBy: string }} params
 */
exports.sendBookingCancelledToClient = async ({
  booking,
  nights,
  cancelReason,
  cancelledBy,
}) => {
  const { client, hotel, room, checkIn, checkOut, totalPrice } = booking;

  const details = bookingCard({
    hotel,
    room,
    checkIn,
    checkOut,
    nights,
    totalPrice,
  });

  const cancelledByLabel =
    cancelledBy === "admin" ? "ZenHOTEL Administration" : "the hotel owner";
  const reasonBlock = cancelReason
    ? `<div style="background:#1e293b;border-left:3px solid #ef4444;padding:14px 18px;border-radius:0 8px 8px 0;margin-top:16px;">
         <p style="margin:0;color:#94a3b8;font-size:13px;">Reason provided:</p>
         <p style="margin:6px 0 0;color:#f8fafc;font-size:14px;">${cancelReason}</p>
       </div>`
    : "";

  const body = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;color:#f8fafc;font-size:22px;">Hello, <span style="color:#c9a84c;">${client.name}</span></h2>
      <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">
        We regret to inform you that your booking at
        <strong style="color:#f8fafc;">${hotel.name}</strong> has been
        <strong style="color:#ef4444;">cancelled</strong> by ${cancelledByLabel}.
      </p>
      ${reasonBlock}
    </div>

    ${details}

    <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #c9a84c;border-radius:12px;padding:24px;text-align:center;">
      <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">
        We apologise for any inconvenience. Browse our other available hotels and find your perfect stay.
      </p>
      <a href="http://localhost:4200/hotels"
         style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:bold;">
        Browse Hotels
      </a>
    </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: client.email,
    subject: `Booking Cancelled — ${hotel.name}`,
    html: zenShell({
      badge: "ZenHOTEL Booking Update",
      title: "Booking",
      titleAccent: "Cancelled",
      subtitle: `Your reservation at ${hotel.name} has been cancelled.`,
      body,
      footerNote: "If you believe this is an error, please contact us.",
    }),
  });
};
