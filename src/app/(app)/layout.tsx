
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserProvider, useUser } from '@/hooks/use-user';
import { Loader2, LogOut, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import { MainNav } from '@/components/main-nav';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { HubIaWidget } from '@/components/hub-ia/hub-ia-widget';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import Link from 'next/link';

function IncompleteProfileDialog() {
    const { isCounselorProfileIncomplete, setIsCounselorProfileIncomplete } = useUser();

    return (
        <AlertDialog open={isCounselorProfileIncomplete} onOpenChange={setIsCounselorProfileIncomplete}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">Cadastro de Conselheiro Incompleto</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Para garantir que você possa ser encontrado(a) por pessoas que precisam de ajuda, é essencial que seu perfil de conselheiro esteja completo.
                        <br /><br />
                        Por favor, acesse as configurações para definir suas **áreas de atuação** e seus **horários de disponibilidade**.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogAction asChild>
                       <Link href="/settings">Completar meu Perfil</Link>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function AppLayoutClient({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const { user, userRole, churchId, churchName, authLoading, pendingNotifications, pendingNotificationItems } = useUser();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Public routes that should not render the main app layout
    const publicRoutes = ['/associate-church', '/register-leader', '/register-counselor', '/register-consolidator', '/register-volunteer', '/register-member', '/welcome', '/new-beginning', '/agendar', '/choose-ministry'];
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return <>{children}</>;
    }
    
    const showLoadingScreen = authLoading || (user && !churchId && !pathname.startsWith('/associate-church'));

    if (showLoadingScreen) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (user && !churchId && pathname !== '/associate-church') {
        router.push('/associate-church');
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user && !authLoading) {
      router.push('/login');
       return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const showHubIaWidget = pathname !== '/communications';

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[260px_1fr]">
        <IncompleteProfileDialog />
        <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:block">
            <div className="flex h-full max-h-screen flex-col">
                <div className="flex h-16 items-center border-b border-b-sidebar-border px-6">
                    <Logo />
                </div>
                 <div className="p-4 border-b border-b-sidebar-border">
                    <UserNav user={user} userRole={userRole} churchName={churchName} pendingNotifications={pendingNotifications} pendingNotificationItems={pendingNotificationItems} />
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-4 text-sm font-medium">
                        <MainNav userRole={userRole} permissions={null} />
                    </nav>
                </div>
                 <div className="mt-auto p-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </div>
            </div>
        </aside>
        <div className="flex flex-col">
          <header className="flex h-16 items-center gap-4 border-b bg-sidebar text-sidebar-foreground px-6">
             <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden bg-card text-card-foreground"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 bg-sidebar text-sidebar-foreground border-r-sidebar-border">
                <SheetHeader className="h-16 items-center border-b border-b-sidebar-border px-6 flex-row">
                    <Logo/>
                    <SheetTitle className="sr-only">Menu Principal</SheetTitle>
                    <SheetDescription className="sr-only">
                        Navegação principal da aplicação, incluindo links para as diferentes seções do sistema.
                    </SheetDescription>
                </SheetHeader>
                 <div className="p-4 border-b border-b-sidebar-border">
                    <UserNav user={user} userRole={userRole} churchName={churchName} pendingNotifications={pendingNotifications} pendingNotificationItems={pendingNotificationItems} />
                </div>
                <nav className="grid gap-2 p-4 text-base font-medium">
                  <MainNav userRole={userRole} permissions={null} />
                </nav>
                <div className="mt-auto p-2">
                     <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="w-full flex-1">
              <form>
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-sidebar-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Pesquisar..."
                    className="w-full appearance-none bg-transparent pl-8 shadow-none md:w-2/3 lg:w-1/3 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sidebar-foreground placeholder:text-sidebar-muted-foreground"
                  />
                </div>
              </form>
            </div>
            
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </div>

        {showHubIaWidget && <HubIaWidget user={user}/>}
      </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <AppLayoutClient>{children}</AppLayoutClient>
        </UserProvider>
    );
}
