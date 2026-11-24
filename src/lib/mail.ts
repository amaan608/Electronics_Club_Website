import "server-only";
import nodemailer from "nodemailer";
import { setting } from "./config";

export type Purpose = "register" | "recover";
export async function deliverCode(
  email: string,
  purpose: Purpose,
  code: string,
) {
  const port = Number(setting("SMTP_PORT"));
  const transport = nodemailer.createTransport({
    host: setting("SMTP_HOST"),
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: setting("SMTP_USER"), pass: setting("SMTP_PASSWORD") },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const action =
    purpose === "register" ? "verify your email" : "reset your password";
  const instructions =
    "This code expires in five minutes. Keep it private. If you did not request it, you can ignore this email.";
  await transport.sendMail({
    from: setting("SMTP_FROM"),
    to: { name: "", address: email },
    subject: `Electronics Club · Code to ${action}`,
    text: `Electronics Club · IIT Guwahati\n\nUse this code to ${action}: ${code}\n\n${instructions}`,
    html: `<div style="background:#111;color:#eee;padding:30px;font:16px/1.6 monospace;max-width:520px"><strong>ELECTRONICS CLUB · IIT GUWAHATI</strong><hr><p>Use this code to ${action}.</p><p style="font-size:36px;letter-spacing:7px">${code}</p><p>${instructions}</p></div>`,
  });
}
