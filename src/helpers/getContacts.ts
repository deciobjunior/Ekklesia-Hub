
// helpers/getContacts.ts
import { createClient } from "@/lib/supabase/client";

const fetchAllFromMembers = async (churchId: string) => {
  const supabase = createClient();
  // Fetch from all relevant tables since a "contact" can be in any of them.
  const [membersRes, leadersRes, volunteersRes, visitorsRes] = await Promise.all([
      supabase.from('members').select('id, name, phone').eq('church_id', churchId).not('phone', 'is', null),
      supabase.from('pastors_and_leaders').select('id, name, email as phone').eq('church_id', churchId).not('email', 'is', null), // Assuming email as contact for leaders
      supabase.from('volunteers').select('id, name, phone').eq('church_id', churchId).not('phone', 'is', null),
      supabase.from('visitors').select('id, name, phone').eq('church_id', churchId).not('phone', 'is', null),
  ]);

  const allContacts: { id: string; name: string; phone: string; }[] = [];

  if (membersRes.data) allContacts.push(...membersRes.data.filter(c => c.phone));
  // For leaders, we might not have a phone, so this part needs careful consideration.
  // Sticking to phone for consistency. We will assume phone is the primary contact method.
  if (volunteersRes.data) allContacts.push(...volunteersRes.data.filter(c => c.phone));
  if (visitorsRes.data) allContacts.push(...visitorsRes.data.filter(c => c.phone));
  
  // Remove duplicates based on ID
  return Array.from(new Map(allContacts.map(item => [item.id, item])).values());
};

export const getContacts = async (group: string, churchId: string) => {
  const supabase = createClient();
  let allContacts: { id: string; name: string; phone: string; }[] = [];

  const fetchContactsFromTable = async (tableName: string) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('id, name, phone')
      .eq('church_id', churchId)
      .not('phone', 'is', null);

    if (error) {
      console.error(`Error fetching contacts from "${tableName}":`, error);
      return [];
    }
    return data || [];
  };

  switch (group) {
    case 'all':
      allContacts = await fetchAllFromMembers(churchId);
      break;
    case 'visitantes':
      allContacts = await fetchContactsFromTable('visitors');
      break;
    case 'novos-convertidos':
      allContacts = await fetchContactsFromTable('new_beginnings');
      break;
    case 'voluntarios':
      allContacts = await fetchContactsFromTable('volunteers');
      break;
    case 'membros':
      allContacts = await fetchAllFromMembers(churchId); // Same as 'all' for simplicity now
      break;
    case 'lideres':
      allContacts = await fetchContactsFromTable('pastors_and_leaders');
      break;
    default:
        // Assume 'group' is a ministry ID for custom groups
        const { data: ministryMembers, error: ministryError } = await supabase
            .from('pending_registrations')
            .select('form_data')
            .eq('id', group)
            .single();
        
        if (ministryError || !ministryMembers) {
            console.error(`Error fetching members for ministry "${group}":`, ministryError);
            return [];
        }
        
        const volunteerIds = ministryMembers.form_data.volunteer_ids || [];
        if (volunteerIds.length === 0) return [];
        
        // Fetch from 'members' table as it's the central repository for contact info
        const { data: contacts, error: contactsError } = await supabase
            .from('members')
            .select('id, name, phone')
            .in('id', volunteerIds);

        if (contactsError) {
             console.error(`Error fetching volunteer details for ministry "${group}":`, contactsError);
             return [];
        }
        allContacts.push(...(contacts || []).filter(c => c.phone));
  }
  
  // Remove duplicates based on ID, prioritizing the first entry found
  return Array.from(new Map(allContacts.map(item => [item.id, item])).values());
};
