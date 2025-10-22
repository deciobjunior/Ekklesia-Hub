
import { createClient } from "@/lib/supabase/client";

export const markMessagesAsRead = async (churchId: string, phone: string) => {
  const supabase = createClient();
  if (!churchId || !phone) return;

  const { error } = await supabase
    .from('inbound_messages')
    .update({ is_read: true })
    .eq('church_id', churchId)
    .eq('phone', phone)
    .eq('is_read', false);
    
  if (error) {
    console.error('Error marking messages as read:', error);
  }
};

