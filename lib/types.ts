// ─── Core graph types (retained) ──────────────────────────────────────────────

export type NodeType =
  | "page"
  | "component"
  | "api"
  | "service"
  | "database"
  | "external"
  | "design"
  | "doc";

export type NodeStatus = "existing" | "partial" | "missing";

export interface BlueprintNode {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  description: string;
  tech?: string;
}

export interface BlueprintEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status: NodeStatus;
}

export type GapSeverity = "critical" | "high" | "medium" | "low";

export type GapCategory =
  | "missing-feature"
  | "integration"
  | "architecture"
  | "security"
  | "data"
  | "ux";

export interface Gap {
  id: string;
  title: string;
  severity: GapSeverity;
  category: GapCategory;
  description: string;
  recommendation: string;
  relatedNodeIds: string[];
  /** Set once code has been generated to close this gap. */
  resolved?: boolean;
}

// ─── Intelligence Routing ──────────────────────────────────────────────────────

/** Each distinct cognitive task Pegasus performs is routed to the best model. */
export type TaskType =
  | "understand"       // Parse intent from mixed, messy inputs
  | "architecture"     // Design systems, generate blueprint
  | "design-analysis"  // Analyse Figma / screenshots
  | "codegen"          // Generate implementation code
  | "testing"          // Generate test code
  | "docs"             // Generate documentation
  | "validate"         // Check output against blueprint
  | "chat";            // Conversational assistance

// ─── Project Memory ───────────────────────────────────────────────────────────

export interface MemoryDecision {
  topic: string;
  decision: string;
  rationale: string;
}

/** Continuously updated store of project understanding — the single source of truth. */
export interface ProjectMemory {
  corePurpose: string;
  targetUsers: string[];
  keyConstraints: string[];
  technicalDecisions: MemoryDecision[];
  openQuestions: string[];
}

// ─── Context Graph ────────────────────────────────────────────────────────────

export interface ContextGraphNode {
  id: string;
  type: "requirement" | "design" | "api" | "database" | "userflow" | "code" | "component" | "service";
  label: string;
  /** Where this node originated (board item id, uploaded file name, etc.) */
  sourceId?: string;
}

export interface ContextLink {
  from: string;
  to: string;
  relation: string; // e.g. "implements", "reads-from", "calls", "validates"
}

/** Connects requirements → designs → APIs → DB entities → user flows → generated code. */
export interface ContextGraph {
  nodes: ContextGraphNode[];
  links: ContextLink[];
}

// ─── Product Blueprint — 10 sections ─────────────────────────────────────────

export interface PrdFeature {
  name: string;
  description: string;
  priority: "must-have" | "should-have" | "nice-to-have";
}

export interface PRD {
  vision: string;
  problemStatement: string;
  targetUsers: string[];
  coreFeatures: PrdFeature[];
  nonGoals: string[];
  successMetrics: string[];
}

export interface UserFlow {
  id: string;
  name: string;
  actor: string;
  steps: string[];
  outcome: string;
}

export interface DbField {
  name: string;
  type: string;
  constraints: string;
}

export interface DbEntity {
  name: string;
  fields: DbField[];
}

export interface DbRelationship {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
  via?: string;
}

export interface DatabaseSchema {
  engine: string;
  entities: DbEntity[];
  relationships: DbRelationship[];
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
}

export interface ApiArchitecture {
  style: "REST" | "GraphQL" | "gRPC" | "tRPC";
  authStrategy: string;
  endpoints: ApiEndpoint[];
  rateLimitingNotes: string;
}

export interface FrontendArchitecture {
  framework: string;
  stateManagement: string;
  routing: string;
  designSystem: string;
  keyComponents: string[];
}

export interface BackendService {
  name: string;
  responsibility: string;
  tech: string;
}

export interface BackendArchitecture {
  pattern: "monolith" | "microservices" | "serverless" | "hybrid";
  services: BackendService[];
  scalingNotes: string;
}

export interface InfraService {
  name: string;
  purpose: string;
}

export interface InfrastructurePlan {
  provider: string;
  services: InfraService[];
  estimatedMonthlyCost: string;
  scalingApproach: string;
}

export interface CicdPipeline {
  provider: string;
  stages: string[];
  deploymentStrategy: string;
  environments: string[];
}

export interface TestingStrategy {
  unit: string;
  integrationScenarios: string[];
  e2eScenarios: string[];
  performanceTargets: string;
}

export interface DeploymentEnvironment {
  name: string;
  config: string;
}

export interface DeploymentPlan {
  environments: DeploymentEnvironment[];
  rolloutStrategy: string;
  monitoring: string;
  rollbackPlan: string;
}

// ─── Blueprint — unified structure ───────────────────────────────────────────

export interface Blueprint {
  // Core architectural graph — always present
  summary: string;
  techStack: string[];
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  gaps: Gap[];

  // Product Blueprint sections — populated by the new context orchestration engine
  // Optional so existing projects remain valid without migration.
  prd?: PRD;
  userFlows?: UserFlow[];
  databaseSchema?: DatabaseSchema;
  apiArchitecture?: ApiArchitecture;
  frontendArchitecture?: FrontendArchitecture;
  backendArchitecture?: BackendArchitecture;
  infrastructurePlan?: InfrastructurePlan;
  cicdPipeline?: CicdPipeline;
  testingStrategy?: TestingStrategy;
  deploymentPlan?: DeploymentPlan;

  // Project Memory — continuously updated understanding
  memory?: ProjectMemory;

  // Context Graph — connects all artefacts
  contextGraph?: ContextGraph;
}

// ─── Board ────────────────────────────────────────────────────────────────────

/** All input types Pegasus can accept on the whiteboard */
export type ItemKind =
  | "idea"           // Text requirement / user story
  | "code"           // Code snippet
  | "github"         // GitHub repository URL
  | "figma"          // Figma file URL
  | "image"          // Screenshot or inspiration image
  | "doc"            // Document / specification
  | "voice"          // Voice note (transcribed)
  | "requirement"    // Formal requirement
  | "api"            // API spec (OpenAPI / Postman)
  | "database"       // DB schema / ERD
  | "conversation";  // AI conversation / chat export

export interface BoardItem {
  id: string;
  kind: ItemKind;
  title: string;
  /** Text content; for github/figma cards this is the URL; for images, a caption. */
  content: string;
  /** Base64 data URL for image cards. */
  dataUrl?: string;
  x: number;
  y: number;
}

// ─── Generated Artifacts ─────────────────────────────────────────────────────

/** Code produced for one gap — blueprint-validated before implementation. */
export interface GeneratedArtifact {
  id: string;
  gapId: string;
  title: string;
  content: string;
  /** Which blueprint sections this artifact satisfies */
  satisfies?: string[];
  /** Whether this was validated against the Product Blueprint before generation */
  blueprintValidated?: boolean;
  createdAt: string;
}

// ─── Generated website ────────────────────────────────────────────────────────

export interface SitePlanFile {
  /** Path relative to the project root, e.g. "src/pages/Home.jsx" */
  path: string;
  /** One-line spec of what this file contains */
  purpose: string;
}

export interface SiteFile {
  path: string;
  code: string;
}

export interface GeneratedSite {
  plan: SitePlanFile[];
  files: SiteFile[];
  generatedAt: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  items: BoardItem[];
  blueprint: Blueprint | null;
  generated?: GeneratedArtifact[];
  site?: GeneratedSite;
  demo?: boolean;
  owner?: string;
  shareId?: string;
  createdAt: string;
  updatedAt: string;
}
