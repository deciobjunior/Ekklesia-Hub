
'use server';
/**
 * @fileOverview Flow to generate a counseling briefing using AI.
 *
 * - generateBriefing - A function that creates a summary of counseling meetings.
 * - GenerateBriefingInput - The input type for the generateBriefing function.
 * - GenerateBriefingOutput - The return type for the generateBriefing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MeetingSchema = z.object({
  date: z.string().describe('The date of the meeting.'),
  topic: z.string().describe('The main topic of the meeting.'),
  notes: z.string().describe('The notes recorded during the meeting.'),
  isConfidential: z.boolean().optional().describe('Whether the notes for this meeting are confidential.'),
});

const GenerateBriefingInputSchema = z.object({
  memberName: z.string().describe("The name of the person being counseled."),
  memberAge: z.string().optional().describe("The age of the person being counseled."),
  memberGender: z.string().optional().describe("The gender of the person being counseled."),
  memberMaritalStatus: z.string().optional().describe("The marital status of the person being counseled."),
  requestDetails: z.string().optional().describe("The initial details provided by the member when requesting counseling."),
  meetings: z.array(MeetingSchema).describe("The list of past counseling meetings."),
});
export type GenerateBriefingInput = z.infer<typeof GenerateBriefingInputSchema>;

const GenerateBriefingOutputSchema = z.object({
  briefing: z.string().describe("The generated summary of the counseling history."),
});
export type GenerateBriefingOutput = z.infer<typeof GenerateBriefingOutputSchema>;

export async function generateBriefing(input: GenerateBriefingInput): Promise<GenerateBriefingOutput> {
  return generateBriefingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBriefingPrompt',
  input: { schema: GenerateBriefingInputSchema },
  output: { schema: GenerateBriefingOutputSchema },
  prompt: `
    Você é um assistente de aconselhamento pastoral e sua tarefa é gerar um resumo conciso e informativo sobre o histórico de atendimentos de um membro da igreja.

    **Perfil do Aconselhado:**
    - Nome: {{{memberName}}}
    {{#if memberAge}}- Idade: {{{memberAge}}} anos{{/if}}
    {{#if memberGender}}- Gênero: {{{memberGender}}}{{/if}}
    {{#if memberMaritalStatus}}- Estado Civil: {{{memberMaritalStatus}}}{{/if}}

    **Solicitação Inicial:**
    {{#if requestDetails}}
    "{{{requestDetails}}}"
    {{else}}
    (Nenhum detalhe adicional foi fornecido na solicitação inicial.)
    {{/if}}

    **Histórico de Sessões:**
    {{#if meetings}}
      {{#each meetings}}
      - Data: {{this.date}}
        Assunto: {{this.topic}}
        Anotações: "{{this.notes}}"
        {{#if this.isConfidential}}
        (Esta nota é CONFIDENCIAL)
        {{/if}}
      {{/each}}
    {{else}}
    (Nenhum atendimento foi registrado ainda.)
    {{/if}}


    **Sua Tarefa:**
    Analise TODAS as informações (perfil, solicitação e histórico) para gerar um briefing em um único parágrafo. O resumo deve:
    1.  Começar com o problema ou necessidade principal levantada na solicitação inicial.
    2.  Conectar o problema inicial com os dados demográficos do perfil, se relevante (ex: um problema de casamento para uma pessoa casada).
    3.  Identificar os principais temas ou problemas que foram discutidos ao longo do tempo nas sessões.
    4.  Apontar qualquer progresso ou padrões recorrentes, conectando-os com a solicitação original e o perfil.
    5.  Extrair e citar brevemente um ou dois insights ou pontos de destaque das anotações que ilustrem bem os temas principais.
    6.  Se houver alguma nota marcada como "CONFIDENCIAL", mencione no final do resumo que "Existem registros confidenciais que não foram detalhados aqui", sem revelar o conteúdo dessas notas.
    7.  Mantenha o tom profissional, empático e focado nos fatos registrados. O resumo deve ser objetivo e direto.
  `,
});

const generateBriefingFlow = ai.defineFlow(
  {
    name: 'generateBriefingFlow',
    inputSchema: GenerateBriefingInputSchema,
    outputSchema: GenerateBriefingOutputSchema,
  },
  async (input) => {
    if (input.meetings.length === 0 && !input.requestDetails) {
      return { briefing: "Não há registros de atendimentos ou detalhes na solicitação para gerar um resumo." };
    }
    const { output } = await prompt(input);
    return output ?? { briefing: "Não foi possível gerar o resumo." };
  }
);
