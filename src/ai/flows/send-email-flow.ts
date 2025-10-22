
'use server';
/**
 * @fileOverview Flow to send an email using Resend.
 *
 * - sendEmail - A function that sends an email to a recipient.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Resend } from 'resend';
import { SendEmailInputSchema, type SendEmailInput } from '@/lib/data';

export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; message: string }> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
    }),
  },
  async (input) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set. Cannot send email.");
      throw new Error("A configuração de envio de e-mails (RESEND_API_KEY) não foi definida no servidor.");
    }
    
    try {
      const resend = new Resend(resendApiKey);

      await resend.emails.send({
        from: 'Ekklesia Hub <nao-responda@ekklesiahub.com.br>',
        to: input.to,
        subject: input.subject,
        html: input.body,
      });

      return {
        success: true,
        message: `Email successfully sent to ${input.to}.`,
      };
    } catch (error: any) {
      console.error("Error sending email with Resend:", error);
      // Lançar o erro para que o chamador possa tratá-lo
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
);
