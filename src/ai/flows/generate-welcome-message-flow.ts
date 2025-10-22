
'use server';
/**
 * @fileOverview Flow to generate a personalized welcome message for a new convert.
 *
 * - generateWelcomeMessage - A function that creates a welcome message.
 * - GenerateWelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * - GenerateWelcomeMessageOutput - The return type for the generateWelcomeMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';


const GenerateWelcomeMessageInputSchema = z.object({
  name: z.string().describe("The name of the person who just registered."),
  churchName: z.string().optional().describe("The name of the church."),
  interests: z.object({
    baptism: z.boolean().optional(),
    membership: z.boolean().optional(),
    volunteer: z.boolean().optional(),
    growth_group: z.boolean().optional(),
    counseling: z.boolean().optional(),
    prayer_request: z.boolean().optional(),
    know_more_about_jesus: z.boolean().optional(),
    visiting: z.boolean().optional(),
  }).optional().describe("An object with boolean flags for each interest the user selected."),
});
export type GenerateWelcomeMessageInput = z.infer<typeof GenerateWelcomeMessageInputSchema>;

const GenerateWelcomeMessageOutputSchema = z.object({
    message: z.string().describe("The generated personalized welcome message."),
});
export type GenerateWelcomeMessageOutput = z.infer<typeof GenerateWelcomeMessageOutputSchema>;


export async function generateWelcomeMessage(input: GenerateWelcomeMessageInput): Promise<GenerateWelcomeMessageOutput> {
  return generateWelcomeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWelcomeMessagePrompt',
  input: { schema: GenerateWelcomeMessageInputSchema },
  output: { schema: GenerateWelcomeMessageOutputSchema },
  prompt: `
      Você é um assistente de igreja carinhoso e acolhedor. Sua tarefa é criar uma mensagem de boas-vindas curta, pessoal e inspiradora para {{name}}, que acabou de se registrar na igreja {{churchName}}.

      A mensagem deve:
      1.  Começar com uma saudação calorosa e pessoal, usando o nome {{name}}.
      2.  Expressar alegria pela decisão da pessoa de se conectar conosco.
      3.  Incluir um versículo bíblico de encorajamento e esperança, relevante para um novo começo (Ex: 2 Coríntios 5:17, Jeremias 29:11, Filipenses 1:6).
      
      {{#if interests}}
        Adapte a mensagem com base nos interesses que {{name}} selecionou. Adicione uma frase específica para cada interesse:
        {{#if interests.baptism}}
        - Para "Desejo me batizar": Adicione uma frase como "Vimos seu desejo de se batizar e estamos muito felizes com essa decisão tão importante em sua caminhada com Cristo!"
        {{/if}}
        {{#if interests.membership}}
        - Para "Desejo me tornar membro": Adicione uma frase como "Que alegria saber do seu interesse em se tornar membro de nossa família. Em breve, daremos os próximos passos com você."
        {{/if}}
        {{#if interests.volunteer}}
        - Para "Desejo me tornar um voluntário": Adicione uma frase como "Ficamos animados em saber que você deseja servir conosco! Servir é uma forma poderosa de crescer e abençoar."
        {{/if}}
        {{#if interests.growth_group}}
        - Para "Desejo fazer parte de um grupo de crescimento (GC)": Adicione uma frase como "Conectar-se a um Grupo de Crescimento é a melhor forma de caminhar em comunidade. Logo um líder entrará em contato."
        {{/if}}
        {{#if interests.counseling}}
        - Para "Desejo Aconselhamento pastoral": Adicione uma frase como "Recebemos sua solicitação de atendimento pastoral. Saiba que estamos aqui para ouvir e apoiar você nesse processo."
        {{/if}}
        {{#if interests.prayer_request}}
        - Para "Tenho um pedido de oração": Adicione uma frase como "Seu pedido de oração foi recebido e nossa equipe de intercessão já está orando por você e por sua causa."
        {{/if}}
        {{#if interests.know_more_about_jesus}}
        - Para "Desejo conhecer mais a Jesus": Adicione uma frase como "Ficamos muito felizes com o seu desejo de conhecer mais a Jesus! Este é o começo da melhor jornada que existe."
        {{/if}}
        {{#if interests.visiting}}
        - Para "Estou apenas visitando": Adicione uma frase como "É um prazer ter você nos visitando. Sinta-se em casa em nossa comunidade."
        {{/if}}
      {{/if}}
      
      4. A mensagem deve ser concisa (2-3 frases no máximo, além das frases de interesse e do versículo).
      5. Terminar com uma saudação calorosa, como "Com carinho," ou "Com alegria,".
      6. No final de tudo, adicionar a assinatura "Equipe {{churchName}}".

      O resultado deve ser apenas o texto da mensagem, sem nenhum título ou formatação extra.
  `,
});

const generateWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'generateWelcomeMessageFlow',
    inputSchema: GenerateWelcomeMessageInputSchema,
    outputSchema: GenerateWelcomeMessageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output ?? { message: `Seja muito bem-vindo(a), ${input.name}! Estamos felizes com a sua decisão.` };
  }
);
