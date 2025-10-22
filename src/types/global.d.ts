// Global type augmentations to fix TypeScript errors

declare module '@/lib/data' {
  export interface Counselor {
    church_id?: string;
    // ... other properties
  }
  
  export interface CounselingAppointment {
    requestingUserGender?: string;
    form_data?: Record<string, any>;
    // ... other properties
  }
}

export {};

