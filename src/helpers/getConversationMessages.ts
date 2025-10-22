
import { createClient } from "@/lib/supabase/client";

export const getConversationMessages = async (churchId: string, phone: string) => {
  const supabase = createClient();
  if (!churchId || !phone) return [];

  const { data, error } = await supabase.rpc('get_conversation_messages', { p_church_id: churchId, p_phone: phone });
    
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  return data;
};
