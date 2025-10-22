
import { LucideProps, UserPlus, Handshake, Settings, CalendarCheck } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { z } from 'zod';


export type Availability = {
  day: 'Domingo' | 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado';
  periods: ('Manhã' | 'Tarde' | 'Noite')[];
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: 'Pastor' | 'Líder' | 'Membro' | 'Visitante' | 'Coordenador' | 'Voluntário' | 'Conselheiro' | 'Líder de Pequeno Grupo' | 'Consolidador';
  status: 'Ativo' | 'Inativo' | 'Pendente' | 'Aguardando regularização' | 'Em Validação';
  lastSeen: string;
  avatar: string;
  availability?: Availability[];
  phone?: string;
  gender: 'Masculino' | 'Feminino' | 'Outro';
  birthdate: string;
  maritalStatus: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)';
  form_data?: Record<string, any>; // To store passwords and other form data temporarily
  ministryCount?: number;
  isInSmallGroup?: boolean;
  isNowMember?: boolean;
};

export const members: Member[] = [];

export const pendingMembers: Member[] = [];

export type MinistryVolunteer = {
    id: string;
};

export type Ministry = {
    id: string;
    name: string;
    description: string;
    pastor: string;
    pastorAvatar: string;
    volunteers: MinistryVolunteer[];
};

export const ministries: Ministry[] = [];

export type SmallGroup = {
  id: string;
  name: string;
  leader_id: string;
  leader_name?: string;
  member_ids: string[];
  location: string;
  image_url: string;
};

export const smallGroups: any[] = [];


export type CommunicationGroup = {
  id: string;
  name: string;
  leader?: string;
  members: number;
  imageUrl: string;
  phone: string;
};

export type Trigger = {
  id: string;
  name: string;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
};

export type Automation = {
  id: string;
  title: string;
  description: string;
  triggerType: string;
  triggerIcon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  action: string;
  isActive: boolean;
  delay: string;
  message: string;
};


export const communicationGroups: CommunicationGroup[] = [];


export const attendanceData: any[] = [];

export const demographicsData: any[] = [];

// --- Módulo de Discipulado ---

export type DiscipleshipMeeting = {
  id: string;
  date: string;
  topic: string;
  notes: string;
  nextSteps: string;
};

export type DiscipleshipRelation = {
  relationId: string;
  disciplerId: string;
  discipleId: string;
  meetings: DiscipleshipMeeting[];
};

export const discipleshipData: DiscipleshipRelation[] = [];


// --- Módulo Financeiro ---

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'Entrada' | 'Saída';
  category: string;
  status: 'Pendente' | 'Conciliado';
};

export type FinancialCategory = {
  id: string;
  name: string;
  type: 'Entrada' | 'Saída';
};

export const financialCategories: FinancialCategory[] = [];

export const transactions: Transaction[] = [];

// --- Módulo de Aconselhamento ---

export type Counselor = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone?: string;
  topics: string[];
  availability: string | Record<string, string[]>;
  gender: 'Masculino' | 'Feminino' | 'Outro';
  role?: 'Pastor' | 'Conselheiro';
  church_id?: string;
};

export const counselors: Counselor[] = [];

export type CounselingMeeting = {
  id: string;
  date: string;
  topic: string;
  notes: string;
  nextSteps: string;
  recordedBy: string; // Name of the counselor who recorded the meeting
  recordedById: string; // ID of the counselor
  isConfidential?: boolean;
};

export type CounselingAppointment = {
  id: string;
  counselorId: string;
  counselorName?: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  date: string;
  topic: string;
  status: 'Marcado' | 'Concluído' | 'Cancelado' | 'Pendente' | 'Em Aconselhamento' | 'Na Fila';
  meetings: CounselingMeeting[];
  form_data?: Record<string, any>;
  requestingUserGender?: string;
};

export const counselingAppointments: CounselingAppointment[] = [];


