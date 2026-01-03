import { GoogleGenAI, Content, Part, Type } from "@google/genai";
import { AgentType, IntentType, RiskLevel, ProcessingStep, DomainConfig, ChatMessage, SuggestedAction } from "../types";
import { DOMAINS, MOCK_USER_CONTEXT } from "./mockData";

// Initialize Gemini - Removed global initialization to support dynamic API key updates
const modelName = 'gemini-3-flash-preview';

// --- Helper: Risk Calculator Tool ---
const calculateRiskScore = (text: string, domain: DomainConfig): { score: number; level: RiskLevel } => {
  const lowerText = text.toLowerCase();
  let score = 0;

  // Synthetic dataset logic
  domain.riskKeywords.critical.forEach(word => { if (lowerText.includes(word)) score += 40; });
  domain.riskKeywords.high.forEach(word => { if (lowerText.includes(word)) score += 20; });
  domain.riskKeywords.medium.forEach(word => { if (lowerText.includes(word)) score += 10; });

  // Cap score
  if (score > 100) score = 100;

  let level = RiskLevel.LOW;
  if (score >= 80) level = RiskLevel.CRITICAL;
  else if (score >= 50) level = RiskLevel.HIGH;
  else if (score >= 20) level = RiskLevel.MEDIUM;

  return { score, level };
};

// --- Helper: SLA Estimator Tool ---
const checkSLAStatus = (intent: IntentType, risk: RiskLevel, domain: DomainConfig) => {
  const isUrgent = risk === RiskLevel.HIGH || risk === RiskLevel.CRITICAL || intent === IntentType.COMPLAINT;
  const threshold = isUrgent ? domain.slaThresholds.urgent : domain.slaThresholds.standard;
  
  // Construct reason for decision
  let reason = "Standard workflow applies";
  if (risk === RiskLevel.CRITICAL) reason = "Critical Risk Score (>80)";
  else if (risk === RiskLevel.HIGH) reason = "High Risk Score (>50)";
  else if (intent === IntentType.COMPLAINT) reason = "Complaint Priority";
  else if (isUrgent) reason = "Urgent Intent Classification";

  return {
    breachPredicted: isUrgent && threshold < 1, 
    timeToResolve: threshold,
    unit: 'hours',
    reason
  };
};

// --- Helper: Team Routing Logic ---
const determineNotifiedTeams = (intent: IntentType, risk: RiskLevel, domainId: string): string[] => {
  const teams = new Set<string>();
  
  // Default Layer
  teams.add('L1 Support');

  // Risk Based Routing
  if (risk === RiskLevel.CRITICAL) {
    teams.add('Legal & Compliance');
    teams.add('Senior Leadership');
    teams.delete('L1 Support'); // Escalated completely
    teams.add('Crisis Response');
  } else if (risk === RiskLevel.HIGH) {
    teams.add('Risk Management');
    teams.add('L3 Support Lead');
  }

  // Intent Based Routing
  if (intent === IntentType.COMPLAINT) {
    teams.add('Customer Retention');
    teams.add('Quality Assurance');
  } else if (intent === IntentType.FEEDBACK) {
    teams.add('Product Management');
    teams.add('UX Research');
  }

  // Domain Specific Routing
  if (domainId === 'zepto') {
    if (intent === IntentType.COMPLAINT || risk === RiskLevel.HIGH) {
      teams.add('Logistics Ops');
      teams.add('Hub Manager');
    }
  } else if (domainId === 'bny') {
     if (intent === IntentType.QUERY && risk !== RiskLevel.LOW) {
        teams.add('Wealth Advisory');
     }
  }

  return Array.from(teams);
};

