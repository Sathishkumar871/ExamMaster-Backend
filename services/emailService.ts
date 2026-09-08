
import nodemailer from "nodemailer";

// ============================================================
// GMAIL CONFIGURATION
// ============================================================

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword =
  process.env.GMAIL_APP_PASSWORD;

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

if (!gmailUser) {
  console.error(
    "❌ GMAIL_USER is not configured."
  );
}

if (!gmailAppPassword) {
  console.error(
    "❌ GMAIL_APP_PASSWORD is not configured."
  );
}

// ============================================================
// GMAIL TRANSPORTER
// ============================================================
// One transporter is created when the backend starts.
// The same SMTP connection pool can be reused for
// multiple OTP emails.
// ============================================================

const transporter =
  nodemailer.createTransport({
    host: "smtp.gmail.com",

    port: 465,

    secure: true,

    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },

    pool: true,

    maxConnections: 3,

    maxMessages: 100,

    connectionTimeout: 15000,

    greetingTimeout: 10000,

    socketTimeout: 30000,
  });

// ============================================================
// CHECK GMAIL SMTP CONNECTION
// ============================================================

transporter
  .verify()
  .then(() => {
    console.log(
      "✅ Gmail SMTP connection ready"
    );
  })
  .catch((error: any) => {
    console.error(
      "❌ Gmail SMTP connection failed:"
    );

    console.error(
      error?.message || error
    );

    console.error(
      "SMTP CODE:",
      error?.code || "UNKNOWN"
    );

    console.error(
      "SMTP RESPONSE:",
      error?.response || "NO RESPONSE"
    );
  });

// ============================================================
// SEND OTP EMAIL
// ============================================================