export const counselingTopics = [
    { id: 'casamento', label: 'Casamento (brigas, traições, discussões...)' },
    { id: 'espiritual', label: 'Espirituais (Não consigo ler, orar, jejuar...)' },
    { id: 'emocional', label: 'Emocionais (Amoroso, depressão, perdão...)' },
    { id: 'filhos', label: 'Filhos (Educação, Correção...)' },
    { id: 'financeiro', label: 'Financeiro (Gestão, Crise Financeira...)' },
    { id: 'relacionamento', label: 'Relacionamento Familiar ou amigável' },
    { id: 'saude', label: 'Saúde (Problemas físicos, doenças...)' },
    { id: 'sexual', label: 'Sexual (masturbação, sexo antes do casamento...)' },
    { id: 'vicios', label: 'Vícios (Bebidas, tabaco, drogas, pornografia...)' },
];


// --- Módulo Kids ---
export type Kid = {
  id: string;
  name: string;
  avatar: string;
  birthdate: string;
  parents: {
    name: string;
    phone: string;
  }[];
  allergies?: string;
  notes?: string;
};

export type KidCheckIn = {
  checkInId: string;
  kidId: string;
  checkInTime: string; // Using ISO string to avoid timezone issues on server/client
  checkOutTime?: string;
  checkedInBy: string; // Parent/guardian name
  checkedOutBy?: string; // Parent/guardian name
  status: 'CheckedIn' | 'CheckedOut';
};

export const kids: Kid[] = [];

export const kidsCheckIns: KidCheckIn[] = [];

export const kidsVolunteers: Member[] = [];

// --- Módulo de Eventos ---

export type Event = {
  id: string;
  name: string;
  date: Date;
  description: string;
  type: 'Culto' | 'Ensaio' | 'Reunião' | 'Conferência' | 'Evento Especial';
  ministryOwner?: string; // ID of the ministry responsible
};

export const events: Event[] = [];

// --- Conversas ---
export type Conversation = {
  id: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: 'me' | string; // 'me' or contact name
  content: string;
  timestamp: string;
};

export const conversations: Conversation[] = [];

export const messages: Message[] = [];


// --- Tipos de Fluxo Genkit ---
export const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The email address of the recipient.'),
  subject: z.string().describe('The subject of the email.'),
  body: z.string().describe('The HTML body of the email.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export const SendWhatsappInputSchema = z.object({
  to: z.string().describe("The recipient's phone number in E.164 format (e.g., +5511999999999)."),
  body: z.string().describe('The text of the message to be sent.'),
});
export type SendWhatsappInput = z.infer<typeof SendWhatsappInputSchema>;

export const HubIaInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({ text: z.string() })),
    })
  ),
  prompt: z.string(),
  userId: z.string().optional().describe("O ID do usuário autenticado que está fazendo a pergunta."),
});
export type HubIaInput = z.infer<typeof HubIaInputSchema>;

export const HubIaOutputSchema = z.string();
export type HubIaOutput = z.infer<typeof HubIaOutputSchema>;

export const GenerateScheduleNotificationInputSchema = z.object({
  counselorName: z.string().describe("The name of the counselor receiving the notification."),
  memberName: z.string().describe("The name of the person who scheduled the appointment."),
  appointmentDate: z.string().describe("The date of the appointment (e.g., 'dd/MM/yyyy')."),
  appointmentTime: z.string().describe("The time of the appointment (e.g., 'HH:mm')."),
});
export type GenerateScheduleNotificationInput = z.infer<typeof GenerateScheduleNotificationInputSchema>;

export const GenerateScheduleNotificationOutputSchema = z.object({
    message: z.string().describe("The generated personalized notification message."),
});
export type GenerateScheduleNotificationOutput = z.infer<typeof GenerateScheduleNotificationOutputSchema>;


export const welcomeInterests = [
    { key: 'baptism', label: 'Desejo me batizar' },
    { key: 'membership', label: 'Desejo me tornar membro' },
    { key: 'volunteer', label: 'Desejo me tornar um voluntário' },
    { key: 'growth_group', label: 'Desejo fazer parte de um grupo de crescimento (GC)' },
    { key: 'counseling', label: 'Desejo Aconselhamento pastoral' },
    { key: 'prayer_request', label: 'Tenho um pedido de oração' },
    { key: 'know_more_about_jesus', label: 'Desejo conhecer mais a Jesus' },
];
