"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  LogIn,
  Loader2,
  Palette,
  Send,
  Sparkles,
  TimerReset,
  Upload,
  X
} from "lucide-react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  assessUploadedMaterials,
  createBillingOrder,
  DataQualityGateError,
  fetchFigurePromptOptions,
  fetchGenerateDraftJob,
  fetchUsageQuota,
  MaterialQualityGateError,
  optimizeGenerationPrompt,
  PaymentRequiredError,
  runPdfSelfTest,
  submitGenerateDraftJob,
  toAbsoluteApiUrl,
  type DatasetGovernance,
  type DatasetQualityGate,
  type FigurePromptOption,
  type GenerateDraftResponse,
  type GenerateDraftJobStatus,
  type MaterialAssessment,
  type PdfSelfTestResult,
  type SubmissionExportResult,
  type UsageQuota,
  type BillingOrder
} from "@/lib/api";
import { readStoredAuthUser, type AuthUser } from "@/lib/auth";
import {
  templateSpecs,
  type TemplateId
} from "@/lib/manuscript-workspace";

const templateOrder: TemplateId[] = ["elsevier", "eur-radiol", "qims", "rsna", "lzu-master", "lzu-doctor"];
const generationStages = [
  { label: "材料识别与质量闸门", detail: "保存上传文件，识别主数据表、参考文献和缺失信息。", at: 0, percent: 6 },
  { label: "数据画像与统计预检", detail: "检测结局列、样本量、事件数、变量可用性和潜在泄漏列。", at: 8, percent: 14 },
  { label: "RAG 检索与工作流规划", detail: "匹配医学影像研究类型、数据等级、论文大纲和图表计划。", at: 22, percent: 26 },
  { label: "论文正文与表格生成", detail: "生成标题、摘要、方法、结果、讨论、表格和图注边界。", at: 45, percent: 42 },
  { label: "PubMed 引文补齐", detail: "构建检索式，补齐可审计参考文献并写入工作流记录。", at: 82, percent: 58 },
  { label: "统计图与流程图生成", detail: "生成数据驱动统计面板、流程图和图件说明。", at: 112, percent: 74 },
  { label: "LaTeX 模板导出", detail: "写入目标期刊模板，编译 PDF 并保留日志。", at: 145, percent: 88 },
  { label: "保存项目与额度结算", detail: "保存文章、PDF、工作流审计记录并更新账号额度。", at: 175, percent: 94 }
];
const HOME_DRAFT_STORAGE_KEY = "mi-writing-home-draft-v1";
const HOME_JOB_STORAGE_KEY = "mi-writing-generation-job-v1";
const GENERATION_POLL_INTERVAL_MS = 3000;
const MAX_UPLOAD_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_SINGLE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_FILE_COUNT = 80;
const supportedUploadExtensions = [
  ".csv",
  ".xlsx",
  ".sav",
  ".por",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".zip",
  ".nii",
  ".nii.gz",
  ".dcm",
  ".dicom",
  ".mha",
  ".mhd",
  ".nrrd",
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".bmp"
];
const defaultFigureOptions: FigurePromptOption[] = [
  {
    id: "journal_minimal",
    label: "期刊简洁风",
    description: "白底细线、少量蓝灰强调，适合正文中的研究流程图。",
    prompt_focus: "minimal journal workflow diagram",
    prompt_en: "Minimal journal workflow diagram with white background, thin lines, restrained blue-gray accents.",
    prompt_zh: "白底细线、蓝灰强调、适合中文论文正文的简洁研究流程图。",
    suitable_for: [{ language: "EN", label: "journal workflow" }, { language: "中", label: "论文流程图" }]
  },
  {
    id: "clinical_blue",
    label: "临床蓝绿风",
    description: "蓝绿医学配色、层次清晰，适合临床影像研究。",
    prompt_focus: "clinical blue and teal workflow diagram",
    prompt_en: "Clinical blue and teal medical workflow diagram with clear patient-cohort and imaging-analysis layers.",
    prompt_zh: "蓝绿医学配色、患者队列到影像分析层次清晰的临床研究流程图。",
    suitable_for: [{ language: "EN", label: "clinical imaging" }, { language: "中", label: "临床影像研究" }]
  },
  {
    id: "technical_grid",
    label: "技术管线风",
    description: "网格模块和精确箭头，适合模型开发流程。",
    prompt_focus: "technical pipeline diagram",
    prompt_en: "Technical grid pipeline diagram with modular boxes, precise arrows, model-development and validation stages.",
    prompt_zh: "网格化模块、精确箭头、适合模型开发与验证流程。",
    suitable_for: [{ language: "EN", label: "AI pipeline" }, { language: "中", label: "模型管线" }]
  },
  {
    id: "graphical_abstract",
    label: "图形摘要风",
    description: "更适合摘要图的视觉层级，保持审稿友好的克制风格。",
    prompt_focus: "graphical abstract style workflow",
    prompt_en: "Graphical abstract workflow with restrained icons, clear visual hierarchy, and publication-ready composition.",
    prompt_zh: "图形摘要式研究流程，图标克制、层级清楚、适合投稿使用。",
    suitable_for: [{ language: "EN", label: "graphical abstract" }, { language: "中", label: "图形摘要" }]
  }
];

type UploadedFileMetadata = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  path?: string;
};

type UploadSummary = {
  mode: "files" | "folder";
  folderName?: string;
  totalCount: number;
  totalBytes: number;
  datasetCount: number;
  referenceCount: number;
  archiveCount: number;
  imageCount: number;
  skippedCount: number;
};

type GenerationProgressState = NonNullable<GenerateDraftJobStatus["progress"]>;

type PersistedHomeDraft = {
  selectedTemplate: TemplateId;
  prompt: string;
  outputName: string;
  dataSource: string;
  collectionMethod: string;
  expectedProblem: string;
  supplementalInfo: string;
  selectedFigurePrompt: string;
  selfTestTemplate: TemplateId;
  materialAssessment: MaterialAssessment | null;
  uploadedFileMetadata: UploadedFileMetadata[];
  generatedProjectId: string | null;
  generatedPdf: SubmissionExportResult | null;
  governance: DatasetGovernance | null;
  qualityGate: DatasetQualityGate | null;
  llmStatus: { used: boolean; provider?: string | null; error?: string | null } | null;
};

