/**
 * Smoke test: Mail patchers
 *
 * Exercises whichever mail package is installed (nodemailer, @aws-sdk/client-ses,
 * mailgun.js, postmark) and verifies an observatory entry reaches the Redis stream.
 *
 * Most mail packages cannot actually send email in a test container, so we
 * verify import + basic instantiation. For nodemailer we use a test account.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "nodemailer";
const STREAM_KEY = "observatory:stream:mail";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-mail] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "nodemailer": {
      const nodemailer = await import("nodemailer");
      // Create an ethereal test account for sending
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      await transporter.sendMail({
        from: "smoke@test.com",
        to: "recipient@test.com",
        subject: "Smoke test",
        text: "This is a smoke test email",
      });
      console.log("[smoke-mail] nodemailer: email sent via ethereal");
      break;
    }
    case "@aws-sdk/client-ses": {
      console.log("[smoke-mail] @aws-sdk/client-ses — verifying import only");
      await import("@aws-sdk/client-ses");
      console.log("[smoke-mail] @aws-sdk/client-ses imported successfully");
      break;
    }
    case "mailgun.js": {
      console.log("[smoke-mail] mailgun.js — verifying import only");
      await import("mailgun.js");
      console.log("[smoke-mail] mailgun.js imported successfully");
      break;
    }
    case "postmark": {
      console.log("[smoke-mail] postmark — verifying import only");
      await import("postmark");
      console.log("[smoke-mail] postmark imported successfully");
      break;
    }
    default:
      throw new Error(`Unknown mail package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-mail] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  // Only nodemailer can produce stream entries in this setup
  const importOnly = ["@aws-sdk/client-ses", "mailgun.js", "postmark"];
  if (!importOnly.includes(PACKAGE) && streamLen === 0) {
    console.error("[smoke-mail] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-mail] PASS");
}

main().catch((err) => {
  console.error("[smoke-mail] FAIL:", err);
  process.exit(1);
});
