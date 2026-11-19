export const designations = [
  'CRM',
  'PURCHASE',
  'HR',
  'EA',
  'SALES Coordination',
  'AUDITOR',
  'ACCOUNTANT',
] as const;

export type Designation = (typeof designations)[number];

export interface System {
  systemName: string;
  taskName: string;
  description: string;
  systemLink: string;
  dbLink: string;
  trainingVideo: string;
}

export interface DesignationData {
  actualRole: string;
  totalTasks: string;
  scoringWorks: string;
  scoreBetter: string;
  keyPerson: string;
  communicationTeam: string[];
  howToCommunicate: string;
  importanceScore: string;
  systems: System[];
}
