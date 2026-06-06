import { readStoredAuthUser } from "@/lib/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001/api";

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
  english_title?: string | null;
  short_title: string;
  authors: ManuscriptAuthorInput[];
  affiliations: ManuscriptAffiliationInput[];
  abstract: string;
  chinese_abstract?: string | null;
  english_abstract?: string | null;
  chinese_keywords?: string[];
  english_keywords?: string[];
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

export type UploadedMaterialFile = {
  original_name: string;
  saved_path: string;
  filetype: string;
  role: string;
  size_bytes: number;
  usable: boolean;
  summary: string;
  warnings: string[];
};

export type MaterialAssessment = {
  decision: string;
  ready: boolean;
  score: number;
  label: string;
  primary_dataset_path?: string | null;
  primary_dataset_name?: string | null;
  reference_file_path?: string | null;
  reference_file_name?: string | null;
  data_source: string;
  collection_method: string;
  expected_problem: string;
  inferred_fields?: Record<string, string>;
  extracted_reference_hint?: string | null;
  files: UploadedMaterialFile[];
  reasons: string[];
  missing_items: string[];
  recommendations: string[];
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
  column_display_names?: Record<string, string>;
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
  id: string;
  label: string;
  description: string;
  prompt_focus: string;
  prompt_en?: string;
  prompt_zh?: string;
  suitable_for?: Array<{ language: "EN" | "中"; label: string }>;
};

export type PromptOptimizationResponse = {
  prompt: string;
  used_llm: boolean;
  provider?: string | null;
  missing_items: string[];
  rationale: string[];
};

export type WorkflowArtifact = {
  stage_id: string;
  stage_name: string;
  status: "llm_generated" | "fallback_generated" | "validated" | string;
  artifact_format: "json" | "markdown" | "text" | string;
  source_contexts: string[];
  content: string;
};

export type UsageQuota = {
  user_id: string;
  free_total: number;
  free_used: number;
  paid_credits: number;
  price_cny_per_use: number;
  remaining_free: number;
  remaining_total: number;
  payment_required: boolean;
};

export type BillingOrder = {
  order_id: string;
  user_id: string;
  amount_cny: number;
  credits: number;
  status: string;
  message: string;
};

export type AuthUserSession = {
  user_id: string;
  email: string;
  auth_token: string;
  created_at: string;
  last_login_at: string;
  quota?: UsageQuota;
};

