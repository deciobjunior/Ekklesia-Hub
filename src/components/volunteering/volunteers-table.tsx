
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { VolunteerInfo } from "@/app/(app)/volunteering/dashboard/page";
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Search } from 'lucide-react';

interface VolunteersTableProps {
  volunteers: VolunteerInfo[];
}

export function VolunteersTable({ volunteers }: VolunteersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVolunteers = volunteers.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
        />
      </div>
      <ScrollArea className="h-[calc(100vh-380px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voluntário</TableHead>
              <TableHead>Ministérios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVolunteers.length > 0 ? filteredVolunteers.map(volunteer => (
              <TableRow key={volunteer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={volunteer.avatar} alt={volunteer.name} data-ai-hint="person" />
                        <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                        {volunteer.name}
                        <p className="text-xs text-muted-foreground font-normal">{volunteer.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                    <div className="flex flex-wrap gap-1">
                        {volunteer.ministries.length > 0 ? (
                            volunteer.ministries.map(ministry => (
                                <Badge key={ministry} variant="secondary">{ministry}</Badge>
                            ))
                        ) : (
                            <Badge variant="outline">Nenhum</Badge>
                        )}
                    </div>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">
                        Nenhum voluntário encontrado.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