function languageTagLabel(language: string) {
  if (language === "中") return "中文";
  if (language === "EN") return "English";
  return language;
}

function getGenerationProgress(elapsedSeconds: number) {
  let index = generationStages.length - 1;
  for (let itemIndex = 0; itemIndex < generationStages.length; itemIndex += 1) {
    const next = generationStages[itemIndex + 1];
    if (!next || elapsedSeconds < next.at) {
      index = itemIndex;
      break;
    }
  }
  const current = generationStages[index];
  const next = generationStages[index + 1];
  const nextPercent = next?.percent ?? 96;
  const spanSeconds = Math.max(1, (next?.at ?? current.at + 45) - current.at);
  const localRatio = Math.min(1, Math.max(0, (elapsedSeconds - current.at) / spanSeconds));
  const percent = Math.min(96, Math.round(current.percent + (nextPercent - current.percent) * localRatio));
  return { stage: current, index, percent };
}

function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && templateOrder.includes(value as TemplateId);
}

function readJsonFromLocalStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonToLocalStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeLocalStorageItem(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

function uploadedFileMetadata(files: File[]): UploadedFileMetadata[] {
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    path: getFileRelativePath(file)
  }));
}

function getFileRelativePath(file: File): string {
  const withPath = file as File & { webkitRelativePath?: string };
  return normalizeDisplayPath(withPath.webkitRelativePath || file.name);
}

function normalizeDisplayPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^([A-Za-z]:)?\/+/, "");
}

function getFileExtension(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.endsWith(".nii.gz")) return ".nii.gz";
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

function isSupportedUploadFile(file: File | UploadedFileMetadata) {
  return supportedUploadExtensions.includes(getFileExtension(file.name));
}

function isDatasetFileName(name: string) {
  return /\.(csv|xlsx|sav|por)$/i.test(name);
}

function isReferenceFileName(name: string) {
  return /\.(pdf|docx?|txt|md)$/i.test(name);
}

function isArchiveFileName(name: string) {
  return /\.zip$/i.test(name);
}

function isImageFileName(name: string) {
  return /\.(nii|nii\.gz|dcm|dicom|mha|mhd|nrrd|png|jpe?g|tiff?|bmp)$/i.test(name);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function buildUploadSummary(files: UploadedFileMetadata[]): UploadSummary {
  const normalizedPaths = files.map((file) => normalizeDisplayPath(file.path || file.name));
  const firstPath = normalizedPaths.find((path) => path.includes("/"));
  const folderName = inferFolderName(firstPath);
  return {
    mode: folderName ? "folder" : "files",
    folderName,
    totalCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    datasetCount: files.filter((file) => isDatasetFileName(file.name)).length,
    referenceCount: files.filter((file) => isReferenceFileName(file.name)).length,
    archiveCount: files.filter((file) => isArchiveFileName(file.name)).length,
    imageCount: files.filter((file) => isImageFileName(file.name)).length,
    skippedCount: 0
  };
}

function inferFolderName(path: string | undefined) {
  if (!path) return undefined;
  const parts = normalizeDisplayPath(path).split("/").filter(Boolean);
  const imageIndex = parts.findIndex((part) => /^(test|train|val|valid|validation)?_?images?$/i.test(part));
  if (imageIndex >= 0) {
    return parts.slice(Math.max(0, imageIndex - 3), imageIndex + 1).join("/");
  }
  return parts[0];
}

function validateUploadSelection(files: File[]) {
  const supported = files.filter(isSupportedUploadFile);
  const skippedCount = files.length - supported.length;
  const totalBytes = supported.reduce((sum, file) => sum + file.size, 0);
  const oversized = supported.find((file) => file.size > MAX_UPLOAD_SINGLE_BYTES);
  if (oversized) {
    return {
      files: [],
      skippedCount,
      error: `${oversized.name} 文件过大：${formatBytes(oversized.size)}。单个文件不能超过 ${formatBytes(MAX_UPLOAD_SINGLE_BYTES)}。`
    };
  }
  if (supported.length > MAX_UPLOAD_FILE_COUNT) {
    return {
      files: [],
      skippedCount,
      error: `可解析文件数量过多：${supported.length} 个。当前限制最多 ${MAX_UPLOAD_FILE_COUNT} 个，请只上传数据表、研究方案和必要参考资料。`
    };
  }
  if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
    return {
      files: [],
      skippedCount,
      error: `上传材料总大小为 ${formatBytes(totalBytes)}，超过 ${formatBytes(MAX_UPLOAD_TOTAL_BYTES)} 限制。请压缩材料范围，只保留核心数据表和必要文档。`
    };
  }
  return { files: supported, skippedCount, error: null };
}

