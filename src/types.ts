// ===== Message =====
export type ActionType = 'confirm' | 'modify' | 'regenerate' | 'approve' | 'reject' | 'pause' | 'resume' | 'viewDetails' | 'export' | 'retry' | 'adjust';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionType?: ActionType;
  /** @deprecated use actionType instead */
  actionable?: boolean;
}

// ===== Marketing Journey State Machine =====
// 用户全链路行为状态机，从对话起步到复盘结束
export type JourneyStage =
  | 'clarifying'         // 需求澄清中
  | 'plan_generated'     // 方案已生成
  | 'plan_confirmed'     // 方案已确认
  | 'audience_ready'     // 人群表已生成
  | 'material_ready'     // 话术已就绪
  | 'config_submitted'   // 配置已提交
  | 'executing'          // 投放中
  | 'paused'             // 已暂停
  | 'completed'          // 投放已完成
  | 'reviewed'           // 已复盘
  | 'cancelled';         // 已终止

// ===== Conversation =====
export interface Conversation {
  id: string;
  title: string;
  date: string;
  preview: string;
  stage?: JourneyStage;  // 对话在全链路中的当前阶段
  channel?: DeliveryChannel; // 可选，如果已明确渠道
  audienceSize?: string;     // 可选，如果已明确人群量级
}

// ===== Delivery Record (team-shared campaign records) =====
export type DeliveryChannel = 'outbound_call' | 'sms';
export type DeliveryStatus = 'draft' | 'approving' | 'executing' | 'completed' | 'paused' | 'cancelled';

export interface PerformanceMetric {
  label: string;
  value: string | number;
  unit?: string;
}

export interface FunnelStep {
  label: string;
  value: number;
  rate: string;
}

export interface TargetComparison {
  metric: string;
  expected: string;
  actual: string;
  achievement: string;
}

export interface TrendPoint {
  day: string;
  value: number;
}

export interface PerformanceData {
  metrics: PerformanceMetric[];
  funnel: FunnelStep[];
  comparison: TargetComparison[];
  trends: { label: string; points: TrendPoint[]; unit: string }[];
  aiSummary: string;
}

export interface PlanSnapshot {
  background: string;
  audienceStrategy: { conditions: string; finalCount: string; source: string };
  outboundStrategy: string[];
  callScript: { section: string; content: string }[];
  roiCalculation: { item: string; value: string }[];
}

export interface ConfigTable {
  headers: string[];
  rows: string[][];
}

export interface ConfigField {
  label: string;
  value: string;
  table?: ConfigTable;
  badge?: string;
}

export interface ConfigSection {
  title: string;
  fields: ConfigField[];
}

export interface DeliveryConfig {
  sections: ConfigSection[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export interface DeliveryRecord {
  id: string;
  title: string;
  status: DeliveryStatus;
  stage?: JourneyStage; // 全链路阶段标签，未提供时从 status 推导
  date: string;
  dateRange: string;
  preview: string;
  owner: string;
  channel: DeliveryChannel;
  audienceSize: string;
  roi?: number;
  progress?: number;
  performance?: PerformanceData;
  planSnapshot?: PlanSnapshot;
  config?: DeliveryConfig;
  chatHistory?: ChatTurn[];
}

// ===== Campaign =====
export type CampaignStatus = 'draft' | 'confirmed' | 'executing' | 'paused' | 'completed' | 'cancelled';

export type WorkflowStepType = 'audience_selection' | 'plan_review' | 'material_approval' | 'execution' | 'data_review';

export type WorkflowStepStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  label: string;
  status: WorkflowStepStatus;
}

export interface Campaign {
  id: string;
  title: string;
  status: CampaignStatus;
  workflowSteps: WorkflowStep[];
  createdAt: string;
  summary?: string;
}

// ===== Intent =====
export type IntentType =
  | 'create_new'
  | 'modify_existing'
  | 'query_data'
  | 'emergency_action'
  | 'explore'
  | 'single_skill'
  | 'adjust_campaign'
  | 'compare'
  | 'report'
  | 'onboarding';

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  urgency: boolean;
  entities: Record<string, string>;
}

// ===== AI Response =====
export interface AIResponseResult {
  message: string;
  panelType: PanelType;
  panelContent: PanelContent;
  actionType: ActionType | null;
}

// ===== Skill =====
export interface Skill {
  id: string;
  name: string;
  description: string;
  tools: string[];
}

// ===== Panel =====
export type PanelType = 'plan' | 'audience' | 'data' | 'outbound' | 'comparison' | 'report' | 'onboarding' | 'error' | null;

export interface PlanPanelContent {
  kind: 'plan';
  background: string;
  audienceStrategy: string;
  outboundStrategy: string;
  callScripts: string;
  roiCalculation: string;
  expectedResults: string;
}

export interface AudiencePanelContent {
  kind: 'audience';
  segments: AudienceSegment[];
}

export interface AudienceSegment {
  name: string;
  priority: '最高' | '高' | '中';
  conditions: Array<{ dimension: string; condition: string }>;
  estimatedVolume: string;
}

export interface DataPanelContent {
  kind: 'data';
  metrics: DataMetric[];
  summary: string;
}

export interface DataMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface OutboundPanelContent {
  kind: 'outbound';
  schedule: string;
  concurrency: string;
  channels: string[];
}

export interface ComparisonPanelContent {
  kind: 'comparison';
  plans: Array<{
    name: string;
    audience: string;
    cost: string;
    roi: string;
    pros: string[];
    cons: string[];
  }>;
}

export interface ReportPanelContent {
  kind: 'report';
  summary: string;
  metrics: DataMetric[];
  insights: string[];
}

export interface OnboardingPanelContent {
  kind: 'onboarding';
  steps: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface ErrorPanelContent {
  kind: 'error';
  title: string;
  message: string;
  recoverable: boolean;
  suggestions: string[];
}

export type PanelContent = PlanPanelContent | AudiencePanelContent | DataPanelContent | OutboundPanelContent | ComparisonPanelContent | ReportPanelContent | OnboardingPanelContent | ErrorPanelContent | null;
