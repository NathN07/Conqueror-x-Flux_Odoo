import nodemailer from "nodemailer";

interface SendPasswordResetEmailParams {
  toEmail: string;
  userName: string;
  resetUrl: string;
}

interface SendInvoiceEmailParams {
  toEmail: string;
  customerName: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDateFormatted: string;
  invoiceUrl: string;
}

export async function sendPasswordResetEmail({
  toEmail,
  userName,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Brightloop Support" <no-reply@brightloop.com>';

  // If SMTP is not configured, print to terminal for easy demo/development
  if (!host || !user || !pass) {
    console.log("\n=======================================================");
    console.log("🔑 PASSWORD RESET LINK (DEMO MODE - SMTP NOT CONFIGURED)");
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("This link expires in 1 hour and can only be used once.");
    console.log("=======================================================\n");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: "Reset your Brightloop password",
      text: `Hello ${userName},\n\nYou requested a password reset for your Brightloop account.\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not make this request, you can safely ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Brightloop Password Reset</h2>
          <p>Hello ${userName},</p>
          <p>You requested a password reset for your Brightloop account. Click the button below to choose a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #64748b; font-size: 13px; margin-top: 30px;">This link will expire in 1 hour and works only once. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send email via SMTP, falling back to terminal log:", error);
    console.log(`Fallback Password Reset Link for ${toEmail}: ${resetUrl}`);
  }
}

export async function sendInvoiceEmail({
  toEmail,
  customerName,
  invoiceNumber,
  totalFormatted,
  dueDateFormatted,
  invoiceUrl,
}: SendInvoiceEmailParams): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Brightloop Billing" <billing@brightloop.com>';

  // If SMTP is not configured, print to terminal for easy demo/development
  if (!host || !user || !pass) {
    console.log("\n=======================================================");
    console.log("📄 INVOICE SENT (DEMO MODE - SMTP NOT CONFIGURED)");
    console.log(`To: ${toEmail} (${customerName})`);
    console.log(`Invoice Number: ${invoiceNumber}`);
    console.log(`Amount Due: ${totalFormatted}`);
    console.log(`Due Date: ${dueDateFormatted}`);
    console.log(`Online Statement URL: ${invoiceUrl}`);
    console.log("=======================================================\n");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: `Invoice ${invoiceNumber} from Brightloop (${totalFormatted})`,
      text: `Hello ${customerName},\n\nYour new invoice ${invoiceNumber} for ${totalFormatted} is ready. It is due on ${dueDateFormatted}.\n\nView and download your invoice at:\n${invoiceUrl}\n\nThank you for choosing Brightloop!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Brightloop Invoice ${invoiceNumber}</h2>
          <p>Hello ${customerName},</p>
          <p>Your invoice <strong>${invoiceNumber}</strong> is ready for review.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Amount Due:</strong> <span style="font-size: 18px; color: #0f172a; font-weight: bold;">${totalFormatted}</span></p>
            <p style="margin: 0;"><strong>Due Date:</strong> ${dueDateFormatted}</p>
          </div>
          <p style="margin: 30px 0;">
            <a href="${invoiceUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View & Download Invoice
            </a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send invoice via SMTP, falling back to terminal log:", error);
    console.log(`Fallback Invoice Notification for ${toEmail}: ${invoiceUrl}`);
  }
}