export const sendOtpEmail = async (
  to: string,
  otp: string
) => {
  // ==========================================================
  // BASIC VALIDATION
  // ==========================================================

  if (!gmailUser) {
    throw new Error(
      "GMAIL_USER is missing on the server."
    );
  }

  if (!gmailAppPassword) {
    throw new Error(
      "GMAIL_APP_PASSWORD is missing on the server."
    );
  }

  if (!to) {
    throw new Error(
      "Recipient email is required."
    );
  }

  if (!otp) {
    throw new Error(
      "OTP is required."
    );
  }

  // ==========================================================
  // START TIMER
  // ==========================================================

  const startTime = Date.now();

  console.log(
    `📧 Sending OTP to ${to}...`
  );

  try {
    // ========================================================
    // SEND MAIL
    // ========================================================

    const info =
      await transporter.sendMail({
        from:
          `"STG College" <${gmailUser}>`,

        to,

        subject:
          "STG College | Email Verification OTP",

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>STG College OTP</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f6f8;
    font-family:Arial, Helvetica, sans-serif;
  "
>

  <!-- OUTER -->
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background:#f4f6f8;
      padding:40px 15px;
    "
  >

    <tr>
      <td align="center">

        <!-- MAIN CARD -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:22px;
            overflow:hidden;
            box-shadow:0 10px 35px rgba(0,0,0,0.08);
          "
        >

          <!-- TOP BRAND -->
          <tr>
            <td
              align="center"
              style="
                padding:34px 25px 25px;
                background:#111827;
              "
            >

              <div
                style="
                  font-size:34px;
                  font-weight:900;
                  letter-spacing:4px;
                  color:#f59e0b;
                  line-height:1;
                "
              >
                STG
              </div>

              <div
                style="
                  margin-top:8px;
                  font-size:13px;
                  font-weight:700;
                  letter-spacing:3px;
                  color:#e5e7eb;
                  text-transform:uppercase;
                "
              >
                College
              </div>

              <div
                style="
                  margin-top:18px;
                  font-size:12px;
                  color:#9ca3af;
                  letter-spacing:1px;
                "
              >
                STG EXAM MASTER
              </div>

            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td
              style="
                padding:40px 35px 35px;
              "
            >

              <div
                style="
                  text-align:center;
                "
              >

                <!-- ICON -->
                <div
                  style="
                    width:64px;
                    height:64px;
                    margin:0 auto 20px;
                    border-radius:50%;
                    background:#fff7ed;
                    border:1px solid #fed7aa;
                    line-height:64px;
                    font-size:28px;
                  "
                >
                  🔐
                </div>

                <!-- TITLE -->
                <h1
                  style="
                    margin:0;
                    color:#111827;
                    font-size:26px;
                    font-weight:800;
                  "
                >
                  Verify Your Email
                </h1>

                <!-- DESCRIPTION -->
                <p
                  style="
                    margin:12px 0 0;
                    color:#6b7280;
                    font-size:15px;
                    line-height:1.7;
                  "
                >
                  Welcome to
                  <strong style="color:#111827;">
                    STG Exam Master
                  </strong>.
                  Use the verification code below
                  to verify your email address.
                </p>

              </div>

              <!-- OTP BOX -->
              <div
                style="
                  margin:32px 0;
                  padding:25px 20px;
                  text-align:center;
                  border-radius:18px;
                  background:#fffbeb;
                  border:2px dashed #f59e0b;
                "
              >

                <div
                  style="
                    font-size:12px;
                    font-weight:700;
                    color:#92400e;
                    letter-spacing:2px;
                    text-transform:uppercase;
                  "
                >
                  Verification Code
                </div>

                <div
                  style="
                    margin-top:14px;
                    font-size:42px;
                    font-weight:900;
                    letter-spacing:12px;
                    color:#111827;
                    line-height:1.2;
                  "
                >
                  ${otp}
                </div>

                <div
                  style="
                    margin-top:14px;
                    font-size:13px;
                    color:#92400e;
                  "
                >
                  Valid for
                  <strong>
                    5 minutes
                  </strong>
                </div>

              </div>

              <!-- SECURITY NOTE -->
              <div
                style="
                  padding:18px;
                  border-radius:14px;
                  background:#f9fafb;
                  border:1px solid #e5e7eb;
                "
              >

                <div
                  style="
                    font-size:14px;
                    font-weight:700;
                    color:#111827;
                    margin-bottom:7px;
                  "
                >
                  🛡️ Security Notice
                </div>

                <div
                  style="
                    font-size:13px;
                    color:#6b7280;
                    line-height:1.7;
                  "
                >
                  Never share this OTP with anyone.
                  STG College will never ask you to
                  share your verification code.
                </div>

              </div>

              <!-- FOOTER MESSAGE -->
              <div
                style="
                  margin-top:28px;
                  text-align:center;
                "
              >

                <p
                  style="
                    margin:0;
                    font-size:13px;
                    color:#9ca3af;
                    line-height:1.7;
                  "
                >
                  If you did not request this verification,
                  you can safely ignore this email.
                </p>

              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              align="center"
              style="
                padding:24px 25px;
                background:#111827;
              "
            >

              <div
                style="
                  font-size:13px;
                  font-weight:700;
                  color:#f9fafb;
                "
              >
                STG College
              </div>

              <div
                style="
                  margin-top:6px;
                  font-size:11px;
                  color:#9ca3af;
                  letter-spacing:1px;
                "
              >
                EDUCATION • EXAM • EXCELLENCE
              </div>

              <div
                style="
                  margin-top:14px;
                  font-size:11px;
                  color:#6b7280;
                "
              >
                © ${new Date().getFullYear()}
                STG College. All rights reserved.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
        `,
      });

    // ========================================================
    // END TIMER
    // ========================================================

    const elapsed =
      Date.now() - startTime;

    console.log(
      `✅ OTP email sent successfully in ${elapsed} ms`
    );

    console.log(
      "📨 Message ID:",
      info.messageId
    );

    return info;

  } catch (error: any) {

    // ========================================================
    // ERROR LOG
    // ========================================================

    const elapsed =
      Date.now() - startTime;

    console.error(
      `❌ OTP email failed after ${elapsed} ms`
    );

    console.error(
      "ERROR MESSAGE:",
      error?.message || error
    );

    console.error(
      "ERROR CODE:",
      error?.code || "UNKNOWN"
    );

    console.error(
      "SMTP RESPONSE:",
      error?.response || "NO RESPONSE"
    );

    console.error(
      "COMMAND:",
      error?.command || "NO COMMAND"
    );

    throw error;
  }
};

