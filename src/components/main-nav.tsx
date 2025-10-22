
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Briefcase,
  Settings,
  UserPlus,
  Landmark,
  ClipboardList,
  HelpingHand,
  GraduationCap,
  Baby,
  BarChart3,
  ShieldCheck,
  CalendarCheck,
  Clock,
  HeartHandshake,
  Archive,
  Lock,
  Wrench,
  Sparkles,
  History,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const NavLink = ({ href, label, icon: Icon, currentPathname }: { href: string; label: string; icon: React.ElementType; currentPathname: string; }) => {
    const isActive = href === '/dashboard' ? currentPathname === href : currentPathname.startsWith(href);
    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-muted-foreground transition-all hover:bg-sidebar-active-background',
                isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:text-sidebar-foreground'
            )}
            >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
    userRole: string | null;
    permissions: Record<string, any> | null;
}

export function MainNav({ className, userRole, permissions, ...props }: MainNavProps) {
  const pathname = usePathname();

  const canView = (feature: string) => {
    if (!userRole) return false;
    
    // Admin, Pastor and Coordenador have full access
    if (userRole === 'Administrador' || userRole === 'Pastor' || userRole === 'Coordenador') {
        return true;
    }

    if (userRole === 'Consolidador') {
        return ['acolhimento', 'groups', 'discipleship'].includes(feature);
    }

    if (userRole === 'Conselheiro') {
        return feature === 'counseling';
    }

    if (userRole === 'Voluntário') {
      return feature === 'dashboard' || feature === 'admin';
    }
    
    // Fallback for other roles if needed, default to no access
    return false;
  };


  const isLinkActive = (baseHref: string) => {
    return pathname.startsWith(baseHref);
  }

  const renderNavItems = () => (
    <>
      {canView('dashboard') && (
        <div className="space-y-1">
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} currentPathname={pathname} />
        </div>
      )}
      
      <div className="mt-4">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-muted-foreground tracking-wider">Gestão</h2>
          <Accordion type="multiple" className="w-full">
            {(canView('acolhimento') || canView('members') || canView('groups') || canView('discipleship')) && (
              <AccordionItem value="pessoas">
                <AccordionTrigger className="px-3 py-2 text-sm font-normal hover:no-underline hover:bg-sidebar-active-background [&[data-state=open]]:bg-sidebar-active-background/50 [&[data-state=open]]:text-sidebar-foreground">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4" /> Pessoas
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                  {(canView('acolhimento') || userRole === 'Consolidador') && <NavLink href="/acolhimento" label="Acolhimento" icon={HeartHandshake} currentPathname={pathname} />}
                  {canView('members') && <NavLink href="/members" label="Membros" icon={Users} currentPathname={pathname} />}
                  {canView('groups') && (
                    <Accordion type="single" collapsible className="w-full" defaultValue={isLinkActive('/groups') ? 'groups-main' : ''}>
                      <AccordionItem value="groups-main" className="border-b-0">
                          <AccordionTrigger className="px-3 py-2 text-sm font-normal hover:no-underline hover:bg-sidebar-active-background rounded-md [&[data-state=open]]:bg-sidebar-active-background/50 [&[data-state=open]]:text-sidebar-foreground">
                              <div className="flex items-center gap-3">
                                  <UserPlus className="h-4 w-4" /> Pequenos Grupos
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="pl-8 pr-2 pt-1 space-y-1">
                              <NavLink href="/groups" label="Ver Grupos" icon={Users} currentPathname={pathname} />
                              <NavLink href="/groups/interests" label="Interessados" icon={UserPlus} currentPathname={pathname} />
                          </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  {canView('discipleship') && <NavLink href="/discipleship" label="Discipulado" icon={GraduationCap} currentPathname={pathname} />}
                </AccordionContent>
              </AccordionItem>
            )}
            
            {(canView('ministries') || canView('volunteering')) && (
              <AccordionItem value="ministerios">
                <AccordionTrigger className="px-3 py-2 text-sm font-normal hover:no-underline hover:bg-sidebar-active-background [&[data-state=open]]:bg-sidebar-active-background/50 [&[data-state=open]]:text-sidebar-foreground">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4" /> Ministérios
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                  {canView('ministries') && <NavLink href="/ministries" label="Gestão de Ministérios" icon={Briefcase} currentPathname={pathname} />}
                  {canView('volunteering') && (
                    <Accordion type="single" collapsible className="w-full" defaultValue={isLinkActive('/volunteering') ? 'volunteering-main' : ''}>
                      <AccordionItem value="volunteering-main" className="border-b-0">
                          <AccordionTrigger className="px-3 py-2 text-sm font-normal hover:no-underline hover:bg-sidebar-active-background rounded-md [&[data-state=open]]:bg-sidebar-active-background/50 [&[data-state=open]]:text-sidebar-foreground">
                              <div className="flex items-center gap-3">
                                  <ClipboardList className="h-4 w-4" /> Voluntariado
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="pl-8 pr-2 pt-1 space-y-1">
                              <NavLink href="/volunteering/dashboard" label="Dashboard" icon={BarChart3} currentPathname={pathname} />
                              <NavLink href="/volunteering/new-volunteers" label="Central de Voluntários" icon={UserPlus} currentPathname={pathname} />
                              <NavLink href="/volunteering/schedules" label="Escalas" icon={CalendarCheck} currentPathname={pathname} />
                          </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {(canView('financial') || userRole === 'Administrador' || canView('statistics')) && (
              <AccordionItem value="operacoes">
                <AccordionTrigger className="px-3 py-2 text-sm font-normal hover:no-underline hover:bg-sidebar-active-background [&[data-state=open]]:bg-sidebar-active-background/50 [&[data-state=open]]:text-sidebar-foreground">
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4" /> Operações
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8 pr-2 pt-1 space-y-1">
                  {canView('financial') && <NavLink href="/financial" label="Financeiro" icon={Landmark} currentPathname={pathname} />}
                  {canView('statistics') && <NavLink href="/statistics" label="Registros de Culto" icon={BarChart3} currentPathname={pathname} />}
                </AccordionContent>
              </AccordionItem>
            )}

            {canView('counseling') && (
              <AccordionItem value="counseling">
                <AccordionTrigger className="px-3 py-2 text-sm font-normal hover:no-underline hover:bg-sidebar-active-background [&[data-state=open]]:bg-sidebar-active-background/50 [&[data-state=open]]:text-sidebar-foreground">
                  <div className="flex items-center gap-3">
                      <HelpingHand className="h-4 w-4" /> Atendimento Pastoral
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8 pr-2 pt-1 space-y-1">
                    <NavLink href="/counseling/schedules" label="Agendamentos" icon={CalendarCheck} currentPathname={pathname}/>
                    <NavLink href="/counseling/counselors" label="Conselheiros" icon={Users} currentPathname={pathname}/>
                    <NavLink href="/counseling/waiting-list" label="Fila de Espera" icon={Clock} currentPathname={pathname}/>
                    {(userRole === 'Conselheiro' || userRole === 'Pastor' || userRole === 'Administrador' || userRole === 'Coordenador') && (
                        <NavLink href="/counseling/my-schedule" label="Minha Agenda" icon={CalendarCheck} currentPathname={pathname}/>
                    )}
                    <NavLink href="/counseling/statistics" label="Estatísticas" icon={BarChart3} currentPathname={pathname}/>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
       </div>
       
       {userRole === 'Administrador' && (
        <div className="mt-4">
            <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-muted-foreground tracking-wider">MÓDULOS AVANÇADOS</h2>
            <div className="space-y-1">
                <NavLink href="/communications" label="Comunicação" icon={MessageCircle} currentPathname={pathname} />
                <NavLink href="/kids" label="Kids" icon={Baby} currentPathname={pathname} />
                <NavLink href="/history" label="Histórico de Atividades" icon={History} currentPathname={pathname} />
            </div>
        </div>
       )}

      <div className="mt-4">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-muted-foreground tracking-wider">Sistema</h2>
          <div className="space-y-1">
            <NavLink href="/settings" label="Configurações" icon={Wrench} currentPathname={pathname} />
          </div>
      </div>
    </>
  );

  return (
    <nav className={cn('grid items-start', className)} {...props}>
      {renderNavItems()}
    </nav>
  );
}
