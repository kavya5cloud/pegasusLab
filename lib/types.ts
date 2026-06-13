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
}

export interface Blueprint {
  summary: string;
  techStack: string[];
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  gaps: Gap[];
}

/** A card on the project whiteboard. */
export type ItemKind = "idea" | "code" | "github" | "figma" | "image" | "doc";

export interface BoardItem {
  id: string;
  kind: ItemKind;
  title: string;
  /** Text content; for github/figma cards this is the URL, for images a caption. */
  content: string;
  /** Base64 data URL for image cards. */
  dataUrl?: string;
  x: number;
  y: number;
}

/** Code produced for one gap, kept so the build can be shipped. */
export interface GeneratedArtifact {
  id: string;
  gapId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  items: BoardItem[];
  blueprint: Blueprint | null;
  generated?: GeneratedArtifact[];
  demo?: boolean;
  /** Session identifier (email) of the owner; "demo" for unauthenticated use. */
  owner?: string;
  createdAt: string;
  updatedAt: string;
}
