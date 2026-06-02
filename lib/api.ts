export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

const API_ORIGIN = /^https?:\/\//i.test(API_BASE_URL) ? API_BASE_URL.replace(/\/api$/, "") : "";

export type BackendTemplateSummary = {
  id: string;
  label: string;
  journal_family: string;
  pdf_compile_supported: boolean;
  strict_pdf_supported: boolean;
  output_mode: string;
  notes: string[];
};

export type ManuscriptAuthorInput = {
  given_name: string;
  family_name: string;
  email?: string | null;
  affiliation_ids: string[];
  is_corresponding?: boolean;
  credit_roles?: string[];
};

export type ManuscriptAffiliationInput = {
  id: string;
  organization: string;
  addressline?: string;
  city?: string;
  postcode?: string;
  state?: string;
  country?: string;
};

export type ManuscriptKeywordInput = {
  value: string;
};

export type ManuscriptReferenceInput = {
  citation_key: string;
  entry_type: "article" | "book" | "misc";
  title: string;
  authors: string;
  journal?: string | null;
  year: string;
  volume?: string | null;
  number?: string | null;
  pages?: string | null;
  doi?: string | null;
};

export type ManuscriptSectionInput = {
  heading: string;
  body: string;
};

export type ManuscriptFigureInput = {
  id: string;
  caption: string;
  label: string;
  image_path?: string | null;
  span: "single" | "double";
};

export type ManuscriptTableInput = {
  id: string;
  caption: string;
  label: string;
  headers: string[];
  rows: string[][];
  span: "single" | "double";
};

export type ManuscriptInput = {
  project_id: string;
  template_id: string;
  title: string;
  short_title: string;
  authors: ManuscriptAuthorInput[];
  affiliations: ManuscriptAffiliationInput[];
  abstract: string;
  highlights: string[];
  keywords: ManuscriptKeywordInput[];
  sections: ManuscriptSectionInput[];
  figures: ManuscriptFigureInput[];
  tables: ManuscriptTableInput[];
  references: ManuscriptReferenceInput[];
};

export type SubmissionExportResult = {
  template_id: string;
  tex_path: string;
  bib_path?: string | null;
  pdf_path?: string | null;
  pdf_url?: string | null;
  work_dir: string;
  compile_attempted: boolean;
  compile_succeeded: boolean;
  logs: string[];
};

export type DraftBlockStyle = Partial<{
  fontFamily: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  textAlign: "left" | "center";
  lineHeight: number;
}>;

export type DraftTextBlock = {
  id: string;
  kind: "text";
  role: "title" | "meta" | "section" | "abstract" | "paragraph";
  placement: "front" | "body";
  span: "single" | "full";
  label?: string | null;
  content: string;
  style?: DraftBlockStyle | null;
};

export type DraftTableBlock = {
  id: string;
  kind: "table";
  placement: "body";
  span: "single" | "full";
  title: string;
  note: string;
  headers: string[];
  rows: string[][];
  style?: DraftBlockStyle | null;
};

export type DraftFigureBlock = {
  id: string;
  kind: "figure";
  placement: "body";
  span: "single" | "full";
  title: string;
  caption: string;
  imageLabel: string;
  widthPercent: number;
  aspectRatio: "wide" | "square" | "tall";
  style?: DraftBlockStyle | null;
};

export type DraftBlock = DraftTextBlock | DraftTableBlock | DraftFigureBlock;

export type WorkspaceDraftPayload = {
  selectedTemplate: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  blocks: DraftBlock[];
  savedAt: string;
  sourceDatasetName?: string | null;
  sourceReferenceName?: string | null;
  message?: string | null;
  chatHistory?: Array<{ id: string; content: string; createdAt: string }>;
  exportResult?: SubmissionExportResult | null;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
};

export type GeneratedDatasetProfile = {
  filename: string;
  filetype: string;
  size_bytes: number;
  column_count: number;
  row_count_estimate?: number | null;
  columns: string[];
  detected_direction: string;
  candidate_modalities: string[];
  candidate_tasks: string[];
};

export type GeneratedPattern = {
  article_category: string;
  article_level: "Level 1" | "Level 2";
  recommended_task_type: string;
  rationale: string[];
  outline_source: string;
  methodology_source: string;
  anti_template_source: string;
};

