import type { Campaign, CampaignStatus, WorkflowStep, WorkflowStepType, WorkflowStepStatus } from '../types';

// ===== State Machine: Valid Transitions =====
const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['executing', 'cancelled'],
  executing: ['paused', 'completed', 'cancelled'],
  paused: ['executing', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  const allowed = validTransitions[from];
  return allowed ? allowed.includes(to) : false;
}

// ===== Default Workflow Steps =====
export const DEFAULT_WORKFLOW_STEPS: Omit<WorkflowStep, 'id' | 'status'>[] = [
  { type: 'audience_selection', label: '圈人' },
  { type: 'plan_review', label: '方案' },
  { type: 'material_approval', label: '物料' },
  { type: 'execution', label: '执行' },
  { type: 'data_review', label: '复盘' },
];

let stepIdCounter = 0;

export function createWorkflowSteps(): WorkflowStep[] {
  return DEFAULT_WORKFLOW_STEPS.map((step, idx) => ({
    ...step,
    id: `ws-${++stepIdCounter}`,
    status: idx === 0 ? ('active' as WorkflowStepStatus) : ('pending' as WorkflowStepStatus),
  }));
}

export function createCampaign(title: string): Campaign {
  return {
    id: `camp-${Date.now()}`,
    title,
    status: 'draft',
    workflowSteps: createWorkflowSteps(),
    createdAt: new Date().toISOString(),
  };
}

export function advanceStep(campaign: Campaign): Campaign {
  const currentIdx = campaign.workflowSteps.findIndex(s => s.status === 'active');
  if (currentIdx === -1 || currentIdx === campaign.workflowSteps.length - 1) return campaign;

  const updatedSteps = campaign.workflowSteps.map((step, idx) => {
    if (idx === currentIdx) return { ...step, status: 'completed' as WorkflowStepStatus };
    if (idx === currentIdx + 1) return { ...step, status: 'active' as WorkflowStepStatus };
    return step;
  });

  return { ...campaign, workflowSteps: updatedSteps };
}

export function setStepStatus(
  campaign: Campaign,
  stepType: WorkflowStepType,
  status: WorkflowStepStatus
): Campaign {
  const updatedSteps = campaign.workflowSteps.map(step =>
    step.type === stepType ? { ...step, status } : step
  );
  return { ...campaign, workflowSteps: updatedSteps };
}

export function getActiveStep(campaign: Campaign): WorkflowStep | undefined {
  return campaign.workflowSteps.find(s => s.status === 'active');
}

export function transitionCampaign(campaign: Campaign, target: CampaignStatus): Campaign {
  if (!canTransition(campaign.status, target)) {
    console.warn(`Invalid transition: ${campaign.status} → ${target}`);
    return campaign;
  }
  return { ...campaign, status: target };
}

// ===== Context Accumulator =====
export interface CampaignTurn {
  userMessage: string;
  aiResponse: string;
  decisions: string[];
  timestamp: string;
}

export interface CampaignContext {
  campaignId: string;
  turns: CampaignTurn[];
  pendingDecisions: string[];
}

const campaignContexts = new Map<string, CampaignContext>();

export function getCampaignContext(campaignId: string): CampaignContext {
  if (!campaignContexts.has(campaignId)) {
    campaignContexts.set(campaignId, { campaignId, turns: [], pendingDecisions: [] });
  }
  return campaignContexts.get(campaignId)!;
}

export function addTurn(campaignId: string, userMsg: string, aiMsg: string): void {
  const ctx = getCampaignContext(campaignId);
  ctx.turns.push({
    userMessage: userMsg,
    aiResponse: aiMsg,
    decisions: [],
    timestamp: new Date().toISOString(),
  });
}

export function addDecision(campaignId: string, decision: string): void {
  const ctx = getCampaignContext(campaignId);
  if (ctx.turns.length > 0) {
    ctx.turns[ctx.turns.length - 1].decisions.push(decision);
  }
}

export function getRecentTurns(campaignId: string, count = 3): CampaignTurn[] {
  const ctx = getCampaignContext(campaignId);
  return ctx.turns.slice(-count);
}

export function clearCampaignContext(campaignId: string): void {
  campaignContexts.delete(campaignId);
}
