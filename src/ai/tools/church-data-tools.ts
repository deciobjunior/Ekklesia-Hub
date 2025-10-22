
'use server';
/**
 * @fileOverview Genkit tools for fetching church data from Supabase.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

const ChurchMetricsSchema = z.object({
    totalMembers: z.number().describe("O número total de membros (incluindo líderes)."),
    totalLeaders: z.number().describe("O número total de pastores e líderes."),
    totalVolunteers: z.number().describe("O número total de voluntários."),
    totalSmallGroups: z.number().describe("O número total de pequenos grupos."),
    totalCounselors: z.number().describe("O número total de conselheiros."),
    newBeginningsThisMonth: z.number().describe("O número de 'novos começos' registrados nos últimos 30 dias."),
    pendingApprovals: z.number().describe("O número de cadastros pendentes de aprovação."),
});

async function fetchChurchIdForUser(userId: string) {
    const supabase = await createClient();
    if (!userId) throw new Error("ID do usuário não fornecido.");

    const { data: church } = await supabase
        .from('churches')
        .select('id')
        .eq('owner_id', userId)
        .single();
    
    if (!church) throw new Error("Igreja não encontrada para o usuário atual.");
    return church.id;
}

export const getChurchMetrics = ai.defineTool(
    {
        name: 'getChurchMetrics',
        description: 'Busca as principais métricas da igreja, como número de membros, líderes, voluntários, pequenos grupos, etc. Use esta ferramenta sempre que o usuário pedir um resumo geral, um dashboard ou números totais sobre a igreja.',
        inputSchema: z.object({}),
        outputSchema: ChurchMetricsSchema,
    },
    async (input) => {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Usuário não autenticado.");
        }
        const userId = user.id;
        const churchId = await fetchChurchIdForUser(userId);

        const [
            members,
            leaders,
            volunteers,
            smallGroups,
            counselors,
            newBeginnings,
            pendingApprovals,
        ] = await Promise.all([
            supabase.from('members').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
            supabase.from('pastors_and_leaders').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
            supabase.from('volunteers').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
            supabase.from('small_groups').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
            supabase.from('counselors').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
            supabase.from('new_beginnings').select('*', { count: 'exact', head: true }).eq('church_id', churchId).gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
            supabase.from('pending_registrations').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'Pendente'),
        ]);

        return {
            totalMembers: (members.count ?? 0) + (leaders.count ?? 0),
            totalLeaders: leaders.count ?? 0,
            totalVolunteers: volunteers.count ?? 0,
            totalSmallGroups: smallGroups.count ?? 0,
            totalCounselors: counselors.count ?? 0,
            newBeginningsThisMonth: newBeginnings.count ?? 0,
            pendingApprovals: pendingApprovals.count ?? 0,
        };
    }
);