export type EmailCodeDelivery = {
  email: string;
  request_id: string;
  expires_at: string;
  delivered: boolean;
  message: string;
  dev_code?: string;
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

export class MaterialQualityGateError extends Error {
  materialGate: MaterialAssessment;

  constructor(materialGate: MaterialAssessment) {
    super(materialGate.label);
    this.name = "MaterialQualityGateError";
    this.materialGate = materialGate;
  }
}

export class PaymentRequiredError extends Error {
  quota: UsageQuota;

  constructor(quota: UsageQuota) {
    super("Payment required");
    this.name = "PaymentRequiredError";
    this.quota = quota;
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
  required_inputs?: string[];
  outputs?: string[];
  guardrails: string[];
  retrieval_query?: string;
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
  workflow_artifacts?: WorkflowArtifact[];
  export_result: SubmissionExportResult;
  llm_used?: boolean;
  llm_provider?: string | null;
  llm_error?: string | null;
  billing_quota?: UsageQuota;
};

export type GenerateDraftJobSubmission = {
  job_id: string;
  status: "queued";
  created_at: string;
};

export type GenerateDraftJobStatus = {
  job_id: string;
  status: "queued" | "running" | "succeeded";
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  progress?: {
    stage_id: string;
    stage_name: string;
    percent: number;
    message: string;
    thoughts: string[];
    updated_at: string;
  } | null;
  result?: GenerateDraftResponse | null;
  error_status?: number | null;
  error_detail?: unknown;
};

export type ProjectSummary = {
  project_id: string;
  user_id?: string;
  title: string;
  template_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  source_file_count: number;
  pdf_url?: string | null;
  compile_succeeded?: boolean | null;
};

export type ProjectRecord = ProjectSummary & {
  source_files: UploadedMaterialFile[];
  draft?: WorkspaceDraftPayload | null;
  manuscript?: ManuscriptInput | null;
  export_result?: SubmissionExportResult | null;
  material_assessment?: MaterialAssessment | null;
  workflow_artifacts?: WorkflowArtifact[];
};

export type ProjectStep = {
  step_id: string;
  step_name: string;
  status: string;
  artifact_format: string;
  source_contexts?: string[];
  summary: string;
  content?: unknown;
  order: number;
  runnable: boolean;
};

export type ProjectStepAction = {
  step_id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type ProjectStepsResponse = {
  project_id: string;
  steps: ProjectStep[];
  available_actions: ProjectStepAction[];
};

export type ProjectStepRunResponse = {
  step_id: string;
  step_name: string;
  status: string;
  artifact_format: string;
  content: unknown;
  summary: string;
};

export async function sendEmailLoginCode(input: { email: string }): Promise<EmailCodeDelivery> {
  const response = await fetch(`${API_BASE_URL}/auth/send-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: input.email })
  });
  return parseApiResponse<EmailCodeDelivery>(response);
}

export async function verifyEmailLoginCode(input: { email: string; code: string }): Promise<AuthUserSession> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      code: input.code
    })
  });
  return parseApiResponse<AuthUserSession>(response);
}

export async function loginWithPassword(input: { email: string; password: string }): Promise<AuthUserSession> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password
    })
  });
  return parseApiResponse<AuthUserSession>(response);
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  passwordConfirm: string;
  turnstileToken: string;
}): Promise<AuthUserSession> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      password_confirm: input.passwordConfirm,
      turnstile_token: input.turnstileToken
    })
  });
  return parseApiResponse<AuthUserSession>(response);
}

function authHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const user = readStoredAuthUser();
  if (!user?.auth_token) {
    return headers;
  }
  return {
    ...headers,
    Authorization: `Bearer ${user.auth_token}`
  };
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throwApiError(response.status, payload);
  }

  return payload as T;
}

function throwApiError(status: number, payload: unknown): never {
  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? (payload as { detail?: unknown }).detail
      : payload;

  if (
    status === 422 &&
    detail &&
    typeof detail === "object" &&
    "code" in detail &&
    detail.code === "DATA_QUALITY_GATE" &&
    "quality_gate" in detail
  ) {
    throw new DataQualityGateError(detail.quality_gate as DatasetQualityGate);
  }
  if (
    status === 422 &&
    detail &&
    typeof detail === "object" &&
    "code" in detail &&
    detail.code === "MATERIAL_QUALITY_GATE" &&
    "material_gate" in detail
  ) {
    throw new MaterialQualityGateError(detail.material_gate as MaterialAssessment);
  }
  if (
    status === 402 &&
    detail &&
    typeof detail === "object" &&
    "code" in detail &&
    detail.code === "PAYMENT_REQUIRED" &&
    "quota" in detail
  ) {
    throw new PaymentRequiredError(detail.quota as UsageQuota);
  }

  const message =
    typeof detail === "string"
      ? detail
      : detail
        ? JSON.stringify(detail)
        : `Request failed with status ${status}`;
  throw new Error(message);
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

export async function optimizeGenerationPrompt(input: {
  prompt?: string;
  selectedTemplate: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  dataSource?: string;
  collectionMethod?: string;
  expectedProblem?: string;
  supplementalInfo?: string;
  uploadedFiles?: string[];
  materialAssessment?: MaterialAssessment | null;
}): Promise<PromptOptimizationResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/optimize-prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: input.prompt ?? "",
      selected_template: input.selectedTemplate,
      data_source: input.dataSource ?? "",
      collection_method: input.collectionMethod ?? "",
      expected_problem: input.expectedProblem ?? "",
      supplemental_info: input.supplementalInfo ?? "",
      uploaded_files: input.uploadedFiles ?? [],
      material_assessment: input.materialAssessment ?? null
    })
  });
  return parseApiResponse<PromptOptimizationResponse>(response);
}

export async function fetchUsageQuota(userId: string): Promise<UsageQuota> {
  const response = await fetch(`${API_BASE_URL}/billing/quota?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    cache: "no-store"
  });
  return parseApiResponse<UsageQuota>(response);
}

export async function createBillingOrder(input: { userId: string; credits?: number }): Promise<BillingOrder> {
  const response = await fetch(`${API_BASE_URL}/billing/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: input.userId,
      credits: input.credits ?? 1
    })
  });
  return parseApiResponse<BillingOrder>(response);
}

export async function assessUploadedMaterials(input: {
  prompt?: string;
  selectedTemplate: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  files: File[];
  dataSource?: string;
  collectionMethod?: string;
  expectedProblem?: string;
  supplementalInfo?: string;
}): Promise<MaterialAssessment> {
  const formData = new FormData();
  formData.append("prompt", input.prompt ?? "");
  formData.append("selected_template", input.selectedTemplate);
  formData.append("data_source", input.dataSource ?? "");
  formData.append("collection_method", input.collectionMethod ?? "");
  formData.append("expected_problem", input.expectedProblem ?? "");
  formData.append("supplemental_info", input.supplementalInfo ?? "");
  for (const file of input.files) {
    appendUploadFile(formData, "files", file);
  }

  const response = await fetch(`${API_BASE_URL}/ai/assess-materials`, {
    method: "POST",
    body: formData
  });
  return parseApiResponse<MaterialAssessment>(response);
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
  userId?: string;
  outputName?: string;
  dataSource: string;
  collectionMethod: string;
  expectedProblem: string;
  datasetFile?: File | null;
  referenceFile?: File | null;
  files?: File[];
  supplementalInfo?: string;
  figurePromptStyle?: string;
  forceGenerate?: boolean;
}): Promise<GenerateDraftResponse> {
  const formData = buildGenerateDraftFormData(input);

  const response = await fetch(`${API_BASE_URL}/ai/generate-draft`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  return parseApiResponse<GenerateDraftResponse>(response);
}

export async function submitGenerateDraftJob(input: {
  prompt: string;
  selectedTemplate: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  userId?: string;
  outputName?: string;
  dataSource: string;
  collectionMethod: string;
  expectedProblem: string;
  datasetFile?: File | null;
  referenceFile?: File | null;
  files?: File[];
  supplementalInfo?: string;
  figurePromptStyle?: string;
  forceGenerate?: boolean;
}): Promise<GenerateDraftJobSubmission> {
  const formData = buildGenerateDraftFormData(input);

  const response = await fetch(`${API_BASE_URL}/ai/generate-draft/jobs`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  return parseApiResponse<GenerateDraftJobSubmission>(response);
}

export async function fetchGenerateDraftJob(jobId: string): Promise<GenerateDraftJobStatus> {
  const response = await fetch(`${API_BASE_URL}/ai/generate-draft/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store"
  });
  const job = await parseApiResponse<GenerateDraftJobStatus | (Omit<GenerateDraftJobStatus, "status"> & { status: "failed" })>(response);
  if (job.status === "failed") {
    throwApiError(job.error_status ?? 500, { detail: job.error_detail ?? "Draft generation failed" });
  }
  return job;
}

function buildGenerateDraftFormData(input: {
  prompt: string;
  selectedTemplate: "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
  userId?: string;
  outputName?: string;
  dataSource: string;
  collectionMethod: string;
  expectedProblem: string;
  datasetFile?: File | null;
  referenceFile?: File | null;
  files?: File[];
  supplementalInfo?: string;
  figurePromptStyle?: string;
  forceGenerate?: boolean;
}) {
  const formData = new FormData();
  formData.append("prompt", input.prompt);
  formData.append("selected_template", input.selectedTemplate);
  formData.append("user_id", input.userId ?? "local-registered-user");
  formData.append("output_name", input.outputName ?? "");
  formData.append("data_source", input.dataSource);
  formData.append("collection_method", input.collectionMethod);
  formData.append("expected_problem", input.expectedProblem);
  formData.append("supplemental_info", input.supplementalInfo ?? "");
  formData.append("figure_prompt_style", input.figurePromptStyle ?? "journal_minimal");
  formData.append("force_generate", input.forceGenerate ? "true" : "false");
  for (const file of input.files ?? []) {
    appendUploadFile(formData, "files", file);
  }
  if (input.datasetFile) {
    appendUploadFile(formData, "dataset_file", input.datasetFile);
  }
  if (input.referenceFile) {
    appendUploadFile(formData, "reference_file", input.referenceFile);
  }
  return formData;
}

function appendUploadFile(formData: FormData, fieldName: string, file: File) {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  formData.append(fieldName, file, relativePath || file.name);
}

export async function fetchProjects(userId?: string): Promise<ProjectSummary[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`${API_BASE_URL}/projects${query}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store"
  });
  const payload = await parseApiResponse<{ projects: ProjectSummary[] }>(response);
  return payload.projects;
}

export async function fetchProject(projectId: string): Promise<ProjectRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store"
  });
  return parseApiResponse<ProjectRecord>(response);
}

export async function fetchProjectSteps(projectId: string): Promise<ProjectStepsResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/steps`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store"
  });
  return parseApiResponse<ProjectStepsResponse>(response);
}

