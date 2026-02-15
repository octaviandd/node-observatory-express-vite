/** @format */
// LOGS
import "./patch-winston.js";
import "./patch-bunyan.js";
import "./patch-pino.js";
import "./patch-log4js.js";
import "./patch-loglevel.js";
// import "./patch-roarr.js";
import "./patch-signale.js";

// JOBS
import "./patch-bull.js";
import "./patch-agenda.js";

// SCHEDULE
import "./patch-node-cron.js";
import "./patch-node-schedule.js";
import "./patch-bree.js";

// MAIL
import "./patch-nodemailer.js";
import "./patch-sendgrid.js";
import "./patch-mailgun.js";
import "./patch-aws_ses.js";
// import "./patch-postmark.js";

// CACHE
import "./patch-node-cache.js";
import "./patch-redis.js";
import "./patch-ioredis.js";
// import "./patch-memjs.js";
import "./patch-lru-cache.js";
import "./patch-keyv.js";
import "./patch-level.js";

// QUERIES + MODELS
import "./patch-mongoose.js";
import "./patch-sequelize.js";
import "./patch-typeorm.js";
import "./patch-prisma.js";
import "./patch-mysql2.js";
import "./patch-pg.js";
import "./patch-knex.js";

// NOTIFICATIONS
import "./patch-pusher.js";
import "./patch-ably.js";

// EXCEPTIONS
import "./patch-exceptions.js";

// FRAMEWORKS
// import "./patch-koa.js";
// import "./patch-fastify.js";
// import "./patch-hapi.js";
// import "./patch-apollo.js";
import "./patch-express.js";

// OUTGOING REQUESTS
import "./patch-http.js";
import "./patch-undici.js";

// import "./patch-argparse.js";
// import "./patch-commander.js";
// import "./patch-firebase_admin.js";
// import "./patch-kafkajs.js";
// import "./patch-meow.js";
// import "./patch-minimist.js";
// import "./patch-oclif.js";
// import "./patch-yargs.js";