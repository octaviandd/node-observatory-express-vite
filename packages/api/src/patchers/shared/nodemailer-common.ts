/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type NodemailerMetadata = { package: "nodemailer"; command: "SendMail" };
type NodemailerData = { 
  to: string[]; 
  cc: string[]; 
  bcc: string[]; 
  from: string; 
  subject: string; 
  body: string; 
  messageId?: string;
};

export type NodemailerLogEntry = BaseLogEntry<NodemailerMetadata, NodemailerData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: NodemailerLogEntry) { 
  console.log('Nodemailer Log Entry:', entry);
  watchers.mailer.insertRedisStream({ ...entry, created_at: timestamp() });
}

const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

export function patchNodemailerExports(exports: any, filename: string): any {
  if (typeof exports?.createTransport !== "function") return exports;

  shimmer.wrap(exports, "createTransport", (originalFn) =>
    function patchedCreateTransport(this: any, ...args: any[]) {
      const transporter = originalFn.apply(this, args);

      // Patch the sendMail method on the returned transporter
      if (transporter && typeof transporter.sendMail === "function") {
        const originalSendMail = transporter.sendMail;
        
        transporter.sendMail = function patchedSendMail(this: any, mailOptions: any, callback?: Function) {
          const startTime = performance.now();
          const callerInfo = getCallerInfo(filename);

          const base = {
            metadata: { package: "nodemailer" as const, command: "SendMail" as const },
            location: { file: callerInfo.file, line: callerInfo.line },
            data: {
              to: toArray(mailOptions.to),
              cc: toArray(mailOptions.cc),
              bcc: toArray(mailOptions.bcc),
              from: mailOptions.from || '',
              subject: mailOptions.subject || '',
              body: mailOptions.html || mailOptions.text || '',
            },
          };

          const handleResult = (err: Error | null, info?: any) => {
            const duration = parseFloat((performance.now() - startTime).toFixed(2));
            
            const logData = {
              ...base,
              duration,
              status: err ? "failed" as const : "completed" as const,
            };

            if (err) {
              log({ 
                ...logData, 
                error: { 
                  name: err.name, 
                  message: err.message, 
                  stack: err.stack 
                } 
              });
            } else {
              log({ 
                ...logData,
                data: {
                  ...base.data,
                  messageId: info?.messageId,
                }
              });
            }
          };

          // Handle callback-style
          if (typeof callback === "function") {
            return originalSendMail.call(this, mailOptions, (err: Error | null, info?: any) => {
              handleResult(err, info);
              callback(err, info);
            });
          }

          // Handle promise-style
          const result = originalSendMail.call(this, mailOptions);
          
          if (result && typeof result.then === "function") {
            return result
              .then((info: any) => { 
                handleResult(null, info); 
                return info; 
              })
              .catch((err: Error) => { 
                handleResult(err); 
                throw err; 
              });
          }

          return result;
        };
      }

      return transporter;
    }
  );

  return exports;
}