export async function runProjectStep(
  projectId: string,
  stepId: string,
  payload?: {
    prompt?: string;
    supplementalInfo?: string;
    dataSource?: string;
    collectionMethod?: string;
    expectedProblem?: string;
  }
): Promise<ProjectStepRunResponse> {
  const response = await fetch(
    `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/steps/${encodeURIComponent(stepId)}/run`,
    {
      method: "POST",
      headers: authHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        prompt: payload?.prompt ?? null,
        supplemental_info: payload?.supplementalInfo ?? "",
        data_source: payload?.dataSource ?? null,
        collection_method: payload?.collectionMethod ?? null,
        expected_problem: payload?.expectedProblem ?? null
      })
    }
  );
  return parseApiResponse<ProjectStepRunResponse>(response);
}

export async function saveProjectWorkspace(
  projectId: string,
  payload: {
    draft: WorkspaceDraftPayload;
    manuscript: ManuscriptInput;
    exportResult?: SubmissionExportResult | null;
    status?: string;
  }
): Promise<ProjectRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/workspace`, {
    method: "PUT",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({
      draft: payload.draft,
      manuscript: payload.manuscript,
      export_result: payload.exportResult ?? null,
      status: payload.status ?? "editing"
    })
  });
  return parseApiResponse<ProjectRecord>(response);
}

export async function exportProjectPdf(projectId: string, payload: ManuscriptInput): Promise<SubmissionExportResult> {
  const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/export`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });
  return parseApiResponse<SubmissionExportResult>(response);
}

export async function fetchAuthenticatedFileBlobUrl(path: string | null | undefined): Promise<string | null> {
  const url = toAbsoluteApiUrl(path);
  if (!url) return null;
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store"
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throwApiError(response.status, payload);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: "application/pdf" }));
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
