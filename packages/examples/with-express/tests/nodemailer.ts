/** @format
 * Test: nodemailer patcher
 * Run: node -r ts-node/register tests/nodemailer.ts
 * Hit: GET http://localhost:3001/test
 *
 * Uses an Ethereal test account — no real SMTP credentials needed.
 */
import { createTestApp } from "./bootstrap";
import nodemailer from "nodemailer";

async function main() {
  const { app, start } = await createTestApp();

  // Create a one-time Ethereal test account (always works without credentials)
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  /**
   * GET /test
   * Exercises: sendMail (plain text + HTML)
   */
  app.get("/test", async (_req, res) => {
    const info = await transporter.sendMail({
      from: '"Observatory Test" <test@observatory.dev>',
      to: "recipient@example.com",
      subject: "nodemailer patcher test",
      text: "Plain-text body",
      html: "<b>HTML body</b>",
    });

    const preview = nodemailer.getTestMessageUrl(info);

    res.json({
      ok: true,
      messageId: info.messageId,
      preview,
      message: "Mail sent — check Observatory → Mail",
    });
  });

  /**
   * POST /test
   * Body: { to, subject, text }
   * Exercises: sendMail with custom recipients
   */
  app.post("/test", async (req, res) => {
    const { to = "user@example.com", subject = "Custom subject", text = "Custom body" } = req.body;

    const info = await transporter.sendMail({
      from: '"Observatory Test" <test@observatory.dev>',
      to,
      subject,
      text,
    });

    res.json({ ok: true, messageId: info.messageId, preview: nodemailer.getTestMessageUrl(info) });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
