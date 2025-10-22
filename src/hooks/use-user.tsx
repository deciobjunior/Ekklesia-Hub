

'use client';

import { useState, useEffect, createContext, useContext, useCallback, Dispatch, SetStateAction } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface PendingNotification {
    id: string;
    text: string;
    link: string;
}

interface UserContextType {
    user: SupabaseUser | null;
    userRole: string | null;
    churchId: string | null;
    churchName: string | null;
    authLoading: boolean;
    loading: boolean; // Alias for authLoading for backward compatibility
    pendingNotifications: number;
    pendingNotificationItems: PendingNotification[];
    isCounselorProfileIncomplete: boolean;
    setIsCounselorProfileIncomplete: Dispatch<SetStateAction<boolean>>;
    refreshUserData: () => void;
}

const UserContext = createContext<UserContextType>({
    user: null,
    userRole: null,
    churchId: null,
    churchName: null,
    authLoading: true,
    loading: true,
    pendingNotifications: 0,
    pendingNotificationItems: [],
    isCounselorProfileIncomplete: false,
    setIsCounselorProfileIncomplete: () => {},
    refreshUserData: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [churchId, setChurchId] = useState<string | null>(null);
    const [churchName, setChurchName] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [pendingNotifications, setPendingNotifications] = useState(0);
    const [pendingNotificationItems, setPendingNotificationItems] = useState<PendingNotification[]>([]);
    const [isCounselorProfileIncomplete, setIsCounselorProfileIncomplete] = useState(false);


    const syncUserProfile = async (currentUser: SupabaseUser, churchId: string) => {
        // Ensure the owner has a profile in pastors_and_leaders
        const { data: leaderData, error: leaderError } = await supabase
            .from('pastors_and_leaders')
            .select('id')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (leaderError) console.error("Error checking for pastor/leader profile:", leaderError);
        
        if (!leaderData) {
            const { error: insertLeaderError } = await supabase
                .from('pastors_and_leaders')
                .insert({
                    id: currentUser.id,
                    church_id: churchId,
                    name: currentUser.user_metadata.full_name || currentUser.email,
                    email: currentUser.email,
                    role: 'Administrador', 
                });
            if (insertLeaderError) console.error("Failed to create leader profile for owner:", insertLeaderError);
        }

        // Ensure the owner also has a profile in members
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('id')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (memberError) console.error("Error checking for member profile:", memberError);

        if (!memberData) {
            const { error: insertMemberError } = await supabase
                .from('members')
                .insert({
                    id: currentUser.id,
                    church_id: churchId,
                    name: currentUser.user_metadata.full_name || currentUser.email,
                    email: currentUser.email,
                    role: 'Membro',
                });
            if (insertMemberError) console.error("Failed to create member profile for owner:", insertMemberError);
        }
    };
    
    const fetchPendingNotifications = useCallback(async (currentUser: SupabaseUser, role: string, currentChurchId: string) => {
        if (!currentUser || !role || !currentChurchId) {
            setPendingNotifications(0);
            setPendingNotificationItems([]);
            setIsCounselorProfileIncomplete(false);
            return;
        }

        const notifications: PendingNotification[] = [];

        const { data: memberProfile } = await supabase
            .from('members')
            .select('phone, birthdate, gender, marital_status')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (memberProfile) {
            const missingFields = [];
            if (!memberProfile.phone) missingFields.push('telefone');
            if (!memberProfile.birthdate) missingFields.push('data de nascimento');
            if (!memberProfile.gender) missingFields.push('gênero');
            if (!memberProfile.marital_status) missingFields.push('estado civil');
            
            if (missingFields.length > 0) {
                 notifications.push({
                    id: 'profile-incomplete',
                    text: `Seu perfil está incompleto. Clique aqui para atualizar.`,
                    link: '/settings'
                });
            }
        }

        if (role === 'Conselheiro' || (role === 'Pastor' && currentUser.user_metadata.is_counselor)) {
            const { data: counselorData, error } = await supabase
                .from('counselors')
                .select('topics, availability')
                .eq('id', currentUser.id)
                .maybeSingle();

            const topicsAreEmpty = !counselorData?.topics || counselorData.topics.length === 0;
            
            let isAvailabilityEmpty = true;
            if (counselorData?.availability) {
                try {
                    const availabilityObj = typeof counselorData.availability === 'string'
                        ? JSON.parse(counselorData.availability)
                        : counselorData.availability;
                    if (Object.keys(availabilityObj).length > 0 && Object.values(availabilityObj).some(v => Array.isArray(v) && v.length > 0)) {
                        isAvailabilityEmpty = false;
                    }
                } catch (e) {
                    console.error("Error parsing availability JSON:", e);
                    isAvailabilityEmpty = true;
                }
            }
            
            if (topicsAreEmpty || isAvailabilityEmpty) {
                setIsCounselorProfileIncomplete(true);
            } else {
                setIsCounselorProfileIncomplete(false);
            }
        } else {
             setIsCounselorProfileIncomplete(false);
        }

        setPendingNotificationItems(notifications);
        setPendingNotifications(notifications.length);
    }, [supabase]);

    
    const fetchUserRoleAndChurchId = useCallback(async (currentUser: SupabaseUser) => {
        let finalRole: string | null = null;
        let finalChurchId: string | null = null;
        let finalChurchName: string | null = null;

        const { data: ownerData } = await supabase.from('churches').select('id, name').eq('owner_id', currentUser.id).maybeSingle();

        if (ownerData) {
            finalRole = 'Administrador';
            finalChurchId = ownerData.id;
            finalChurchName = ownerData.name;
            await syncUserProfile(currentUser, ownerData.id);
        } else {
            const profilePromises = [
                supabase.from('pastors_and_leaders').select('role, church_id, churches(name)').eq('id', currentUser.id).maybeSingle(),
                supabase.from('counselors').select('church_id, churches(name)').eq('id', currentUser.id).maybeSingle(),
                supabase.from('volunteers').select('role, church_id, churches(name)').eq('id', currentUser.id).maybeSingle(),
                supabase.from('members').select('church_id, churches(name)').eq('id', currentUser.id).maybeSingle(),
            ];

            const [ pastorLeaderRes, counselorRes, volunteerRes, memberRes ] = await Promise.all(profilePromises);

            if (pastorLeaderRes.data) {
                finalRole = pastorLeaderRes.data.role;
                finalChurchId = pastorLeaderRes.data.church_id;
                // @ts-ignore
                finalChurchName = pastorLeaderRes.data.churches?.name || null;
            } else if (counselorRes.data) {
                finalRole = 'Conselheiro';
                finalChurchId = counselorRes.data.church_id;
                // @ts-ignore
                finalChurchName = counselorRes.data.churches?.name || null;
            } else if (volunteerRes.data) {
                finalRole = volunteerRes.data.role || 'Voluntário';
                finalChurchId = volunteerRes.data.church_id;
                // @ts-ignore
                finalChurchName = volunteerRes.data.churches?.name || null;
            } else if (memberRes.data) {
                finalRole = 'Membro';
                finalChurchId = memberRes.data.church_id;
                // @ts-ignore
                finalChurchName = memberRes.data.churches?.name || null;
            }
        }
        
        setUserRole(finalRole);
        setChurchId(finalChurchId);
        setChurchName(finalChurchName);

        if (currentUser && finalRole && finalChurchId) {
            await fetchPendingNotifications(currentUser, finalRole, finalChurchId);
        }

    }, [supabase, fetchPendingNotifications]);

    const refreshUserData = useCallback(async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            await fetchUserRoleAndChurchId(currentUser);
        }
    }, [supabase, fetchUserRoleAndChurchId]);


    useEffect(() => {
        const handleAuthChange = async (event: string, session: any) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setAuthLoading(true);

            if (currentUser) {
                await fetchUserRoleAndChurchId(currentUser);
            } else {
                setUserRole(null);
                setChurchId(null);
                setChurchName(null);
                setPendingNotifications(0);
                setPendingNotificationItems([]);
            }
            setAuthLoading(false);
        };

        const checkInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await handleAuthChange("INITIAL_SESSION", session);
        };

        checkInitialSession();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'INITIAL_SESSION'].includes(event)) {
                handleAuthChange(event, session);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUserRoleAndChurchId, supabase.auth]);

    // Redirection logic
     useEffect(() => {
        if (!authLoading && user && !churchId && pathname !== '/associate-church') {
            router.push('/associate-church');
        }
    }, [authLoading, user, churchId, router, pathname]);

    const value: UserContextType = { user, userRole, churchId, churchName, authLoading, loading: authLoading, pendingNotifications, pendingNotificationItems, isCounselorProfileIncomplete, setIsCounselorProfileIncomplete, refreshUserData };

    if (authLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!churchId && pathname !== '/associate-church' && !pathname.startsWith('/register')) {
       return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
