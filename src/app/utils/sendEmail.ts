import httpStatus from "http-status";
import nodemailer, { Transporter } from "nodemailer";
import config from "../config";
import AppError from "../errors/AppError";

export type TEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type TEmailSendResult = {
  id: string | null;
  skipped: boolean;
};

let transporter: Transporter | null = null;

const mailer = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email_host,
      port: config.email_port,
      secure: config.email_secure,
      auth: {
        user: config.email_user,
        pass: config.email_password,
      },
      tls: {
        rejectUnauthorized: config.email_tls_reject_unauthorized,
      },
      ...(config.email_service ? { service: config.email_service } : {}),
    });
  }
  return transporter;
};

/**
 * Exported so a queued caller can reject a bad address while it still has a request
 * to fail — a malformed address discovered inside a worker is only a log line.
 */
export const requireEmailRecipient = (raw: string): string => {
  const to = raw.trim();
  if (!to.includes("@")) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `"${raw}" is not a valid email address`,
    );
  }
  return to;
};

export const sendEmail = async (
  payload: TEmailPayload,
): Promise<TEmailSendResult> => {
  const to = requireEmailRecipient(payload.to);
  const subject = payload.subject.trim();
  if (!subject || !payload.html.trim()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The email needs both a subject and a body",
    );
  }

  // Logged rather than refused, so signing up works on a machine with no SMTP
  // credentials — the same trade sendSms makes.
  if (!config.email_from || !config.email_user) {
    console.log(`Sending email to ${to}: ${subject}`);
    return { id: null, skipped: true };
  }

  try {
    const info = await mailer().sendMail({
      from: config.email_from,
      to,
      subject,
      html: payload.html,
      ...(payload.text ? { text: payload.text } : {}),
    });
    return { id: info.messageId ?? null, skipped: false };
  } catch (error) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `The mail server rejected the message: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
};
