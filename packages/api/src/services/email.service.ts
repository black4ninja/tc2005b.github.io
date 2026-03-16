import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { config } from '../config/index.js';
import { render, getCommonVariables } from './template.service.js';

interface SendEmailData {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string | null;
  error?: string;
}

class EmailService {
  private mailerSend: MailerSend | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      const apiKey = config.email.apiKey;

      if (!apiKey) {
        console.warn('[EmailService] MAILERSEND_API_KEY not configured. Email service disabled.');
        return;
      }

      this.mailerSend = new MailerSend({ apiKey });
      this.initialized = true;
      console.log('[EmailService] MailerSend initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize:', error);
      this.initialized = false;
    }
  }

  isAvailable(): boolean {
    return this.initialized && this.mailerSend !== null;
  }

  async sendEmail(emailData: SendEmailData): Promise<SendResult> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Email service is not available. Check MAILERSEND_API_KEY configuration.');
      }

      const { to, toName, subject, html, text } = emailData;

      if (!to || !subject || !html) {
        throw new Error('Missing required email fields: to, subject, html');
      }

      const emailParams = new EmailParams()
        .setFrom(new Sender(config.email.from, config.email.fromName))
        .setTo([new Recipient(to, toName || '')])
        .setSubject(subject)
        .setHtml(html);

      if (text) {
        emailParams.setText(text);
      }

      const result = await this.mailerSend!.email.send(emailParams);
      const messageId = (result as any).body?.message_id || null;

      console.log('[EmailService] Email sent successfully', {
        messageId,
        to,
        subject,
      });

      return { success: true, messageId };
    } catch (error: any) {
      console.error('[EmailService] Failed to send email', {
        error: error.message,
        to: emailData.to,
        subject: emailData.subject,
      });

      let errorMessage = error.message || 'Unknown error';
      if (error.body?.errors) {
        errorMessage = JSON.stringify(error.body.errors);
      } else if (error.body?.message) {
        errorMessage = error.body.message;
      }

      return { success: false, error: errorMessage };
    }
  }

  async sendMagicLinkEmail(data: {
    email: string;
    name: string;
    magicLinkUrl: string;
    expirationTime?: string;
  }): Promise<SendResult> {
    const { email, name, magicLinkUrl, expirationTime } = data;

    const variables = {
      ...getCommonVariables(),
      NOMBRE_USUARIO: name,
      URL_MAGIC_LINK: magicLinkUrl,
      TIEMPO_EXPIRACION: expirationTime || '15 minutos',
    };

    const html = render('magic_link', variables);

    return this.sendEmail({
      to: email,
      toName: name,
      subject: 'Iniciar Sesión - TC2005B',
      html,
    });
  }

  async sendTestEmail(email: string): Promise<SendResult> {
    const variables = {
      ...getCommonVariables(),
      TIMESTAMP: new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'full',
        timeStyle: 'long',
      }),
    };

    const html = render('test', variables);

    return this.sendEmail({
      to: email,
      subject: 'Correo de Prueba - TC2005B',
      html,
    });
  }
}

export const emailService = new EmailService();
