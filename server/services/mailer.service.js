const nodemailer = require("nodemailer");

// One SMTP transport for every email the app sends (invoice approvals,
// master approvals, draft shares, account and password emails).
// Settings come from SMTP_* in server/.env. The older EMAIL_HOST /
// EMAIL_PORT / EMAIL_USER / EMAIL_PASS keys are still read when SMTP_*
// is blank, so an existing .env keeps working until it is updated.
//
// NOTE (Gmail): the password must be a 16-character Google App Password
// (Google Account -> Security -> 2-Step Verification -> App passwords),
// not the normal account password, or Gmail answers "535-5.7.8".
//
// MAIL_DEV_LOG=true prints every email to the server log instead of
// sending it (local testing only).

const DEFAULT_SMTP_PORT = 587;

// Account emails are sent while a database transaction is open, so a
// stuck SMTP server must fail quickly instead of holding it for minutes.
const SMTP_TIMEOUTS_MS = Object.freeze({ connection: 20000, greeting: 20000, socket: 30000 });

let cachedTransport = null;

const readSmtpSettings = () => {
  const env = process.env;
  const user = env.SMTP_USER || env.EMAIL_USER || "";
  const port = Number(env.SMTP_PORT || env.EMAIL_PORT || DEFAULT_SMTP_PORT);
  return {
    host: env.SMTP_HOST || env.EMAIL_HOST || "",
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
    user,
    pass: env.SMTP_PASS || env.EMAIL_PASS || "",
    from: env.SMTP_FROM || user,
  };
};

const isDevLogEnabled = () => process.env.MAIL_DEV_LOG === "true";

// Fail fast with a clear message instead of letting nodemailer attempt
// a connection with missing settings and return an opaque error.
const assertMailConfigured = (settings) => {
  if (!settings.host || !settings.user || !settings.pass) {
    throw new Error("Email is not configured on the server: set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env");
  }
};

const getTransport = (settings) => {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.pass },
      connectionTimeout: SMTP_TIMEOUTS_MS.connection,
      greetingTimeout: SMTP_TIMEOUTS_MS.greeting,
      socketTimeout: SMTP_TIMEOUTS_MS.socket,
    });
  }
  return cachedTransport;
};

const logEmail = ({ to, subject, html, text }) => {
  console.log("--- [mailer] MAIL_DEV_LOG=true, logging email instead of sending ---");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text || html);
  console.log("----------------------------------------------------------------------");
};

// Sends one email. Throws when it can't be sent (callers that must not
// fail on email catch it themselves).
const sendMail = async ({ to, subject, html, text, attachments = [] }) => {
  if (isDevLogEnabled()) {
    logEmail({ to, subject, html, text });
    return;
  }

  const settings = readSmtpSettings();
  assertMailConfigured(settings);
  await getTransport(settings).sendMail({ from: settings.from, to, subject, html, text, attachments });
};

module.exports = { sendMail };
