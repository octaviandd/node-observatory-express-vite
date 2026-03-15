/** @format */
import { createObserver } from "@node-observatory/api"
import { ExpressAdapter } from "@node-observatory/express";
import express from "express";
import cors from "cors";
import mysql2 from "mysql2/promise";
import { createClient, RedisClientType } from "redis";
import axios from "axios";
import pino from "pino";
import NodeCache from "node-cache";
import { createStressRoutes } from "./routes/stress";
import Bull from "bull";
import Pusher from "pusher";
import nodemailer from "nodemailer";

const myCache = new NodeCache();

// Create a Bull queue
const emailQueue = new Bull('email-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});

// Create Pusher instance
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "test-app-id",
  key: process.env.PUSHER_KEY || "test-key",
  secret: process.env.PUSHER_SECRET || "test-secret",
  cluster: process.env.PUSHER_CLUSTER || "mt1",
  useTLS: true,
});

// Create Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Create nodemailer transporter (ethereal test account)
let mailTransporter: nodemailer.Transporter;

async function createMailTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  
  mailTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  console.log(`  Mail:       Test account created - ${testAccount.user}`);
}

// Process jobs from the queue
emailQueue.process(async (job) => {
  logger.info({ jobId: job.id, email: job.data.email }, 'Processing job');
  
  // Actually send the email via nodemailer
  const info = await mailTransporter.sendMail({
    from: '"Observatory System" <system@observatory.dev>',
    to: job.data.email,
    subject: job.data.subject,
    text: job.data.body,
    html: `<b>${job.data.body}</b>`,
  });
  
  logger.info({ messageId: info.messageId }, 'Email sent');
  logger.info({ previewUrl: nodemailer.getTestMessageUrl(info) }, 'Preview URL');
  
  // Send Pusher notification when job completes
  await pusher.trigger('jobs-channel', 'job-completed', {
    jobId: job.id,
    email: job.data.email,
    messageId: info.messageId,
    timestamp: new Date().toISOString(),
  });
  
  return { 
    status: 'sent', 
    email: job.data.email,
    subject: job.data.subject,
    messageId: info.messageId,
  };
});

// Handle job completion
emailQueue.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Job completed');
});

// Handle job failure
emailQueue.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
  
  // Send Pusher notification for failed job
  if (job) {
    await pusher.trigger('jobs-channel', 'job-failed', {
      jobId: job.id,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.path.startsWith('/ui')) {
    return express.json()(req, res, next);
  }
  next();
});

const expressAdapter = new ExpressAdapter();
expressAdapter.setBasePath('/ui');
app.use('/ui', expressAdapter.getRouter());

// ---------------------------------------------------------------------------
// Demo route with Bull jobs, Pusher notifications, and direct emails
// ---------------------------------------------------------------------------
app.get('/home', async (req, res) => {
  try {
    // HTTP request
    const response = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
    
    // Cache operations
    myCache.set('index', 'test');
    myCache.get('index');
    console.log(myCache.get('index'));
    
    // Logging - Pino style
    logger.info('This is an info log message from Pino in user app');
    logger.debug({ context: 'home-route', user: 'test' }, 'Debug message with context');
    logger.warn({ warning: 'test-warning' }, 'This is a warning');
    logger.error({ error: 'test-error' }, 'This is an error log');
    
    // Send a direct email (not through Bull queue)
    const directEmail = await mailTransporter.sendMail({
      from: '"Direct Sender" <direct@observatory.dev>',
      to: 'user@example.com',
      subject: 'Direct Email - Not Queued',
      text: 'This email was sent directly, not through the job queue',
      html: '<b>This email was sent directly, not through the job queue</b>',
    });
    
    logger.info({ messageId: directEmail.messageId }, 'Direct email sent');
    
    // Send Pusher notification for page visit
    await pusher.trigger('activity-channel', 'page-visit', {
      path: '/home',
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
    });
    
    // Add jobs to Bull queue (these will send emails when processed)
    const job1 = await emailQueue.add({
      email: 'user1@example.com',
      subject: 'Welcome Email',
      body: 'Welcome to our service!',
    });
    
    const job2 = await emailQueue.add({
      email: 'user2@example.com',
      subject: 'Newsletter',
      body: 'Check out our latest updates!',
    }, {
      delay: 2000, // Delay by 2 seconds
    });
    
    const job3 = await emailQueue.add({
      email: 'user3@example.com',
      subject: 'Reminder',
      body: 'Don\'t forget your appointment!',
    }, {
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    
    // Send Pusher notification for jobs created
    await pusher.trigger('jobs-channel', 'jobs-created', {
      count: 3,
      jobs: [
        { id: job1.id, email: job1.data.email },
        { id: job2.id, email: job2.data.email },
        { id: job3.id, email: job3.data.email },
      ],
      timestamp: new Date().toISOString(),
    });
    
    res.json({
      todo: response.data,
      directEmail: {
        messageId: directEmail.messageId,
        previewUrl: nodemailer.getTestMessageUrl(directEmail),
      },
      jobs: [
        { id: job1.id, email: job1.data.email },
        { id: job2.id, email: job2.data.email, delayed: true },
        { id: job3.id, email: job3.data.email, retryable: true },
      ],
    });
  } catch (error) {
    logger.error({ error }, 'Error in /home route');
    res.status(500).json({ error: String(error) });
  }
});

// ---------------------------------------------------------------------------
// Route to send a test email directly
// ---------------------------------------------------------------------------
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    const info = await mailTransporter.sendMail({
      from: '"Observatory Test" <test@observatory.dev>',
      to: to || 'test@example.com',
      subject: subject || 'Test Email',
      text: body || 'This is a test email',
      html: `<b>${body || 'This is a test email'}</b>`,
    });
    
    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    });
  } catch (error) {
    logger.error({ error }, 'Error sending email');
    res.status(500).json({ error: String(error) });
  }
});

