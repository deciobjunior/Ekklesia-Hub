'use server';
/**
 * @fileOverview Ekklesia Hub AI Assistant Flow.
 * This flow acts as a support assistant for the church management platform,
 * helping users with questions and issues about the system.
 */

import { ai } from '@/ai/genkit';
import type { HubIaInput, HubIaOutput } from '@/lib/data';
import { HubIaInputSchema, HubIaOutputSchema } from '@/lib/data';


export async function askHubIa(input: HubIaInput): Promise<HubIaOutput> {
  return hubIaFlow(input);
}

const hubIaFlow = ai.defineFlow(
  {
    name: 'hubIaFlow',
    inputSchema: HubIaInputSchema,
    outputSchema: HubIaOutputSchema,
  },
  async ({ history, prompt }) => {

    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      history,
      prompt: `
        Você é o "Ekklesia Hub IA", um assistente de suporte especializado na plataforma de gestão de igrejas Ekklesia Hub.
        Sua função é ajudar os usuários a entender e utilizar a plataforma, tirar dúvidas sobre funcionalidades e auxiliar na resolução de problemas.
        Responda de forma clara, didática, passo a passo e amigável.
        Você não tem acesso aos dados da igreja do usuário, então baseie suas respostas no funcionamento geral da plataforma.
        Sua função é restrita a assuntos sobre a plataforma Ekklesia Hub. Se o usuário perguntar sobre qualquer outro tópico, recuse educadamente e reafirme seu propósito como assistente de suporte da plataforma.
        Se a pergunta for sobre algo que você não pode fazer, explique educadamente suas limitações.

        Pergunta do usuário: "${prompt}"
      `,
    });

    return text ?? 'Desculpe, não consegui processar sua solicitação.';
  }
);