export default function HomePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("elsevier");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [usageQuota, setUsageQuota] = useState<UsageQuota | null>(null);
  const [billingOrder, setBillingOrder] = useState<BillingOrder | null>(null);
  const [isCreatingBillingOrder, setIsCreatingBillingOrder] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [outputName, setOutputName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dataSource, setDataSource] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("");
  const [expectedProblem, setExpectedProblem] = useState("");
  const [supplementalInfo, setSupplementalInfo] = useState("");
  const [materialAssessment, setMaterialAssessment] = useState<MaterialAssessment | null>(null);
  const [isAssessingMaterials, setIsAssessingMaterials] = useState(false);
  const [materialAssessmentError, setMaterialAssessmentError] = useState<string | null>(null);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [promptOptimizeNote, setPromptOptimizeNote] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<SubmissionExportResult | null>(null);
  const [governance, setGovernance] = useState<DatasetGovernance | null>(null);
  const [llmStatus, setLlmStatus] = useState<{ used: boolean; provider?: string | null; error?: string | null } | null>(null);
  const [qualityGate, setQualityGate] = useState<DatasetQualityGate | null>(null);
  const [pendingQualityGate, setPendingQualityGate] = useState<DatasetQualityGate | null>(null);
  const [pendingMaterialGate, setPendingMaterialGate] = useState<MaterialAssessment | null>(null);
  const [selectedFigurePrompt, setSelectedFigurePrompt] = useState<string>("journal_minimal");
  const [figureOptions, setFigureOptions] = useState<FigurePromptOption[]>(defaultFigureOptions);
  const [pdfSelfTest, setPdfSelfTest] = useState<PdfSelfTestResult | null>(null);
  const [isTestingPdf, setIsTestingPdf] = useState(false);
  const [selfTestTemplate, setSelfTestTemplate] = useState<TemplateId>("elsevier");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [hasHydratedHomeDraft, setHasHydratedHomeDraft] = useState(false);
  const [restoredFileMetadata, setRestoredFileMetadata] = useState<UploadedFileMetadata[]>([]);
  const [activeGenerationJobId, setActiveGenerationJobId] = useState<string | null>(null);
  const [generationStatusLabel, setGenerationStatusLabel] = useState<string | null>(null);
  const [generationProgressState, setGenerationProgressState] = useState<GenerationProgressState | null>(null);
  const [skippedUploadCount, setSkippedUploadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplate = templateSpecs[selectedTemplate];
  const generatedPdfUrl = toAbsoluteApiUrl(generatedPdf?.pdf_url ?? null);
  const selectedFigureOption = figureOptions.find((option) => option.id === selectedFigurePrompt) ?? figureOptions[0];
  const visibleFileMetadata = uploadedFiles.length ? uploadedFileMetadata(uploadedFiles) : restoredFileMetadata;
  const visibleFileNames = visibleFileMetadata.map((file) => file.name);
  const uploadSummary = buildUploadSummary(visibleFileMetadata);
  const visibleUploadSummary = { ...uploadSummary, skippedCount: skippedUploadCount };
  const datasetCandidateCount = visibleFileNames.filter(isDatasetFileName).length;
  const referenceCandidateCount = visibleFileNames.filter(isReferenceFileName).length;
  const requiredFieldsReady = Boolean(
    prompt.trim() && outputName.trim() && dataSource.trim() && collectionMethod.trim() && expectedProblem.trim()
  );
  const selectedSelfTestTemplate = templateSpecs[selfTestTemplate];
  const selectedSelfTestBackendId = selectedSelfTestTemplate.backendTemplateId;
  const selectedTemplateSamplePdfUrl = toAbsoluteApiUrl(`/api/templates/${selectedSelfTestBackendId}/sample-pdf`);
  const selectedTemplateSampleZipUrl = toAbsoluteApiUrl(`/api/templates/${selectedSelfTestBackendId}/sample-zip`);
  const generationProgress = getGenerationProgress(generationElapsedSeconds);
  const displayedGenerationPercent = generationProgressState?.percent ?? generationProgress.percent;
  const displayedGenerationStageName = generationProgressState?.stage_name ?? generationProgress.stage.label;
  const displayedGenerationDetail = generationProgressState?.message ?? generationProgress.stage.detail;
  const displayedGenerationThoughts = generationProgressState?.thoughts ?? [];
  const generationDisabled =
    isGenerating ||
    isOptimizingPrompt ||
    !authUser ||
    !requiredFieldsReady ||
    Boolean(usageQuota?.payment_required);

  function applyGenerationResult(result: GenerateDraftResponse) {
    setGeneratedProjectId(result.project_id);
    setGeneratedPdf(result.export_result);
    setGovernance(result.governance);
    setQualityGate(result.quality_gate);
    if (result.billing_quota) {
      setUsageQuota(result.billing_quota);
    }
    setPendingQualityGate(null);
    setPendingMaterialGate(null);
    setLlmStatus({
      used: Boolean(result.llm_used),
      provider: result.llm_provider ?? null,
      error: result.llm_error ?? null
    });

    if (!result.export_result.compile_succeeded) {
      setGenerateError("PDF 已尝试生成，但模板编译未完全通过，请先查看结果。");
    } else {
      setGenerateError(null);
    }
  }

  function clearGenerationResult() {
    setGeneratedProjectId(null);
    setGeneratedPdf(null);
    setGovernance(null);
    setLlmStatus(null);
    setQualityGate(null);
  }

  function handleGenerationError(error: unknown) {
    clearGenerationResult();
    if (error instanceof MaterialQualityGateError) {
      setPendingMaterialGate(error.materialGate);
      setMaterialAssessment(error.materialGate);
      setDataSource((current) => (current.trim() ? current : error.materialGate.data_source || ""));
      setCollectionMethod((current) => (current.trim() ? current : error.materialGate.collection_method || ""));
      setExpectedProblem((current) => (current.trim() ? current : error.materialGate.expected_problem || ""));
      setGenerateError(error.materialGate.label);
      return;
    }
    if (error instanceof DataQualityGateError) {
      setPendingQualityGate(error.qualityGate);
      setGenerateError(error.qualityGate.decision);
      return;
    }
    if (error instanceof PaymentRequiredError) {
      setUsageQuota(error.quota);
      setGenerateError(`免费次数已用完，继续生成需购买额度：${error.quota.price_cny_per_use} 元/次。`);
      return;
    }
    setGenerateError(error instanceof Error ? error.message : "PDF 生成失败");
  }

  useEffect(() => {
    void fetchFigurePromptOptions()
      .then((options) => {
        if (options.length > 0) setFigureOptions(options);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const storedUser = readStoredAuthUser();
    setAuthUser(storedUser);
    if (!storedUser) {
      setUsageQuota(null);
      return;
    }
    void fetchUsageQuota(storedUser.user_id).then(setUsageQuota).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    setGenerationElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setGenerationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!hasHydratedHomeDraft) {
      return;
    }
    if (!uploadedFiles.length) {
      if (!restoredFileMetadata.length) {
        setMaterialAssessment(null);
      }
      setMaterialAssessmentError(null);
      setIsAssessingMaterials(false);
      return;
    }

    let cancelled = false;
    setIsAssessingMaterials(true);
    setMaterialAssessmentError(null);
    void assessUploadedMaterials({
      prompt: "",
      selectedTemplate,
      files: uploadedFiles,
      dataSource: "",
      collectionMethod: "",
      expectedProblem: "",
      supplementalInfo: ""
    })
      .then((assessment) => {
        if (cancelled) return;
        setMaterialAssessment(assessment);
        setDataSource((current) => (current.trim() ? current : assessment.data_source || ""));
        setCollectionMethod((current) => (current.trim() ? current : assessment.collection_method || ""));
        setExpectedProblem((current) => (current.trim() ? current : assessment.expected_problem || ""));
      })
      .catch((error) => {
        if (cancelled) return;
        setMaterialAssessment(null);
        setMaterialAssessmentError(error instanceof Error ? error.message : "材料自动识别失败");
      })
      .finally(() => {
        if (!cancelled) setIsAssessingMaterials(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTemplate, uploadedFiles, hasHydratedHomeDraft, restoredFileMetadata.length]);

  useEffect(() => {
    const stored = readJsonFromLocalStorage<Partial<PersistedHomeDraft>>(HOME_DRAFT_STORAGE_KEY);
    if (stored) {
      if (isTemplateId(stored.selectedTemplate)) setSelectedTemplate(stored.selectedTemplate);
      if (typeof stored.prompt === "string") setPrompt(stored.prompt);
      if (typeof stored.outputName === "string") setOutputName(stored.outputName);
      if (typeof stored.dataSource === "string") setDataSource(stored.dataSource);
      if (typeof stored.collectionMethod === "string") setCollectionMethod(stored.collectionMethod);
      if (typeof stored.expectedProblem === "string") setExpectedProblem(stored.expectedProblem);
      if (typeof stored.supplementalInfo === "string") setSupplementalInfo(stored.supplementalInfo);
      if (typeof stored.selectedFigurePrompt === "string") setSelectedFigurePrompt(stored.selectedFigurePrompt);
      if (isTemplateId(stored.selfTestTemplate)) setSelfTestTemplate(stored.selfTestTemplate);
      if (stored.materialAssessment) setMaterialAssessment(stored.materialAssessment);
      if (Array.isArray(stored.uploadedFileMetadata)) {
        setRestoredFileMetadata(
          stored.uploadedFileMetadata.filter(
            (file) =>
              typeof file.name === "string" &&
              typeof file.size === "number" &&
              typeof file.lastModified === "number"
          )
        );
      }
      setGeneratedProjectId(typeof stored.generatedProjectId === "string" ? stored.generatedProjectId : null);
      setGeneratedPdf(stored.generatedPdf ?? null);
      setGovernance(stored.governance ?? null);
      setQualityGate(stored.qualityGate ?? null);
      setLlmStatus(stored.llmStatus ?? null);
    }

    const storedJob = readJsonFromLocalStorage<{ job_id?: string; jobId?: string }>(HOME_JOB_STORAGE_KEY);
    const restoredJobId = storedJob?.job_id || storedJob?.jobId || "";
    if (restoredJobId) {
      setActiveGenerationJobId(restoredJobId);
      setIsGenerating(true);
      setGenerationStatusLabel("已恢复后台生成任务，正在查询进度。");
    }
    setHasHydratedHomeDraft(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedHomeDraft) return;
    const payload: PersistedHomeDraft = {
      selectedTemplate,
      prompt,
      outputName,
      dataSource,
      collectionMethod,
      expectedProblem,
      supplementalInfo,
      selectedFigurePrompt,
      selfTestTemplate,
      materialAssessment,
      uploadedFileMetadata: uploadedFiles.length ? uploadedFileMetadata(uploadedFiles) : restoredFileMetadata,
      generatedProjectId,
      generatedPdf,
      governance,
      qualityGate,
      llmStatus
    };
    writeJsonToLocalStorage(HOME_DRAFT_STORAGE_KEY, payload);
  }, [
    hasHydratedHomeDraft,
    selectedTemplate,
    prompt,
    outputName,
    dataSource,
    collectionMethod,
    expectedProblem,
    supplementalInfo,
    selectedFigurePrompt,
    selfTestTemplate,
    materialAssessment,
    uploadedFiles,
    restoredFileMetadata,
    generatedProjectId,
    generatedPdf,
    governance,
    qualityGate,
    llmStatus
  ]);

  useEffect(() => {
    if (!hasHydratedHomeDraft) return;
    if (activeGenerationJobId) {
      writeJsonToLocalStorage(HOME_JOB_STORAGE_KEY, {
        job_id: activeGenerationJobId,
        updated_at: new Date().toISOString()
      });
    } else {
      removeLocalStorageItem(HOME_JOB_STORAGE_KEY);
    }
  }, [activeGenerationJobId, hasHydratedHomeDraft]);

  useEffect(() => {
    if (!activeGenerationJobId) return;

    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      setIsGenerating(true);
      try {
        const job = await fetchGenerateDraftJob(activeGenerationJobId);
        if (cancelled) return;
        setGenerationProgressState(job.progress ?? null);
        if (job.status === "succeeded" && job.result) {
          applyGenerationResult(job.result);
          setIsGenerating(false);
          setActiveGenerationJobId(null);
          setGenerationStatusLabel(null);
          setGenerationProgressState(null);
          return;
        }
        setGenerationStatusLabel(job.progress?.message ?? (job.status === "queued" ? "后台任务已排队，等待开始生成。" : "后台任务正在生成，页面可保持打开。"));
        timer = window.setTimeout(poll, GENERATION_POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "查询生成任务失败";
        if (
          error instanceof MaterialQualityGateError ||
          error instanceof DataQualityGateError ||
          error instanceof PaymentRequiredError ||
          /not found/i.test(message)
        ) {
          handleGenerationError(error);
          setIsGenerating(false);
          setActiveGenerationJobId(null);
          setGenerationStatusLabel(null);
          setGenerationProgressState(null);
          return;
        }
        setGenerateError(`${message}；后台任务可能仍在继续，正在重试查询。`);
        setGenerationStatusLabel("生成任务查询暂时失败，正在重试。");
        timer = window.setTimeout(poll, GENERATION_POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeGenerationJobId]);

  const promptPlaceholder = useMemo(() => {
    if (selectedTemplate === "elsevier") {
      return "例如：帮我生成一篇针对ADC直方图分析用于肿瘤鉴别的Elsevier双栏论文初稿，先给出摘要、引言、方法、结果、讨论、表格和图注占位。";
    }

    if (selectedTemplate === "eur-radiol") {
      return "例如：基于European Radiology格式，生成一篇医学影像回顾性研究论文初稿，保留结构化摘要和Key Points。";
    }

    if (selectedTemplate === "qims") {
      return "例如：按QIMS格式生成一篇MRI定量参数研究论文初稿，保留Highlight Box和双倍行距风格。";
    }

    if (selectedTemplate === "lzu-master") {
      return "例如：按兰州大学硕士学位论文格式，基于上传的医学影像结构化数据生成毕业论文初稿，包含摘要、目录、方法、结果、讨论、图表和参考文献。";
    }

    if (selectedTemplate === "lzu-doctor") {
      return "例如：按兰州大学博士学位论文格式，生成一篇医学影像预测模型博士论文初稿，强调研究背景、方法体系、结果章节、局限性和参考文献。";
    }

    return "例如：按Radiology RSNA格式生成一篇Original Research初稿，保留Key Results和标准摘要结构。";
  }, [selectedTemplate]);

  async function handleGenerate(forceGenerate = false) {
    const normalizedPrompt = prompt.trim();
    if (!authUser) {
      setGenerateError("请先通过邮箱验证码登录后再生成文章。");
      return;
    }
    if (!normalizedPrompt) {
      setGenerateError("生成要求为空时，请先点击右侧 AI 优化图标生成一版要求，再进入生成流程。");
      return;
    }
    if (!outputName.trim() || !dataSource.trim() || !collectionMethod.trim() || !expectedProblem.trim()) {
      setGenerateError("请先补齐标记为必填的输出命名、数据来源、收集方式和预期解决问题。");
      return;
    }
    if (!uploadedFiles.length && restoredFileMetadata.length) {
      setGenerateError("上次文件名已恢复，但浏览器不能恢复本地文件内容。请重新选择这些研究材料后再生成。");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerationProgressState(null);
    if (!forceGenerate) {
      setPendingQualityGate(null);
    }
    setPendingMaterialGate(null);

    try {
      const job = await submitGenerateDraftJob({
        prompt: normalizedPrompt,
        selectedTemplate,
        userId: authUser.user_id,
        outputName: outputName.trim(),
        dataSource: dataSource.trim(),
        collectionMethod: collectionMethod.trim(),
        expectedProblem: expectedProblem.trim(),
        files: uploadedFiles,
        supplementalInfo: supplementalInfo.trim(),
        figurePromptStyle: selectedFigurePrompt,
        forceGenerate
      });
      setActiveGenerationJobId(job.job_id);
      setGenerationStatusLabel("已提交后台生成任务，正在开始处理。");
    } catch (error) {
      handleGenerationError(error);
      setIsGenerating(false);
    }
  }

  async function handleOptimizePrompt() {
    setIsOptimizingPrompt(true);
    setGenerateError(null);
    setPromptOptimizeNote(null);
    try {
      const result = await optimizeGenerationPrompt({
        prompt,
        selectedTemplate,
        dataSource,
        collectionMethod,
        expectedProblem,
        supplementalInfo,
        uploadedFiles: uploadedFiles.map((file) => file.name),
        materialAssessment
      });
      setPrompt(result.prompt);
      setPromptOptimizeNote(
        result.used_llm
          ? "已调用 AI 优化生成要求。请快速核对其中的研究对象、结局和统计边界。"
          : "当前 LLM 未配置或调用失败，已使用本地规则生成一版可用要求。"
      );
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "生成要求优化失败");
    } finally {
      setIsOptimizingPrompt(false);
    }
  }

  async function handlePdfSelfTest() {
    setIsTestingPdf(true);
    setGenerateError(null);
    try {
      setPdfSelfTest(await runPdfSelfTest());
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "PDF 模板自检失败");
    } finally {
      setIsTestingPdf(false);
    }
  }

  async function handleCreateBillingOrder() {
    if (!authUser) {
      setGenerateError("请先通过邮箱验证码登录后再购买额度。");
      return;
    }
    setIsCreatingBillingOrder(true);
    setGenerateError(null);
    try {
      setBillingOrder(await createBillingOrder({ userId: authUser.user_id, credits: 1 }));
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "购买订单创建失败");
    } finally {
      setIsCreatingBillingOrder(false);
    }
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const validation = validateUploadSelection(selectedFiles);
    if (validation.error) {
      setMaterialAssessmentError(validation.error);
      setSkippedUploadCount(validation.skippedCount);
      return;
    }
    if (!validation.files.length) {
      setMaterialAssessmentError("未识别到支持的研究材料。支持 CSV/XLSX/SAV/POR、PDF、DOC/DOCX、TXT/MD、ZIP、DICOM、NIfTI 和常见图像文件。");
      setSkippedUploadCount(validation.skippedCount);
      return;
    }
    setRestoredFileMetadata([]);
    setMaterialAssessmentError(validation.skippedCount ? `已跳过 ${validation.skippedCount} 个不支持的文件。` : null);
    setSkippedUploadCount(validation.skippedCount);
    setUploadedFiles((current) => {
      const seen = new Set(current.map((file) => `${getFileRelativePath(file)}:${file.size}:${file.lastModified}`));
      const next = [...current];
      for (const file of validation.files) {
        const key = `${getFileRelativePath(file)}:${file.size}:${file.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(file);
        }
      }
      return next;
    });
  }

  function removeUploadedFile(index: number) {
    setUploadedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function clearUploadedMaterials() {
    setUploadedFiles([]);
    setRestoredFileMetadata([]);
    setMaterialAssessment(null);
    setMaterialAssessmentError(null);
    setSkippedUploadCount(0);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <section className="min-h-[calc(100vh-4rem)] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="success">研究材料质量闸门</Badge>
              <Badge variant="outline">多文件/文件夹/ZIP</Badge>
              <Badge variant="outline">六种 PDF 模板可自检</Badge>
              <Badge variant="outline">首页对话后直接生成 PDF</Badge>
            </div>

            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
              医学影像论文写作入口
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              上传数据表、参考论文、研究方案或压缩包后，后端先判断材料是否足够支撑论文生成；不足时会提示需要补充什么。
            </p>

            <div className="mt-6 border-y bg-white p-4 shadow-soft sm:p-5 lg:min-h-[calc(100vh-14rem)]">
              <div className="mb-4 rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <CreditCard className="h-4 w-4 text-primary" />
                      使用额度
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {authUser
                        ? `当前账号：${authUser.email}。每个注册用户免费生成 3 次；免费次数用完后暂定 ${usageQuota?.price_cny_per_use ?? 99} 元/次。`
                        : "请先通过邮箱验证码登录；每个注册用户免费生成 3 次，之后暂定 99 元/次。"}
                    </div>
                  </div>
                  {authUser ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={usageQuota && usageQuota.remaining_total > 0 ? "success" : "warning"}>
                        剩余 {usageQuota?.remaining_total ?? "-"} 次
                      </Badge>
                      <Badge variant="outline">免费 {usageQuota?.remaining_free ?? "-"}/{usageQuota?.free_total ?? 3}</Badge>
                      <Badge variant="outline">付费 {usageQuota?.paid_credits ?? 0}</Badge>
                    </div>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/login">
                        <LogIn className="h-4 w-4" />
                        邮箱登录
                      </Link>
                    </Button>
                  )}
                </div>
                {usageQuota?.payment_required ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div>免费次数已用完。继续生成需购买 1 次额度，价格 {usageQuota.price_cny_per_use} 元。</div>
                    <Button type="button" variant="outline" onClick={() => void handleCreateBillingOrder()} disabled={isCreatingBillingOrder}>
                      {isCreatingBillingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      创建 99 元订单
                    </Button>
                  </div>
                ) : null}
                {billingOrder ? (
                  <div className="mt-3 rounded-xl border bg-white p-3 text-xs text-slate-700">
                    订单 {billingOrder.order_id} · {billingOrder.amount_cny} 元 · {billingOrder.status}。{billingOrder.message}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <Upload className="h-4 w-4 text-primary" />
                      上传研究材料
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      支持 CSV/XLSX/SAV/POR、PDF、DOC/DOCX、TXT/MD、ZIP、DICOM、NIfTI 和常见图像文件；单次总量不超过 {formatBytes(MAX_UPLOAD_TOTAL_BYTES)}。
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={visibleFileMetadata.length ? "success" : "outline"}>
                      {uploadedFiles.length
                        ? `${uploadedFiles.length} 个文件`
                        : restoredFileMetadata.length
                          ? `${restoredFileMetadata.length} 个文件名已恢复`
                          : "未上传"}
                    </Badge>
                    <Badge variant={datasetCandidateCount ? "success" : "outline"}>数据表 {datasetCandidateCount}</Badge>
                    <Badge variant={referenceCandidateCount ? "success" : "outline"}>文档 {referenceCandidateCount}</Badge>
                    <Badge variant={visibleUploadSummary.archiveCount ? "success" : "outline"}>ZIP {visibleUploadSummary.archiveCount}</Badge>
                    <Badge variant={visibleUploadSummary.imageCount ? "success" : "outline"}>影像 {visibleUploadSummary.imageCount}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    选择文件
                  </Button>
                  <Button type="button" variant="outline" onClick={() => folderInputRef.current?.click()}>
                    <FolderOpen className="h-4 w-4" />
                    选择文件夹
                  </Button>
                  {uploadedFiles.length || restoredFileMetadata.length ? (
                    <Button type="button" variant="ghost" onClick={clearUploadedMaterials}>
                      清空
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 rounded-xl border bg-white p-3 text-sm text-slate-700">
                  {uploadedFiles.length ? (
                    visibleUploadSummary.mode === "folder" ? (
                      <div className="rounded-lg border bg-slate-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{visibleUploadSummary.folderName || "已选择文件夹"}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              已解析 {visibleUploadSummary.totalCount} 个支持文件，总大小 {formatBytes(visibleUploadSummary.totalBytes)}
                              {visibleUploadSummary.skippedCount ? `，跳过 ${visibleUploadSummary.skippedCount} 个不支持文件` : ""}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={clearUploadedMaterials}>
                            移除文件夹
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-5">
                          <div className="rounded-md border bg-white px-3 py-2">数据表 {visibleUploadSummary.datasetCount}</div>
                          <div className="rounded-md border bg-white px-3 py-2">文档 {visibleUploadSummary.referenceCount}</div>
                          <div className="rounded-md border bg-white px-3 py-2">ZIP {visibleUploadSummary.archiveCount}</div>
                          <div className="rounded-md border bg-white px-3 py-2">影像 {visibleUploadSummary.imageCount}</div>
                          <div className="rounded-md border bg-white px-3 py-2">跳过 {visibleUploadSummary.skippedCount}</div>
                        </div>
                        {visibleUploadSummary.imageCount && !visibleUploadSummary.datasetCount ? (
                          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                            已识别影像文件夹，但还需要病例级标签/特征表。请补充 CSV/XLSX，包含 patient_id、image_path、label/group、参考标准、训练/测试划分和关键临床变量。
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeUploadedFile(index)}>
                              移除
                            </Button>
                          </div>
                        ))}
                      </div>
                    )
                  ) : restoredFileMetadata.length ? (
                    <div className="grid gap-2">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                        已恢复上次填写信息和文件名，但浏览器不能自动恢复本地文件内容。生成前请重新选择这些研究材料。
                      </div>
                      {restoredFileMetadata.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{formatBytes(file.size)} · 待重新选择</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    "可先只上传研究方案或参考论文，后端会判断是否还缺结构化数据和研究设计信息。"
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.sav,.por,.pdf,.doc,.docx,.txt,.md,.zip"
                  multiple
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files)}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  // @ts-expect-error webkitdirectory is supported by Chromium-based browsers.
                  webkitdirectory=""
                  onChange={(event) => addFiles(event.target.files)}
                />
                {(uploadedFiles.length || materialAssessment) ? (
                  <div className="mt-3 rounded-xl border bg-white p-3 text-xs text-slate-700">
                    {isAssessingMaterials ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在识别上传材料并尝试回填必填信息
                      </div>
                    ) : materialAssessmentError ? (
                      <div className="text-amber-800">{materialAssessmentError}</div>
                    ) : materialAssessment ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={materialAssessment.ready ? "success" : "warning"}>
                            材料评分 {materialAssessment.score}/100
                          </Badge>
                          <span className="text-muted-foreground">{materialAssessment.label}</span>
                        </div>
                        {materialAssessment.inferred_fields && Object.keys(materialAssessment.inferred_fields).length ? (
                          <div className="text-emerald-700">
                            已自动识别：
                            {Object.keys(materialAssessment.inferred_fields)
                              .map((key) => {
                                if (key === "data_source") return "数据来源";
                                if (key === "collection_method") return "收集方式";
                                if (key === "expected_problem") return "预期问题";
                                return key;
                              })
                              .join("、")}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">未从上传材料中识别到完整必填信息，请在下方手动补充。</div>
                        )}
                        {materialAssessment.missing_items.length ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                            <div className="font-medium">上传资料仍然不足</div>
                            <ul className="mt-2 list-disc space-y-1 pl-4 leading-5">
                              {materialAssessment.missing_items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {materialAssessment.reasons.length ? (
                          <div className="rounded-lg border bg-slate-50 p-3 text-slate-800">
                            <div className="font-medium">评分依据</div>
                            <ul className="mt-2 list-disc space-y-1 pl-4 leading-5">
                              {materialAssessment.reasons.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {materialAssessment.recommendations.length ? (
                          <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sky-950">
                            <div className="font-medium">上传资料不足与补充建议</div>
                            <ul className="mt-2 list-disc space-y-1 pl-4 leading-5">
                              {materialAssessment.recommendations.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    数据质量判断
                  </div>
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">
                    后端会自动寻找可分析的 CSV/XLSX/SAV/POR，并检查样本量、结局列、特征数量和变量名是否足以支撑统计结果。
                  </div>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                    <FileText className="h-4 w-4 text-primary" />
                    写作信息判断
                  </div>
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">
                    系统会结合提示词、参考文档、数据来源、收集方式和预期问题判断是否能进入生成工作流。
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-950">PDF 模板下载</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      选择一个模板后，可直接下载样例 PDF，或下载包含 TeX/Bib/模板资源的压缩包。
                    </div>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => void handlePdfSelfTest()} disabled={isTestingPdf}>
                    {isTestingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    全部自检
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <select
                    value={selfTestTemplate}
                    onChange={(event) => setSelfTestTemplate(event.target.value as TemplateId)}
                    className="min-h-10 rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                  >
                    {templateOrder.map((templateId) => (
                      <option key={templateId} value={templateId}>
                        {templateSpecs[templateId].label} · {templateSpecs[templateId].journal}
                      </option>
                    ))}
                  </select>
                  {selectedTemplateSamplePdfUrl ? (
                    <Button asChild variant="outline">
                      <a href={selectedTemplateSamplePdfUrl} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                        下载模板 PDF
                      </a>
                    </Button>
                  ) : null}
                  {selectedTemplateSampleZipUrl ? (
                    <Button asChild>
                      <a href={selectedTemplateSampleZipUrl} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                        下载 TeX 压缩包
                      </a>
                    </Button>
                  ) : null}
                </div>
                {pdfSelfTest ? (
                  <div className="w-full rounded-xl border bg-white p-3 text-xs text-slate-700">
                    <div className="mb-2 font-medium">
                      {pdfSelfTest.all_compile_succeeded ? "全部模板编译通过" : "存在模板编译失败"}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {pdfSelfTest.results.map((item) => (
                        <div key={`${item.template_id}-${item.work_dir}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                          <span>{item.template_id}</span>
                          <Badge variant={item.compile_succeeded ? "success" : "warning"}>
                            {item.compile_succeeded ? "成功" : "失败"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {templateOrder.map((templateId) => {
                  const template = templateSpecs[templateId];
                  const selected = selectedTemplate === templateId;
                  return (
                    <button
                      key={templateId}
                      type="button"
                      onClick={() => setSelectedTemplate(templateId)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selected ? "border-primary bg-primary/5 text-slate-950" : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium">{template.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{template.journal}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-950">
                  <Palette className="h-4 w-4 text-primary" />
                  流程图风格
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {figureOptions.map((option) => {
                    const selected = selectedFigurePrompt === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedFigurePrompt(option.id)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                          selected ? "border-primary bg-white text-slate-950 shadow-sm" : "bg-white/70 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{option.label}</span>
                          {option.suitable_for?.map((item) => (
                            <Badge
                              key={`${option.id}-${item.language}-${item.label}`}
                              variant={item.language === "中" ? "success" : "outline"}
                            >
                              {languageTagLabel(item.language)}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
                        {option.suitable_for?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {option.suitable_for.map((item) => (
                              <span
                                key={`${option.id}-${item.language}-${item.label}-detail`}
                                className="rounded-md border bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-700"
                              >
                                {languageTagLabel(item.language)} · {item.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {option.prompt_en ? (
                          <div className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            English prompt: {option.prompt_en}
                          </div>
                        ) : null}
                        {option.prompt_zh ? (
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            中文 prompt：{option.prompt_zh}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>后端会按数据自动补齐统计图；这里仅绑定流程图 prompt 风格。</div>
                  {selectedFigureOption?.prompt_focus ? <div>当前后端风格键：{selectedFigureOption.prompt_focus}</div> : null}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50">
                <div className="grid gap-3 border-b px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      输出命名
                      <Badge variant="warning">必填</Badge>
                    </div>
                    <input
                      value={outputName}
                      onChange={(event) => setOutputName(event.target.value)}
                      placeholder="例如：独立预测因子论文 / 肝脏能谱CT研究"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      数据来源
                      <Badge variant="warning">必填</Badge>
                    </div>
                    <input
                      value={dataSource}
                      onChange={(event) => setDataSource(event.target.value)}
                      placeholder="AI 未识别时填写：单中心回顾性医院数据库 / 公开数据集 TCIA"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      如何收集
                      <Badge variant="warning">必填</Badge>
                    </div>
                    <input
                      value={collectionMethod}
                      onChange={(event) => setCollectionMethod(event.target.value)}
                      placeholder="AI 未识别时填写：PACS+病理+随访合并，人工核对标签"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      预期解决问题
                      <Badge variant="warning">必填</Badge>
                    </div>
                    <input
                      value={expectedProblem}
                      onChange={(event) => setExpectedProblem(event.target.value)}
                      placeholder="AI 未识别时填写：术前预测LNM / 鉴别ACS与Stable CAD"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
                </div>
                <div className="border-b px-4 py-4">
                  <label className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      补充信息
                      <Badge variant="outline">选填</Badge>
                    </div>
                    <textarea
                      value={supplementalInfo}
                      onChange={(event) => setSupplementalInfo(event.target.value)}
                      placeholder="当系统提示材料不足时，在这里补充缺失信息，例如：数据来源、纳排标准、结局定义、参考标准、采集时间、伦理审批、变量含义等。"
                      className="min-h-[92px] w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm leading-6 outline-none ring-0"
                    />
                  </label>
                </div>
                <div className="border-b px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        生成要求
                        <Badge variant="warning">必填</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        说明论文主题、目标期刊、研究设计重点和输出范围；材料不足时后端会阻止生成并列出缺失项。
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={prompt.trim() ? "outline" : "default"}
                      onClick={() => void handleOptimizePrompt()}
                      disabled={isOptimizingPrompt || isGenerating}
                      title={prompt.trim() ? "AI 优化当前生成要求" : "生成要求为空时，先由 AI 智能生成要求"}
                    >
                      {isOptimizingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      AI 优化
                    </Button>
                  </div>
                </div>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      void handleGenerate();
                    }
                  }}
                  placeholder={promptPlaceholder}
                  className="min-h-[240px] w-full resize-none border-0 bg-transparent px-4 py-4 text-sm leading-7 outline-none placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3">
                  <div className="text-xs text-muted-foreground">
                    当前模板：{activeTemplate.label} · {activeTemplate.bodyMode === "double" ? "双栏正文" : "单栏正文"} ·
                    {!authUser
                      ? " 请先通过邮箱验证码登录"
                      : usageQuota?.payment_required
                      ? " 免费次数已用完，请先购买额度"
                      : requiredFieldsReady
                        ? " 必填信息已完整"
                        : " 请补齐必填信息后生成"}
                  </div>
                  <Button
                    onClick={() => void handleGenerate(false)}
                    disabled={generationDisabled}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    生成 PDF
                  </Button>
                </div>
              </div>

              {promptOptimizeNote ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {promptOptimizeNote}
                </div>
              ) : null}

              {generateError ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {generateError}
                </div>
              ) : null}

              {pendingMaterialGate ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{pendingMaterialGate.label}</div>
                      <div className="mt-1 text-xs">材料评分：{pendingMaterialGate.score} / 100</div>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void handleGenerate(false)} disabled={isGenerating || !supplementalInfo.trim()}>
                      补充后重新评估
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-xs font-medium">缺失项</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                        {pendingMaterialGate.missing_items.length ? pendingMaterialGate.missing_items.map((item) => <li key={item}>{item}</li>) : <li>未列出具体缺失项</li>}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium">判断依据</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                        {pendingMaterialGate.reasons.length ? pendingMaterialGate.reasons.map((item) => <li key={item}>{item}</li>) : <li>上传材料不足，暂不能进入生成。</li>}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium">建议</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                        {pendingMaterialGate.recommendations.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              {pendingQualityGate ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{pendingQualityGate.label}</div>
                      <div className="mt-1 text-xs">质量分：{pendingQualityGate.score} / 100 · 数据等级：{pendingQualityGate.data_grade}</div>
                    </div>
                    {pendingQualityGate.action === "needs_confirmation" ? (
                      <Button type="button" variant="outline" onClick={() => void handleGenerate(true)} disabled={isGenerating}>
                        仍然继续生成探索性稿件
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium">主要原因</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                        {pendingQualityGate.reasons.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium">优化建议</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                        {pendingQualityGate.recommendations.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              {generatedPdf ? (
                <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                        <FileText className="h-4 w-4 text-primary" />
                        已生成 PDF
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {generatedPdf.template_id} · {generatedPdf.compile_succeeded ? "编译成功" : "编译未完全成功"}
                      </div>
                      {governance ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          数据规范性：{governance.compliance_level.toUpperCase()} · {governance.judgement}
                        </div>
                      ) : null}
                      {qualityGate ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          数据质量：{qualityGate.score}/100 · {qualityGate.label} · 等级 {qualityGate.data_grade}
                        </div>
                      ) : null}
                      {llmStatus ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          模型调用：{llmStatus.used ? "成功" : "未成功"}{llmStatus.error ? ` · ${llmStatus.error}` : ""}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPdfViewerOpen(true)}
                        disabled={!generatedPdfUrl}
                      >
                        <Eye className="h-4 w-4" />
                        查看 PDF
                      </Button>
                      {generatedProjectId ? (
                        <Button asChild variant="outline">
                          <Link href={`/work?project=${encodeURIComponent(generatedProjectId)}`}>
                            <Eye className="h-4 w-4" />
                            工作台预览
                          </Link>
                        </Button>
                      ) : null}
                      {generatedPdfUrl ? (
                        <Button asChild>
                          <a href={generatedPdfUrl} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                            下载 PDF
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {isGenerating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  正在生成论文 PDF
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  已运行 {generationElapsedSeconds} 秒 · 当前阶段 {generationProgress.index + 1}/{generationStages.length}
                </div>
                {generationStatusLabel ? (
                  <div className="mt-1 text-xs text-muted-foreground">{generationStatusLabel}</div>
                ) : null}
              </div>
              <Badge variant="outline">{displayedGenerationPercent}%</Badge>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-900">{displayedGenerationStageName}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <TimerReset className="h-3.5 w-3.5" />
                  后台任务轮询
                </span>
              </div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{displayedGenerationDetail}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${displayedGenerationPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-900">当前可展示判断</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                这里显示的是工作流阶段、数据判断和工具调用依据摘要，不展示模型内部隐藏推理。
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-700">
                {(displayedGenerationThoughts.length
                  ? displayedGenerationThoughts
                  : [
                      "正在按材料质量、数据结构、模板要求和统计边界推进生成流程。",
                      "如果某一步失败，系统会把错误转换为材料闸门、数据闸门或编译日志供你检查。"
                    ]
                ).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid gap-2">
              {generationStages.map((stage, index) => {
                const done = index < generationProgress.index;
                const active = index === generationProgress.index;
                return (
                  <div
                    key={stage.label}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${
                      active ? "border-primary bg-primary/5 text-slate-900" : done ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{stage.label}</div>
                      <div className="mt-0.5 leading-5">{stage.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {pdfViewerOpen && generatedPdfUrl ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-950">PDF 预览</div>
                <div className="text-xs text-muted-foreground">{generatedPdf?.template_id}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <a href={generatedPdfUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    下载
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPdfViewerOpen(false)} title="关闭预览">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-3">
              <iframe title="Generated PDF Preview" src={generatedPdfUrl} className="h-full w-full rounded-xl border bg-white" />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