// ---------------------------------------------------------------------------
// Route to check job status
// ---------------------------------------------------------------------------
app.get('/job/:id', async (req, res) => {
  try {
    const job = await emailQueue.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const state = await job.getState();
    
    res.json({
      id: job.id,
      state,
      data: job.data,
      progress: job.progress(),
      attempts: job.attemptsMade,
      returnvalue: job.returnvalue,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting job status');
    res.status(500).json({ error: String(error) });
  }
});

// ---------------------------------------------------------------------------
// Route to send custom Pusher notification
// ---------------------------------------------------------------------------
app.post('/notify', async (req, res) => {
  try {
    const { channel, event, message } = req.body;
    
    await pusher.trigger(channel || 'test-channel', event || 'test-event', {
      message: message || 'Test notification',
      timestamp: new Date().toISOString(),
    });
    
    // Send multiple notifications to different channels
    await pusher.triggerBatch([
      {
        channel: 'alerts-channel',
        name: 'new-alert',
        data: { severity: 'info', message: 'System notification' },
      },
      {
        channel: 'updates-channel',
        name: 'new-update',
        data: { type: 'feature', message: 'New feature available' },
      },
    ]);
    
    res.json({ 
      success: true, 
      message: 'Notifications sent',
      channels: [channel || 'test-channel', 'alerts-channel', 'updates-channel'],
    });
  } catch (error) {
    logger.error({ error }, 'Error sending notification');
    res.status(500).json({ error: String(error) });
  }
});

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------
async function startServer() {
  const mysql2Connection = await mysql2.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "observatory",
  });

  const redisConnection = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  await redisConnection.connect();

  // Create mail transporter
  await createMailTransporter();

  // Mount stress/sample-data routes (exercises all patcher categories)
  app.use('/stress', createStressRoutes({
    mysql2Connection,
    redisConnection: redisConnection as RedisClientType,
    logger,
    cache: myCache,
  }));

  await createObserver(expressAdapter, {}, "mysql2", mysql2Connection, redisConnection as RedisClientType);

  logger.info('Server started');

  const PORT = 9999;
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server is running');
    console.log(`  Home:       http://localhost:${PORT}/home`);
    console.log(`  UI:         http://localhost:${PORT}/ui`);
    console.log(`  Stress:     http://localhost:${PORT}/stress/all`);
    console.log(`  Flood:      http://localhost:${PORT}/stress/flood?count=50&parallel=5`);
    console.log(`  Job Status: http://localhost:${PORT}/job/:id`);
    console.log(`  Notify:     POST http://localhost:${PORT}/notify`);
    console.log(`  Send Email: POST http://localhost:${PORT}/send-email`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing queue...');
  await emailQueue.close();
  process.exit(0);
});

startServer().catch((error) => {
  logger.fatal({ error }, 'Error starting the server');
  process.exit(1);
});