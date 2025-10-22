
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-schedule-flow.ts';
import '@/ai/flows/send-email-flow.ts';
import '@/ai/flows/generate-briefing-flow.ts';
import '@/ai/flows/hub-ia-flow.ts';
import '@/ai/flows/generate-welcome-message-flow.ts';
import '@/ai/flows/generate-schedule-notification-flow.ts';