export type DatasetGovernance = {
  source_description: string;
  collection_method: string;
  expected_problem: string;
  compliance_level: "high" | "medium" | "low";
  judgement: string;
  risks: string[];
  recommendations: string[];
};

export type DatasetQualityGate = {
  score: number;
  tier: "block" | "review" | "pass";
  action: "blocked" | "needs_confirmation" | "auto_generate";
  label: string;
  decision: string;
  data_grade?: "D" | "C" | "B" | "A" | "S" | null;
  thresholds: Record<string, number>;
  reasons: string[];
  recommendations: string[];
  sample_size?: number | null;
  positive_count?: number | null;
  negative_count?: number | null;
  feature_count?: number | null;
  target_name?: string | null;
  composite_auc?: number | null;
};

export type FigurePromptOption = {
  id: "workflow" | "model_pipeline" | "statistical_summary" | "clinical_pathway";
  label: string;
  description: string;
  prompt_focus: string;
};

export type PdfSelfTestResult = {
  all_compile_succeeded: boolean;
  results: SubmissionExportResult[];
};

export class DataQualityGateError extends Error {
  qualityGate: DatasetQualityGate;

  constructor(qualityGate: DatasetQualityGate) {
    super(qualityGate.label);
    this.name = "DataQualityGateError";
    this.qualityGate = qualityGate;
  }
}

export type RagContext = {
  chunk_id: string;
  title: string;
  source_path: string;
  source_type: string;
  collection: string;
  heading?: string | null;
  score: number;
  excerpt: string;
};

export type AgentSkillRoute = {
  skill_name: string;
  reason: string;
  source_path?: string | null;
  reference_path?: string | null;
  priority: number;
};

export type AgentWorkflowStage = {
  stage_id: string;
  stage_name: string;
  agent_id: string;
  objective: string;
  skill_names: string[];
  guardrails: string[];
  retrieved_contexts: RagContext[];
};

export type AgentWorkflowPlan = {
  category: string;
  problem_type: string;
  data_grade: "D" | "C" | "B" | "A" | "S";
  outline_level: string;
  route: AgentSkillRoute[];
  stages: AgentWorkflowStage[];
  missing_inputs: string[];
  upgrade_path: string[];
  rag_index_built_at?: string | null;
};

export type KnowledgeIndexStats = {
  index_path: string;
  built_at?: string | null;
  document_count: number;
  chunk_count: number;
  collections: Record<string, number>;
  source_types: Record<string, number>;
};

export type KnowledgeSearchHit = RagContext & {
  doc_id: string;
  metadata?: Record<string, unknown>;
};

export type GenerateDraftResponse = {
  project_id: string;
  draft: WorkspaceDraftPayload;
  manuscript: ManuscriptInput;
  dataset_profile: GeneratedDatasetProfile;
  pattern: GeneratedPattern;
  governance: DatasetGovernance;
  quality_gate: DatasetQualityGate;
  agent_plan?: AgentWorkflowPlan | null;
  export_result: SubmissionExportResult;
  llm_used?: boolean;
  llm_provider?: string | null;
  llm_error?: string | null;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (
      response.status === 422 &&
      payload &&
      typeof payload === "object" &&
      "detail" in payload &&
      payload.detail &&
      typeof payload.detail === "object" &&
      "code" in payload.detail &&
      payload.detail.code === "DATA_QUALITY_GATE" &&
      "quality_gate" in payload.detail
    ) {
      throw new DataQualityGateError(payload.detail.quality_gate as DatasetQualityGate);
    }

    const detail =
      payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string"
        ? payload.detail
        : `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return payload as T;
}

export async function fetchTemplateRegistry(): Promise<BackendTemplateSummary[]> {
  const response = await fetch(`${API_BASE_URL}/templates`, {
    method: "GET",
    cache: "no-store"
  });
  return parseApiResponse<BackendTemplateSummary[]>(response);
}

export async function runPdfSelfTest(): Promise<PdfSelfTestResult> {
  const response = await fetch(`${API_BASE_URL}/templates/pdf-self-test`, {
    method: "POST"
  });
  return parseApiResponse<PdfSelfTestResult>(response);
}

export async function fetchFigurePromptOptions(): Promise<FigurePromptOption[]> {
  const response = await fetch(`${API_BASE_URL}/ai/figure-prompt-options`, {
    method: "GET",
    cache: "no-store"
  });
  return parseApiResponse<FigurePromptOption[]>(response);
}

export async function exportSubmissionPdf(payload: ManuscriptInput): Promise<SubmissionExportResult> {
  const response = await fetch(`${API_BASE_URL}/exports/submission-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseApiResponse<SubmissionExportResult>(response);
}

