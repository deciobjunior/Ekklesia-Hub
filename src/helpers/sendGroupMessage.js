
// helpers/sendGroupMessage.js
import { createClient } from "@/lib/supabaseClient";
import { getContacts } from '@/helpers/getContacts.js';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage.js';

export const sendGroupMessage = async (input) => {
    const supabase = createClient();
    const membros = await getContacts(input.group, input.churchId);
    let successCount = 0;
    let errorCount = 0;
    
    const campaignId = crypto.randomUUID();
    const historyRecords = [];

    // 1. Prepare all message records
    for (const membro of membros) {
        if (membro.phone) {
            const personalizedMessage = input.message.replace(/{nome}/g, membro.name.split(' ')[0]);
            historyRecords.push({
                church_id: input.churchId,
                member_name: membro.name,
                member_phone: membro.phone,
                message_body: personalizedMessage,
                status: 'Pendente', // Start as Pending
                sent_by: input.senderName,
                campaign_id: campaignId,
            });
        } else {
            errorCount++; // Count members without a phone number
        }
    }

    // 2. Save all records to the database first
    if (historyRecords.length > 0) {
        const { data: insertedRecords, error: historyError } = await supabase
            .from('message_history')
            .insert(historyRecords)
            .select();

        if (historyError) {
            console.error("Failed to log message history:", historyError);
            return {
                success: false,
                message: `Ocorreu um erro ao registrar o histórico de envio. Nenhuma mensagem foi enviada: ${historyError.message}`
            }
        }

        // 3. If saving was successful, send messages to the webhook
        for (const record of insertedRecords) {
            try {
                // Não aguardar o webhook aqui, apenas disparar a solicitação.
                sendWhatsappMessage(record.member_phone, record.message_body)
                    .catch(webhookError => {
                        // Mesmo que a chamada ao webhook falhe, o registro já está como "Pendente".
                        // O n8n pode ter um mecanismo de retentativa ou log de erros.
                        console.error(`Falha ao disparar webhook para ${record.member_name}:`, webhookError);
                    });
                successCount++;
            } catch (error) {
                console.error(`Erro inesperado ao tentar enviar para ${record.member_name}:`, error);
                errorCount++;
            }
        }
    }

    const resultMessage = `${successCount} mensagem(ns) iniciada(s) com sucesso. ${errorCount > 0 ? `${errorCount} falharam (verifique os números ou o log de erros).` : ''}`;
    return {
        success: errorCount === 0,
        message: resultMessage,
    };
};

    