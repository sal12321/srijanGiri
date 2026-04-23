/**
 * server.js — Express Backend for Srijan Giri Portfolio
 *
 * Routes:
 *   GET  /           → serves index.html
 *   GET  /tamer      → serves tamer.html
 *   POST /contact    → validates & sends contact form email
 *
 * ─── QUICK SETUP ──────────────────────────────────────────────────────────────
 *  1. npm install express nodemailer dotenv helmet cors express-rate-limit
 *  2. Create a .env file in the same folder (see .env.example below)
 *  3. node server.js
 *
 * ─── .env.example ─────────────────────────────────────────────────────────────
 *  PORT=3000
 *  SMTP_HOST=smtp.gmail.com
 *  SMTP_PORT=587
 *  SMTP_USER=your-gmail@gmail.com
 *  SMTP_PASS=xxxx xxxx xxxx xxxx      ← Gmail App Password (16 chars, spaces ok)
 *  RECIPIENT_EMAIL=your-gmail@gmail.com
 *  NODE_ENV=production
 *
 * ─── HOW TO GET A GMAIL APP PASSWORD ─────────────────────────────────────────
 *  1. Enable 2-Factor Auth on your Google account
 *  2. Go to: https://myaccount.google.com/apppasswords
 *  3. Select "Mail" + "Other (custom name)" → generate
 *  4. Paste the 16-character password into SMTP_PASS in .env
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Load .env FIRST before anything else ────────────────────────────────────
require('dotenv').config();

const express      = require('express');
const path         = require('path');
const nodemailer   = require('nodemailer');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Startup checks ────────────────────────────────────────────────────────────
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('\n  ⚠  WARNING: SMTP_USER or SMTP_PASS not set in .env');
  console.warn('     Contact form will not send emails until these are configured.\n');
}

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // set to true + configure if you want strict CSP
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));          // reject oversized payloads
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── Rate limiting — protect /contact from spam ────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // max 10 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages sent. Please wait 15 minutes and try again.' },
});

// ── Static files — serve everything in /public ───────────────────────────────
// Folder structure expected:
//   /public/index.html
//   /public/tamer.html
//   /public/styles.css
//   /public/tamer.css
//   /public/scripts.js
//   /public/images/
//   /public/videos/
//   /public/resume.pdf
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: IS_PROD ? '7d' : 0,   // cache static assets in production
  etag: true,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Server-side validation — mirrors the client validators in scripts.js */
function validateContact({ name, email, subject, message }) {
  const errors = {};
  if (!name    || name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.';
  if (!email   || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'Invalid email address.';
  if (!subject || subject.trim().length < 3)
    errors.subject = 'Subject must be at least 3 characters.';
  if (!message || message.trim().length < 15)
    errors.message = 'Message must be at least 15 characters.';
  return errors;
}

/** Escape HTML special chars for safe inclusion in email HTML body */
function sanitise(str) {
  return String(str).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── Nodemailer transporter ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true only for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Connection pool — reuse connection for multiple messages
  pool: true,
  maxConnections: 3,
});

// Verify SMTP connection on startup (non-blocking)
transporter.verify((err) => {
  if (err) {
    console.error('  ✗ SMTP connection failed:', err.message);
    console.error('    Check SMTP_USER / SMTP_PASS in your .env file\n');
  } else {
    console.log('  ✓ SMTP connection verified — email is ready\n');
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Home page — express.static already handles this, but explicit route as fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tamer project detail page — also handled by static, but explicit for clarity
app.get('/tamer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tamer.html'));
});

// ── POST /contact ─────────────────────────────────────────────────────────────
app.post('/contact', contactLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;

  // 1. Validate
  const errors = validateContact({ name, email, subject, message });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation failed.', errors });
  }

  // 2. Check SMTP credentials are configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Contact] SMTP not configured — cannot send email.');
    return res.status(503).json({
      message: 'Email service is not configured. Please contact me directly.',
    });
  }

  // 3. Build the email
  const recipientEmail = process.env.RECIPIENT_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from:    `"Portfolio Contact" <${process.env.SMTP_USER}>`,
    to:      recipientEmail,
    replyTo: email.trim(),
    subject: `[Portfolio] ${sanitise(subject)}`,
    // Plain-text fallback for email clients that don't render HTML
    text: [
      `New contact form submission from ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Subject: ${subject.trim()}`,
      '',
      message.trim(),
      '',
      '---',
      'Sent via srijan portfolio contact form.',
    ].join('\n'),
    // Rich HTML version
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#C80036,#FF4D6A);padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:1.4rem;letter-spacing:0.05em">
        New Portfolio Contact
      </h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem">
        Submitted via srijan.dev
      </p>
    </div>

    <!-- Fields -->
    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 0;width:90px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:1px solid #f0f0f0">Name</td>
          <td style="padding:10px 0;font-size:0.95rem;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${sanitise(name)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:1px solid #f0f0f0">Email</td>
          <td style="padding:10px 0;font-size:0.95rem;color:#1a1a1a;border-bottom:1px solid #f0f0f0">
            <a href="mailto:${sanitise(email)}" style="color:#C80036;text-decoration:none">${sanitise(email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888">Subject</td>
          <td style="padding:10px 0;font-size:0.95rem;color:#1a1a1a">${sanitise(subject)}</td>
        </tr>
      </table>

      <!-- Message -->
      <div style="margin-top:20px">
        <p style="margin:0 0 8px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888">Message</p>
        <div style="background:#f8f8f8;border-left:3px solid #C80036;border-radius:0 6px 6px 0;padding:16px 18px;font-size:0.95rem;color:#333;line-height:1.7;white-space:pre-wrap">${sanitise(message)}</div>
      </div>

      <!-- Reply CTA -->
      <div style="margin-top:28px;text-align:center">
        <a href="mailto:${sanitise(email)}?subject=Re: ${sanitise(subject)}"
          style="display:inline-block;background:linear-gradient(135deg,#C80036,#FF4D6A);color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:0.85rem;font-weight:700;letter-spacing:0.05em">
          Reply to ${sanitise(name)}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:14px 32px;text-align:center">
      <p style="margin:0;font-size:0.75rem;color:#aaa">
        Sent via Srijan Giri portfolio contact form &mdash; ${new Date().toUTCString()}
      </p>
    </div>

  </div>
</body>
</html>
    `,
  };

  // 4. Send
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Contact] Email sent to ${recipientEmail} — messageId: ${info.messageId}`);
    return res.status(200).json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('[Contact] Mail error:', err.message);
    return res.status(500).json({
      message: 'Failed to send email. Please try again or email me directly.',
    });
  }
});

// ── 404 — catch-all for unknown routes ───────────────────────────────────────
app.use((req, res) => {
  // If the request looks like a page navigation, send a helpful HTML 404
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  res.status(404).json({ message: 'Not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(500).json({ message: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log(`  ║  Portfolio running on port ${PORT}       ║`);
  console.log(`  ║  http://localhost:${PORT}               ║`);
  console.log('  ╚══════════════════════════════════════╝\n');
});

module.exports = app; // exported for testing
