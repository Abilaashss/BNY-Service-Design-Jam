export enum AgentType {
  MASTER = 'Master/Intent Agent',
  SLA = 'SLA Breach Agent',
  RISK = 'Risk Score Agent',
  VALIDATION = 'Validation Agent',
  SYSTEM = 'System',
}

export enum IntentType {
  QUERY = 'Product Query',
  FEEDBACK = 'Feedback/Feature',
  COMPLAINT = 'Complaint',
  UNKNOWN = 'Unknown',
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface ProcessingStep {
  agent: AgentType;
  message: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  timestamp: number;
  details?: string;
}

export interface SuggestedAction {
  label: string;
  text: string; // The text to be sent when clicked
  type: 'data' | 'action';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  processingSteps?: ProcessingStep[]; // To visualize the agentic flow
  suggestedActions?: SuggestedAction[];
  metadata?: {
    riskScore?: number;
    riskLevel?: RiskLevel;
    slaBreachPredicted?: boolean;
    slaTargetHours?: number;
    slaReason?: string;
    intent?: IntentType;
    domain?: string;
    notifiedTeams?: string[];
    validationPassed?: boolean;
    validationReason?: string;
  };
}

export interface DashboardStats {
  totalInteractions: number;
  slaBreachesPrevented: number;
  highRiskFlags: number;
  averageResponseTime: number; // in seconds
  intentDistribution: {
    [key in IntentType]: number;
  };
  riskDistribution: {
    [key in RiskLevel]: number;
  };
  teamLoad: Record<string, number>;
}

export interface DomainConfig {
  id: string;
  name: string;
  logo: string;
  description: string;
  slaThresholds: {
    urgent: number; // hours
    standard: number; // hours
  };
  riskKeywords: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}