export async function generateDraftWithDataset(input: {
  prompt: string;
  selectedTemplate: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  dataSource: string;
  collectionMethod: string;
  expectedProblem: string;
  datasetFile: File;
  referenceFile?: File | null;
  figurePromptStyle?: FigurePromptOption["id"];
  forceGenerate?: boolean;
}): Promise<GenerateDraftResponse> {
  const formData = new FormData();
  formData.append("prompt", input.prompt);
  formData.append("selected_template", input.selectedTemplate);
  formData.append("data_source", input.dataSource);
  formData.append("collection_method", input.collectionMethod);
  formData.append("expected_problem", input.expectedProblem);
  formData.append("figure_prompt_style", input.figurePromptStyle ?? "workflow");
  formData.append("force_generate", input.forceGenerate ? "true" : "false");
  formData.append("dataset_file", input.datasetFile);
  if (input.referenceFile) {
    formData.append("reference_file", input.referenceFile);
  }

  const response = await fetch(`${API_BASE_URL}/ai/generate-draft`, {
    method: "POST",
    body: formData,
  });

  return parseApiResponse<GenerateDraftResponse>(response);
}

export async function fetchKnowledgeIndexStats(): Promise<KnowledgeIndexStats> {
  const response = await fetch(`${API_BASE_URL}/agents/knowledge-index`, {
    method: "GET",
    cache: "no-store"
  });
  return parseApiResponse<KnowledgeIndexStats>(response);
}

export async function rebuildKnowledgeIndex(): Promise<KnowledgeIndexStats> {
  const response = await fetch(`${API_BASE_URL}/agents/knowledge-index/rebuild`, {
    method: "POST"
  });
  return parseApiResponse<KnowledgeIndexStats>(response);
}

export async function searchKnowledge(input: {
  query: string;
  topK?: number;
  collections?: string[];
  sourceTypes?: string[];
}): Promise<{ query: string; hits: KnowledgeSearchHit[] }> {
  const response = await fetch(`${API_BASE_URL}/agents/knowledge/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: input.query,
      top_k: input.topK ?? 8,
      collections: input.collections,
      source_types: input.sourceTypes
    })
  });
  return parseApiResponse<{ query: string; hits: KnowledgeSearchHit[] }>(response);
}

export async function planAgentWorkflow(input: {
  prompt: string;
  selectedTemplate?: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  datasetColumns?: string[];
  detectedDirection?: string;
  candidateModalities?: string[];
  candidateTasks?: string[];
  rowCountEstimate?: number | null;
  dataSource?: string;
  collectionMethod?: string;
  expectedProblem?: string;
  sampleSize?: number | null;
  positiveCount?: number | null;
  negativeCount?: number | null;
  validation?: string | null;
  metrics?: string[];
  referenceHint?: string | null;
}): Promise<AgentWorkflowPlan> {
  const response = await fetch(`${API_BASE_URL}/agents/workflow/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: input.prompt,
      selected_template: input.selectedTemplate,
      dataset_columns: input.datasetColumns ?? [],
      detected_direction: input.detectedDirection,
      candidate_modalities: input.candidateModalities ?? [],
      candidate_tasks: input.candidateTasks ?? [],
      row_count_estimate: input.rowCountEstimate,
      data_source: input.dataSource ?? "",
      collection_method: input.collectionMethod ?? "",
      expected_problem: input.expectedProblem ?? "",
      sample_size: input.sampleSize,
      positive_count: input.positiveCount,
      negative_count: input.negativeCount,
      validation: input.validation,
      metrics: input.metrics ?? [],
      reference_hint: input.referenceHint
    })
  });
  return parseApiResponse<AgentWorkflowPlan>(response);
}

export function toAbsoluteApiUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_ORIGIN}${path}`;
  }

  return `${API_ORIGIN}/${path}`;
}
