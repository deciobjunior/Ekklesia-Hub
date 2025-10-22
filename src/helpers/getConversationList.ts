
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getConversationList = async (churchId: string) => {
  const supabase = createClient();
  if (!churchId) return [];

  const { data: inbound, error: inboundError } = await supabase
    .from('inbound_messages')
    .select('phone, message, timestamp, contact_name, is_read')
    .eq('church_id', churchId);
    
  const { data: history, error: historyError } = await supabase
    .from('message_history')
    .select('member_phone, message_body, created_at, member_name')
    .eq('church_id', churchId);

  if (inboundError || historyError) {
    console.error('Error fetching conversation data:', inboundError || historyError);
    return [];
  }

  const conversations: { [key: string]: { contact_name: string; last_message: string; last_message_at: string; unread_count: number; phone: string; } } = {};

  // Process inbound messages
  (inbound || []).forEach(msg => {
    const phone = msg.phone;
    if (!conversations[phone] || new Date(msg.timestamp) > new Date(conversations[phone].last_message_at)) {
      conversations[phone] = {
        ...conversations[phone],
        contact_name: msg.contact_name || phone,
        last_message: msg.message,
        last_message_at: msg.timestamp,
        phone: phone,
      };
    }
    if (msg.is_read === false) {
      if (!conversations[phone]) {
          // Initialize if it doesn't exist yet from history
          conversations[phone] = { contact_name: msg.contact_name || phone, last_message: msg.message, last_message_at: msg.timestamp, unread_count: 0, phone: phone };
      }
      conversations[phone].unread_count = (conversations[phone].unread_count || 0) + 1;
    }
  });

  // Process message history (outbound)
  (history || []).forEach(msg => {
    const phone = msg.member_phone;
    if (!conversations[phone] || new Date(msg.created_at) > new Date(conversations[phone].last_message_at)) {
      conversations[phone] = {
        ...conversations[phone], // Keep unread_count if it exists
        contact_name: msg.member_name || phone,
        last_message: `Você: ${msg.message_body}`,
        last_message_at: msg.created_at,
        phone: phone,
      };
    }
  });

  // Sort and return the conversations
  return Object.values(conversations).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
};
