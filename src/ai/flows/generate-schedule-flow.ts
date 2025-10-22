
'use server';
/**
 * @fileOverview Flow to generate a volunteer schedule using AI.
 *
 * - generateSchedule - A function that creates a schedule based on volunteers and their availability.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import { ai } from '@/ai/genkit';
import { Availability } from '@/lib/data';
import { z } from 'genkit';

const VolunteerSchema = z.object({
    id: z.string(),
    name: z.string(),
    availability: z.array(z.object({
        day: z.enum(['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']),
        periods: z.array(z.enum(['Manhã', 'Tarde', 'Noite'])),
    })).optional(),
});

const FormattedVolunteerSchema = z.object({
    name: z.string(),
    availabilityText: z.string(),
});

const GenerateScheduleInputSchema = z.object({
  volunteers: z.array(VolunteerSchema).describe("A lista de voluntários disponíveis para a escala."),
  month: z.string().describe("O mês para o qual a escala deve ser gerada, ex: 'Julho', 'Agosto'."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


const ScheduleEntrySchema = z.object({
    week: z.string().describe("A semana da escala, ex: 'Semana 1 (dd/mm)'"),
    morningVolunteers: z.array(z.string()).describe("Nomes dos voluntários para o culto da manhã (10h)."),
    eveningVolunteers: z.array(z.string()).describe("Nomes dos voluntários para o culto da noite (18h)."),
});

const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema).describe("A escala gerada em formato estruturado."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const formatAvailability = (availability: any): string => {
    if (!availability) return "Não informada";
    
    let parsedAvailability = availability;

    if (typeof availability === 'string') {
        try {
            parsedAvailability = JSON.parse(availability);
        } catch (e) {
            return 'Disponibilidade em formato inválido';
        }
    }
    
    if (typeof parsedAvailability === 'object' && parsedAvailability !== null && !Array.isArray(parsedAvailability)) {
        return Object.entries(parsedAvailability)
            .map(([day, times]) => {
                if (Array.isArray(times) && times.length > 0) {
                    return `${day}: ${times.join(', ')}`;
                }
                return null;
            })
            .filter(Boolean)
            .join('; ');
    }

    if (Array.isArray(parsedAvailability) && parsedAvailability.length > 0) {
        return parsedAvailability.map(a => `${a.day}: ${a.periods.join(', ')}`).join('; ');
    }
  
    return "Não informada";
};

const prompt = ai.definePrompt({
    name: 'generateSchedulePrompt',
    input: { schema: z.object({ 
        volunteers: z.array(FormattedVolunteerSchema),
        month: z.string(),
    })},
    output: {schema: GenerateScheduleOutputSchema},
    prompt: `
      Você é um assistente inteligente para gestão de igrejas. Sua tarefa é criar uma escala de voluntários para um ministério para as próximas 4 semanas, para o mês de {{{month}}}.

      Considere os seguintes voluntários e suas disponibilidades:
      {{#each volunteers}}
      - {{{this.name}}}: Disponível em {{{this.availabilityText}}}
      {{/each}}

      Regras para a escala:
      1.  A escala deve cobrir os próximos 4 domingos do mês de {{{month}}}.
      2.  Cada domingo tem dois cultos: um às 10h (Manhã) e outro às 18h (Noite).
      3.  Distribua as escalas de forma equilibrada. O objetivo principal é que todos os voluntários trabalhem um número semelhante de vezes. Evite sobrecarregar um voluntário e deixar outros sem escala.
      4.  Respeite a disponibilidade informada por cada voluntário. Se um voluntário só pode de manhã, não o escale à noite.
      5.  Gere um array de objetos, onde cada objeto representa uma semana da escala, contendo a semana, os voluntários da manhã e os voluntários da noite.
      6.  Preencha as datas para os próximos 4 domingos a partir da data de hoje, dentro do mês de {{{month}}}.
      7.  Sempre que possível, escale pelo menos 2 (dois) voluntários por horário (Manhã e Noite) para garantir que ninguém trabalhe sozinho.
    `,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async ({ volunteers, month }) => {

    const formattedVolunteers = volunteers.map(v => ({
        name: v.name,
        availabilityText: formatAvailability(v.availability),
    }));

    const { output } = await prompt({ volunteers: formattedVolunteers, month });
    return output ?? { schedule: [] };
  }
);

