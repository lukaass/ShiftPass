export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type PatientStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface Patient {
  id: string;
  name: string;
  bed: string;
  chartNumber: string;
  age: number;
  sex: 'M' | 'F' | 'Prefere não dizer' | string;
  diagnosis: string;
  sector: string;
  responsibleNurse: string;
  status: PatientStatus;
  lastUpdated: string; // ISO string
  situation: string; // Campo grande de texto ("Situação Atual")
  pendingList: ChecklistItem[]; // Checklist
  alerts: string[]; // Botões rápidos destacados
  observations: string; // Campo livre
  nextShiftSummary: string; // Resumo limitado (ex: 300 caracteres)
}

export interface HandoverHistory {
  id: string;
  patientId: string;
  timestamp: string; // ISO string
  recordedBy: string; // Nome/E-mail do enfermeiro responsável
  situation: string;
  pendingList: ChecklistItem[];
  alerts: string[];
  observations: string;
  nextShiftSummary: string;
}

export interface NurseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
