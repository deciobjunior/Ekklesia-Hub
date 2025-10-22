
'use server';
/**
 * @fileOverview Flow to generate a personalized appointment notification message.
 *
 * - generateScheduleNotification - A function that creates the notification message.
 */

import { ai } from '@/ai/genkit';
import { GenerateScheduleNotificationInput, GenerateScheduleNotificationInputSchema, GenerateScheduleNotificationOutput, GenerateScheduleNotificationOutputSchema } from '@/lib/data';

export async function generateScheduleNotification(input: GenerateScheduleNotificationInput): Promise<GenerateScheduleNotificationOutput> {
  return generateScheduleNotificationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScheduleNotificationPrompt',
  input: { schema: GenerateScheduleNotificationInputSchema },
  output: { schema: GenerateScheduleNotificationOutputSchema },
  prompt: `
      Você é um assistente de agendamento. Sua tarefa é criar uma mensagem curta e profissional para notificar um conselheiro sobre um novo atendimento confirmado.

      A mensagem deve:
      1.  Começar com uma saudação amigável para o conselheiro: "Olá, {{counselorName}}!"
      2.  Informar sobre o novo agendamento, mencionando o nome do aconselhado, a data e o horário.
      3.  Incluir um emoji de calendário (🗓️) ou relógio (⏰).
      4.  Ser formatada para WhatsApp, usando asteriscos para negrito. Por exemplo: *Novo agendamento confirmado*.
      5.  Manter um tom positivo e encorajador.
      
      Exemplo de resultado:
      "Olá, {{counselorName}}! 🗓️ Um novo atendimento foi confirmado em sua agenda.
      
      *Aconselhado(a):* {{memberName}}
      *Data:* {{appointmentDate}}
      *Horário:* {{appointmentTime}}
      
      Este compromisso já está visível em sua agenda no Ekklesia Hub. Que seja um tempo abençoador!"
  `,
});

const generateScheduleNotificationFlow = ai.defineFlow(
  {
    name: 'generateScheduleNotificationFlow',
    inputSchema: GenerateScheduleNotificationInputSchema,
    outputSchema: GenerateScheduleNotificationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output ?? { message: `Novo agendamento para ${input.memberName} em ${input.appointmentDate} às ${input.appointmentTime}.` };
  }
);