export const processUserRequest = async (
  userMessage: string,
  history: ChatMessage[],
  domainId: string,
  onStepUpdate: (step: ProcessingStep) => void
): Promise<{ 
  response: string; 
  suggestedActions: SuggestedAction[];
  metadata: any 
}> => {
  // Initialize Gemini client inside the function to pick up any environment variable changes
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const domain = DOMAINS[domainId];
  // @ts-ignore - Mock data access
  const userContext = MOCK_USER_CONTEXT[domainId] || {};

  // 1. MASTER AGENT: Intent Classification
  onStepUpdate({
    agent: AgentType.MASTER,
    message: 'Analyzing intent...',
    status: 'pending',
    timestamp: Date.now()
  });

  const intentPrompt = `
    You are the Master Intent Agent for ${domain.name}.
    Classify the following user message into one of these categories: ${Object.values(IntentType).join(', ')}.
    
    User Message: "${userMessage}"
  `;
  
  let intent: IntentType = IntentType.UNKNOWN;
  try {
    const intentRes = await ai.models.generateContent({
      model: modelName,
      contents: intentPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: `One of the valid intent categories: ${Object.values(IntentType).join(', ')}`
            }
          },
          required: ['intent']
        }
      }
    });
    
    const intentData = JSON.parse(intentRes.text || '{}');
    const text = intentData.intent || '';
    
    if (Object.values(IntentType).includes(text as IntentType)) {
      intent = text as IntentType;
    } else {
      if (text.toLowerCase().includes('complaint')) intent = IntentType.COMPLAINT;
      else if (text.toLowerCase().includes('feedback')) intent = IntentType.FEEDBACK;
      else if (text.toLowerCase().includes('feature')) intent = IntentType.FEEDBACK;
      else intent = IntentType.QUERY;
    }

    onStepUpdate({
      agent: AgentType.MASTER,
      message: `Identified Intent: ${intent}`,
      status: 'success',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Intent classification failed", error);
    intent = IntentType.QUERY;
  }

  // 2. RISK AGENT: Calculate Score
  onStepUpdate({
    agent: AgentType.RISK,
    message: 'Calculating risk score based on keywords...',
    status: 'pending',
    timestamp: Date.now()
  });

  const { score, level } = calculateRiskScore(userMessage, domain);
  
  onStepUpdate({
    agent: AgentType.RISK,
    message: `Risk Level: ${level} (Score: ${score}/100)`,
    status: level === RiskLevel.CRITICAL || level === RiskLevel.HIGH ? 'warning' : 'success',
    timestamp: Date.now()
  });

  // 3. SLA AGENT: Check Timelines
  onStepUpdate({
    agent: AgentType.SLA,
    message: 'Checking SLA thresholds...',
    status: 'pending',
    timestamp: Date.now()
  });

  const slaStatus = checkSLAStatus(intent, level, domain);
  
  onStepUpdate({
    agent: AgentType.SLA,
    message: slaStatus.breachPredicted 
      ? `WARNING: High probability of SLA breach (<${slaStatus.timeToResolve}h)` 
      : `SLA Status Normal (Target: ${slaStatus.timeToResolve}h)`,
    status: slaStatus.breachPredicted ? 'warning' : 'success',
    timestamp: Date.now()
  });

  // Calculate Teams
  const notifiedTeams = determineNotifiedTeams(intent, level, domainId);

  // 4. GENERATION AGENT: Formulate Response with Context
  // Context Retrieval Simulation
  onStepUpdate({
    agent: AgentType.SYSTEM,
    message: `Routing to: ${notifiedTeams.join(', ')}`,
    status: 'pending',
    timestamp: Date.now()
  });
  
  const systemInstruction = `
    You are a resilient client service bot for ${domain.name}.
    
    SYSTEM CONTEXT (Agent Views):
    - User Intent: ${intent}
    - Risk Level: ${level} (Score: ${score})
    - SLA Target: ${slaStatus.timeToResolve} hours
    - Teams Notified: ${notifiedTeams.join(', ')}
    
    CLIENT DATA (Private):
    ${JSON.stringify(userContext, null, 2)}
    
    INSTRUCTIONS:
    - Use the provided Conversation History to maintain context.
    - Check the CLIENT DATA. If the user refers to a recent transaction, order, or alert (e.g., "my pending transfer", "latest order"), explicitly mention the details (ID, Amount, Status) found in CLIENT DATA to show you have context.
    - If Risk is HIGH or CRITICAL: Apologize profusely, acknowledge the urgency, and assure them that a specialized team has been notified immediately to prevent an SLA breach.
    - If Intent is COMPLAINT: Be empathetic, validate their frustration.
    - Keep responses concise (under 100 words) but helpful.
    - Do NOT mention "Risk Score", "SLA", or internal labels to the user.
    - Generate suggested actions that are relevant to the user's query and context.
  `;

  // Convert history to Gemini Content format
  const chatContents: Content[] = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content } as Part]
  }));

  // Add the current user message
  chatContents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  let finalResponseText = '';
  let suggestedActions: SuggestedAction[] = [];

  try {
    const responseRes = await ai.models.generateContent({
      model: modelName,
      contents: chatContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: {
               type: Type.STRING,
               description: "The helpful natural language response to the user."
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, description: "Action type: 'data' or 'action'" }
                },
                required: ["label", "text", "type"]
              }
            }
          },
          required: ["response"]
        }
      }
    });
    
    const jsonResponse = JSON.parse(responseRes.text || '{}');
    finalResponseText = jsonResponse.response || "I apologize, I am unable to process your request at the moment.";
    if (jsonResponse.suggestedActions && Array.isArray(jsonResponse.suggestedActions)) {
      suggestedActions = jsonResponse.suggestedActions;
    }

  } catch (e) {
    console.error("Generation failed", e);
    finalResponseText = "I encountered a temporary issue processing your request. Please try again.";
  }

  // UPDATE: Mark System agent as success
  onStepUpdate({
    agent: AgentType.SYSTEM,
    message: `Routed to: ${notifiedTeams.join(', ')}`,
    status: 'success',
    timestamp: Date.now()
  });

  // 5. VALIDATION AGENT: Quality Control (Structured Output)
  onStepUpdate({
    agent: AgentType.VALIDATION,
    message: 'Validating response quality...',
    status: 'pending',
    timestamp: Date.now()
  });

  let validationPassed = true;
  let validationReason = "Response meets quality standards.";

  const validationPrompt = `
    You are the Quality Assurance Validation Agent.
    
    Task: Validate the generated response.
    
    IMPORTANT: You have access to "Client Data" below. This data is the source of truth. 
    If the response contains details (Amounts, IDs, Dates, Statuses) that match the Client Data, it is CORRECT. 
    Do NOT flag matching data as hallucinations.
    
    Context:
    - User Query: "${userMessage}"
    - Detected Intent: "${intent}"
    - Risk Level: "${level}"
    - Client Data (Source of Truth): ${JSON.stringify(userContext)}
    - Generated Response: "${finalResponseText}"
    
    Validation Rules:
    1. Relevance: Does the response directly address the user query?
    2. Data Accuracy: If the response includes specific numbers or IDs, do they exist in the "Client Data"? If yes, PASS.
    3. Tone: If Risk is HIGH/CRITICAL, is the tone apologetic and urgent?
    
    Return a JSON object with 'isValid' (boolean) and 'reason' (string).
  `;

  try {
    const validationRes = await ai.models.generateContent({
      model: modelName,
      contents: validationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "Whether the response is safe and appropriate to send."
            },
            reason: {
              type: Type.STRING,
              description: "Brief reason for approval or rejection."
            }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const valData = JSON.parse(validationRes.text || '{}');
    validationPassed = valData.isValid ?? true;
    validationReason = valData.reason || "Validation completed.";

    if (!validationPassed) {
      // In a production system, we would regenerate or route to human.
      // We log the failure via metadata but DO NOT modify the user-facing text string.
      console.warn(`Response validation failed: ${validationReason}`);
    }

  } catch (e) {
    console.error("Validation failed", e);
    // Fail open or closed depending on policy. Here we fail open but log.
    validationReason = "Validation service unavailable.";
  }

  onStepUpdate({
    agent: AgentType.VALIDATION,
    message: validationPassed ? `Verified: ${validationReason}` : `FLAGGED: ${validationReason}`,
    status: validationPassed ? 'success' : 'warning',
    timestamp: Date.now()
  });

  return {
    response: finalResponseText,
    suggestedActions,
    metadata: {
      riskScore: score,
      riskLevel: level,
      slaBreachPredicted: slaStatus.breachPredicted,
      slaTargetHours: slaStatus.timeToResolve,
      slaReason: slaStatus.reason,
      intent: intent,
      domain: domainId,
      notifiedTeams: notifiedTeams,
      validationPassed,
      validationReason
    }
  };
};