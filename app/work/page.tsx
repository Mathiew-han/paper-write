"use client";

import {
  AlignCenter,
  AlignLeft,
  Bold,
  Bot,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Download,
  FileImage,
  FileSpreadsheet,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  MessageSquareText,
  Minus,
  Plus,
  Save,
  Search,
  Send,
  Type,
  Upload,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  exportSubmissionPdf,
  fetchTemplateRegistry,
  toAbsoluteApiUrl,
  type BackendTemplateSummary,
  type ManuscriptInput,
  type SubmissionExportResult
} from "@/lib/api";
import { PENDING_WORKSPACE_DRAFT_KEY } from "@/lib/manuscript-workspace";
import { cn } from "@/lib/utils";

type TemplateId = "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
type TextRole = "title" | "meta" | "section" | "abstract" | "paragraph";
type Alignment = "left" | "center";
type SpanMode = "single" | "full";
type AspectRatio = "wide" | "square" | "tall";

type BlockStyle = Partial<{
  fontFamily: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  textAlign: Alignment;
  lineHeight: number;
}>;

type TextBlock = {
  id: string;
  kind: "text";
  role: TextRole;
  placement: "front" | "body";
  span: SpanMode;
  label?: string;
  content: string;
  style?: BlockStyle;
};

type TableBlock = {
  id: string;
  kind: "table";
  placement: "body";
  span: SpanMode;
  title: string;
  note: string;
  headers: string[];
  rows: string[][];
  style?: BlockStyle;
};

type FigureBlock = {
  id: string;
  kind: "figure";
  placement: "body";
  span: SpanMode;
  title: string;
  caption: string;
  imageLabel: string;
  widthPercent: number;
  aspectRatio: AspectRatio;
  style?: BlockStyle;
};

type DocumentBlock = TextBlock | TableBlock | FigureBlock;
type ArtifactItem = {
  name: string;
  type: string;
  status: string;
  href?: string | null;
};

type ChatEntry = {
  id: string;
  content: string;
  createdAt: string;
};

type TemplateSpec = {
  label: string;
  journal: string;
  description: string;
  bodyMode: "single" | "double";
  pageWidthClass: string;
  pagePaddingClass: string;
  pageToneClass: string;
  headerToneClass: string;
  fontFamily: string;
  titleFontSize: number;
  bodyFontSize: number;
  sectionFontSize: number;
  metaFontSize: number;
  lineHeight: number;
  backendTemplateId: string;
};

const STORAGE_KEY = "mi-writing-workspace-v5";

const templateSpecs: Record<TemplateId, TemplateSpec> = {
  qims: {
    label: "QIMS",
    journal: "Quantitative Imaging in Medicine and Surgery",
    description: "单栏医学期刊草稿视图，强调双倍行距和清晰段落节奏。",
    bodyMode: "single",
    pageWidthClass: "w-[210mm] max-w-full",
    pagePaddingClass: "px-[18mm] py-[18mm]",
    pageToneClass: "bg-white",
    headerToneClass: "text-slate-500",
    fontFamily: '"Times New Roman", Georgia, serif',
    titleFontSize: 24,
    bodyFontSize: 12,
    sectionFontSize: 13,
    metaFontSize: 11,
    lineHeight: 1.9,
    backendTemplateId: "qims-draft"
  },
  "eur-radiol": {
    label: "European Radiology",
    journal: "European Radiology",
    description: "单栏投稿草稿视图，保留前置信息和结构式摘要区。",
    bodyMode: "single",
    pageWidthClass: "w-[210mm] max-w-full",
    pagePaddingClass: "px-[18mm] py-[18mm]",
    pageToneClass: "bg-white",
    headerToneClass: "text-slate-500",
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    titleFontSize: 22,
    bodyFontSize: 11.5,
    sectionFontSize: 12.5,
    metaFontSize: 10.5,
    lineHeight: 1.85,
    backendTemplateId: "eur-radiol-draft"
  },
  rsna: {
    label: "Radiology RSNA",
    journal: "Radiology",
    description: "单栏研究稿视图，强调 Key Results 和紧凑摘要结构。",
    bodyMode: "single",
    pageWidthClass: "w-[216mm] max-w-full",
    pagePaddingClass: "px-[18mm] py-[16mm]",
    pageToneClass: "bg-white",
    headerToneClass: "text-slate-500",
    fontFamily: '"Times New Roman", Georgia, serif',
    titleFontSize: 23,
    bodyFontSize: 12,
    sectionFontSize: 13,
    metaFontSize: 11,
    lineHeight: 1.88,
    backendTemplateId: "rsna-radiology-draft"
  },
  elsevier: {
    label: "Elsevier",
    journal: "Elsevier Medical Journal",
    description: "前置信息单栏，正文双栏；表格和图可切换跨双栏。",
    bodyMode: "double",
    pageWidthClass: "w-[210mm] max-w-full",
    pagePaddingClass: "px-[16mm] py-[16mm]",
    pageToneClass: "bg-white",
    headerToneClass: "text-slate-500",
    fontFamily: '"Times New Roman", Georgia, serif',
    titleFontSize: 23,
    bodyFontSize: 10.5,
    sectionFontSize: 11.5,
    metaFontSize: 10,
    lineHeight: 1.55,
    backendTemplateId: "elsevier-cas-dc"
  },
  "lzu-master": {
    label: "兰大硕士",
    journal: "兰州大学硕士学位论文",
    description: "硕士毕业论文草稿视图，封面、摘要、目录、章节、图表和参考文献按学位论文流程组织。",
    bodyMode: "single",
    pageWidthClass: "w-[210mm] max-w-full",
    pagePaddingClass: "px-[24mm] py-[22mm]",
    pageToneClass: "bg-white",
    headerToneClass: "text-slate-500",
    fontFamily: '"Times New Roman", SimSun, serif',
    titleFontSize: 24,
    bodyFontSize: 12,
    sectionFontSize: 14,
    metaFontSize: 11,
    lineHeight: 1.85,
    backendTemplateId: "lzu-master-thesis"
  },
  "lzu-doctor": {
    label: "兰大博士",
    journal: "兰州大学博士学位论文",
    description: "博士毕业论文草稿视图，采用学位论文单栏长文结构并保留章节层级。",
    bodyMode: "single",
    pageWidthClass: "w-[210mm] max-w-full",
    pagePaddingClass: "px-[24mm] py-[22mm]",
    pageToneClass: "bg-white",
    headerToneClass: "text-slate-500",
    fontFamily: '"Times New Roman", SimSun, serif',
    titleFontSize: 24,
    bodyFontSize: 12,
    sectionFontSize: 14,
    metaFontSize: 11,
    lineHeight: 1.9,
    backendTemplateId: "lzu-doctor-thesis"
  }
};

const fontOptions = [
  { label: "Times", value: '"Times New Roman", Georgia, serif' },
  { label: "Arial", value: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Inter", value: "Inter, Arial, sans-serif" }
];

const fontSizeOptions = [10, 10.5, 11, 11.5, 12, 13, 14, 16, 18, 22, 24];

const initialBlocks: DocumentBlock[] = [
  {
    id: "title",
    kind: "text",
    role: "title",
    placement: "front",
    span: "full",
    content: "Histogram Analysis of ADC Maps for Differentiating Pathologic Groups in Medical Imaging"
  },
  {
    id: "meta",
    kind: "text",
    role: "meta",
    placement: "front",
    span: "full",
    content:
      "Original Article | AI-generated draft workspace | Local LaTeX template pipeline connected"
  },
  {
    id: "abstract",
    kind: "text",
    role: "abstract",
    placement: "front",
    span: "full",
    label: "Abstract",
    content:
      "Background: Quantitative imaging biomarkers may improve diagnostic discrimination. Methods: Structured manuscript generation is initialized from the user request and then aligned with the selected journal template. Results: The draft combines editable text, tables, figures, and a LaTeX export path. Conclusions: Final numerical statements remain coupled to the downstream statistical pipeline and PDF compilation."
  },
  {
    id: "sec-intro",
    kind: "text",
    role: "section",
    placement: "body",
    span: "single",
    content: "Introduction"
  },
  {
    id: "intro-1",
    kind: "text",
    role: "paragraph",
    placement: "body",
    span: "single",
    content:
      "Quantitative MRI parameters, particularly ADC- and histogram-derived metrics, are frequently used to distinguish pathologic groups when morphologic assessment alone is insufficient. The current draft starts from a structured user request and keeps the manuscript logic aligned with reporting guidance and reference-backed writing conventions [1,2]."
  },
  {
    id: "sec-methods",
    kind: "text",
    role: "section",
    placement: "body",
    span: "single",
    content: "Materials and Methods"
  },
  {
    id: "methods-1",
    kind: "text",
    role: "paragraph",
    placement: "body",
    span: "single",
    content:
      "The generation pipeline maps the prompt to a journal-aware manuscript scaffold, after which the user can refine title, abstract, sections, tables, and figure captions before final LaTeX compilation. Statistical and reporting details should remain tied to the eventual verified dataset and study design [1,2]."
  },
  {
    id: "table-1",
    kind: "table",
    placement: "body",
    span: "full",
    title: "Table 1. Baseline characteristics",
    note: "Editable cells remain inside the current template flow. Elsevier can keep this table within one column or span both columns.",
    headers: ["Variable", "Group A", "Group B", "P value"],
    rows: [
      ["ADC_mean", "1.12 ± 0.19", "0.96 ± 0.14", "0.031"],
      ["ADC_p10", "0.79 ± 0.11", "0.64 ± 0.10", "0.018"],
      ["Lesion size", "35.8 ± 9.6", "29.4 ± 8.1", "0.042"]
    ]
  },
  {
    id: "sec-results",
    kind: "text",
    role: "section",
    placement: "body",
    span: "single",
    content: "Results"
  },
  {
    id: "results-1",
    kind: "text",
    role: "paragraph",
    placement: "body",
    span: "single",
    content:
      "The current output layer combines dataset-driven text, editable tables, and figure placeholders in one continuous canvas. When the statistical service finishes, verified estimates, confidence intervals, and P values can be written back into the same document without breaking the selected template structure."
  },
  {
    id: "figure-1",
    kind: "figure",
    placement: "body",
    span: "full",
    title: "Figure 1. ROC analysis",
    caption:
      "Receiver operating characteristic analysis for selected histogram and ADC-derived variables. Double-click the caption to add it to the chat box.",
    imageLabel: "Editable figure placeholder / ROC canvas",
    widthPercent: 78,
    aspectRatio: "wide"
  },
  {
    id: "sec-discussion",
    kind: "text",
    role: "section",
    placement: "body",
    span: "single",
    content: "Discussion"
  },
  {
    id: "discussion-1",
    kind: "text",
    role: "paragraph",
    placement: "body",
    span: "single",
    content:
      "This workspace is intentionally closer to an editable manuscript surface than to a stack of independent cards. The browser canvas is used for structured editing, while final journal-style PDF output remains coupled to the server-side LaTeX compilation pipeline."
  }
];

function isTextBlock(block: DocumentBlock): block is TextBlock {
  return block.kind === "text";
}

function getBlockPlainText(block: DocumentBlock) {
  if (block.kind === "text") return block.content;
  if (block.kind === "table") {
    const rows = block.rows.map((row) => row.join(" | ")).join("\n");
    return `${block.title}\n${rows}\n${block.note}`;
  }

  return `${block.title}\n${block.caption}\n${block.imageLabel}`;
}

function getDefaultStyle(template: TemplateSpec, block: DocumentBlock) {
  if (block.kind === "text") {
    if (block.role === "title") {
      return {
        fontFamily: template.fontFamily,
        fontSize: template.titleFontSize,
        fontWeight: 700 as const,
        textAlign: "center" as const,
        lineHeight: 1.25
      };
    }

    if (block.role === "meta") {
      return {
        fontFamily: template.fontFamily,
        fontSize: template.metaFontSize,
        fontWeight: 400 as const,
        textAlign: "center" as const,
        lineHeight: 1.5
      };
    }

    if (block.role === "section") {
      return {
        fontFamily: template.fontFamily,
        fontSize: template.sectionFontSize,
        fontWeight: 700 as const,
        textAlign: "left" as const,
        lineHeight: 1.35
      };
    }

    return {
      fontFamily: template.fontFamily,
      fontSize: template.bodyFontSize,
      fontWeight: 400 as const,
      textAlign: "left" as const,
      lineHeight: template.lineHeight
    };
  }

  return {
    fontFamily: template.fontFamily,
    fontSize: template.bodyFontSize,
    fontWeight: 400 as const,
    textAlign: "left" as const,
    lineHeight: template.lineHeight
  };
}

function getAspectRatioClass(aspectRatio: AspectRatio) {
  if (aspectRatio === "square") return "aspect-square";
  if (aspectRatio === "tall") return "aspect-[4/5]";
  return "aspect-[16/9]";
}

function createClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildSubmissionPayload(
  blocks: DocumentBlock[],
  template: TemplateSpec
): ManuscriptInput {
  const titleBlock = blocks.find((block): block is TextBlock => block.kind === "text" && block.role === "title");
  const metaBlock = blocks.find((block): block is TextBlock => block.kind === "text" && block.role === "meta");
  const abstractBlock = blocks.find((block): block is TextBlock => block.kind === "text" && block.role === "abstract");

  const bodySections: { heading: string; body: string[] }[] = [];
  let activeSection: { heading: string; body: string[] } | null = null;

  for (const block of blocks) {
    if (block.kind !== "text" || block.placement !== "body") {
      continue;
    }

    if (block.role === "section") {
      activeSection = { heading: block.content.trim() || "Section", body: [] };
      bodySections.push(activeSection);
      continue;
    }

    if (!activeSection) {
      activeSection = { heading: "Introduction", body: [] };
      bodySections.push(activeSection);
    }

    activeSection.body.push(block.content.trim());
  }

  const tableBlocks = blocks.filter((block): block is TableBlock => block.kind === "table");
  const figureBlocks = blocks.filter((block): block is FigureBlock => block.kind === "figure");

  return {
    project_id: "demo-project",
    template_id: template.backendTemplateId,
    title: titleBlock?.content.trim() || "Untitled manuscript",
    short_title: (metaBlock?.content.split("|")[0] || titleBlock?.content || "Untitled").trim().slice(0, 80),
    authors: [
      {
        given_name: "First",
        family_name: "Author",
        email: "first.author@example.com",
        affiliation_ids: ["1"],
        is_corresponding: true,
        credit_roles: ["Conceptualization", "Writing - original draft"]
      },
      {
        given_name: "Second",
        family_name: "Author",
        email: "second.author@example.com",
        affiliation_ids: ["2"],
        is_corresponding: false,
        credit_roles: ["Formal analysis", "Visualization"]
      }
    ],
    affiliations: [
      {
        id: "1",
        organization: "Department of Radiology, Example Hospital",
        addressline: "Street 1",
        city: "Shanghai",
        postcode: "200000",
        state: "Shanghai",
        country: "China"
      },
      {
        id: "2",
        organization: "Medical Imaging Research Center, Example University",
        addressline: "Street 2",
        city: "Shanghai",
        postcode: "200000",
        state: "Shanghai",
        country: "China"
      }
    ],
    abstract: abstractBlock?.content.trim() || "",
    highlights: [
      "Dataset-first manuscript generation keeps draft statements tied to real variables.",
      "Elsevier submission PDF is compiled from an official LaTeX class rather than browser HTML.",
      "The editor and export pipeline are separated so layout review does not replace journal-grade compilation."
    ],
    keywords: [
      { value: "medical imaging" },
      { value: "MRI" },
      { value: "ADC" },
      { value: "histogram analysis" }
    ],
    sections: bodySections.map((section) => ({
      heading: section.heading,
      body: section.body.join("\n\n")
    })),
    figures: figureBlocks.map((block, index) => ({
      id: block.id,
      caption: block.caption,
      label: `fig:${index + 1}`,
      image_path: null,
      span: block.span === "full" ? "double" : "single"
    })),
    tables: tableBlocks.map((block, index) => ({
      id: block.id,
      caption: block.title,
      label: `tab:${index + 1}`,
      headers: block.headers,
      rows: block.rows,
      span: block.span === "full" ? "double" : "single"
    })),
    references: [
      {
        citation_key: "Bossuyt2015",
        entry_type: "article",
        title: "STARD 2015: an updated list of essential items for reporting diagnostic accuracy studies",
        authors: "Bossuyt PM and Reitsma JB and Bruns DE and others",
        journal: "BMJ",
        year: "2015",
        volume: "351",
        number: null,
        pages: "h5527",
        doi: "10.1136/bmj.h5527"
      },
      {
        citation_key: "Collins2015",
        entry_type: "article",
        title: "Transparent Reporting of a multivariable prediction model for Individual Prognosis Or Diagnosis (TRIPOD)",
        authors: "Collins GS and Reitsma JB and Altman DG and Moons KGM",
        journal: "Annals of Internal Medicine",
        year: "2015",
        volume: "162",
        number: "1",
        pages: "55-63",
        doi: "10.7326/M14-0697"
      }
    ]
  };
}

export default function WorkPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("elsevier");
  const [blocks, setBlocks] = useState<DocumentBlock[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string>("abstract");
  const [sourceDatasetName, setSourceDatasetName] = useState<string>("");
  const [sourceReferenceName, setSourceReferenceName] = useState<string>("");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState<string>("未保存");
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [templateRegistry, setTemplateRegistry] = useState<BackendTemplateSummary[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<SubmissionExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const pendingRaw = window.localStorage.getItem(PENDING_WORKSPACE_DRAFT_KEY);
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as {
          selectedTemplate: TemplateId;
          blocks: DocumentBlock[];
          savedAt: string;
          sourceDatasetName?: string;
          sourceReferenceName?: string;
          message?: string;
          chatHistory?: ChatEntry[];
          exportResult?: SubmissionExportResult | null;
          leftCollapsed?: boolean;
          rightCollapsed?: boolean;
        };
        if (pending.selectedTemplate) setSelectedTemplate(pending.selectedTemplate);
        if (Array.isArray(pending.blocks) && pending.blocks.length > 0) setBlocks(pending.blocks);
        if (pending.savedAt) setSavedAt(pending.savedAt);
        if (typeof pending.sourceDatasetName === "string") setSourceDatasetName(pending.sourceDatasetName);
        if (typeof pending.sourceReferenceName === "string") setSourceReferenceName(pending.sourceReferenceName);
        if (typeof pending.message === "string") setMessage(pending.message);
        if (Array.isArray(pending.chatHistory)) setChatHistory(pending.chatHistory);
        if (pending.exportResult) setExportResult(pending.exportResult);
        if (typeof pending.leftCollapsed === "boolean") setLeftCollapsed(pending.leftCollapsed);
        if (typeof pending.rightCollapsed === "boolean") setRightCollapsed(pending.rightCollapsed);
        window.localStorage.removeItem(PENDING_WORKSPACE_DRAFT_KEY);
        setHydrated(true);
        return;
      } catch {
        window.localStorage.removeItem(PENDING_WORKSPACE_DRAFT_KEY);
      }
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          selectedTemplate: TemplateId;
          blocks: DocumentBlock[];
          savedAt: string;
          sourceDatasetName?: string;
          sourceReferenceName?: string;
          message?: string;
          chatHistory?: ChatEntry[];
          exportResult?: SubmissionExportResult | null;
          leftCollapsed?: boolean;
          rightCollapsed?: boolean;
        };
        if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate);
        if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) setBlocks(parsed.blocks);
        if (parsed.savedAt) setSavedAt(parsed.savedAt);
        if (typeof parsed.sourceDatasetName === "string") setSourceDatasetName(parsed.sourceDatasetName);
        if (typeof parsed.sourceReferenceName === "string") setSourceReferenceName(parsed.sourceReferenceName);
        if (typeof parsed.message === "string") setMessage(parsed.message);
        if (Array.isArray(parsed.chatHistory)) setChatHistory(parsed.chatHistory);
        if (parsed.exportResult) setExportResult(parsed.exportResult);
        if (typeof parsed.leftCollapsed === "boolean") setLeftCollapsed(parsed.leftCollapsed);
        if (typeof parsed.rightCollapsed === "boolean") setRightCollapsed(parsed.rightCollapsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    fetchTemplateRegistry().then(setTemplateRegistry).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    setDirty(true);
  }, [blocks, chatHistory, hydrated, leftCollapsed, message, rightCollapsed, selectedTemplate]);

  const activeTemplate = templateSpecs[selectedTemplate];
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const frontBlocks = blocks.filter((block) => block.placement === "front");
  const titleBlock = frontBlocks.find(
    (block): block is TextBlock => block.kind === "text" && block.role === "title"
  ) ?? null;
  const metaBlock = frontBlocks.find(
    (block): block is TextBlock => block.kind === "text" && block.role === "meta"
  ) ?? null;
  const abstractBlock = frontBlocks.find(
    (block): block is TextBlock => block.kind === "text" && block.role === "abstract"
  ) ?? null;
  const bodyBlocks = blocks.filter((block) => block.placement === "body");
  const selectedStyle = selectedBlock ? { ...getDefaultStyle(activeTemplate, selectedBlock), ...selectedBlock.style } : null;
  const backendTemplate = templateRegistry.find((item) => item.id === activeTemplate.backendTemplateId);
  const exportTemplate = exportResult ? templateRegistry.find((item) => item.id === exportResult.template_id) : null;
  const pdfCompileSupported = backendTemplate?.pdf_compile_supported ?? true;
  const strictExportSupported = backendTemplate?.strict_pdf_supported ?? activeTemplate.backendTemplateId === "elsevier-cas-dc";
  const exportPdfUrl = toAbsoluteApiUrl(exportResult?.pdf_url ?? null);
  const manuscriptPreview = useMemo(() => buildSubmissionPayload(blocks, activeTemplate), [blocks, activeTemplate]);

  const artifacts = useMemo<ArtifactItem[]>(() => {
    const derived: ArtifactItem[] = blocks.flatMap((block): ArtifactItem[] => {
      if (block.kind === "table") {
        return [{ name: block.title, type: "结构化表格", status: block.span === "full" ? "跨栏" : "单栏" }];
      }

      if (block.kind === "figure") {
        return [{ name: block.title, type: "图像对象", status: `${block.widthPercent}% 宽度` }];
      }

      if (block.role === "title") {
        return [{ name: "Manuscript draft", type: "正文文本", status: "已排版" }];
      }

      return [];
    });

    return [
      ...derived,
      {
        name: activeTemplate.label,
        type: "LaTeX 模板样式",
        status: activeTemplate.bodyMode === "double" ? "双栏" : "单栏"
      },
      {
        name: strictExportSupported ? "Submission PDF" : "Template PDF",
        type: strictExportSupported ? "投稿级 LaTeX 导出" : "LaTeX 模板导出",
        status: exportResult?.compile_succeeded
          ? strictExportSupported
            ? "投稿版已生成"
            : "模板版已生成"
          : pdfCompileSupported
            ? "可编译"
            : "暂未接通",
        href: exportPdfUrl
      }
    ];
  }, [activeTemplate, blocks, exportPdfUrl, exportResult?.compile_succeeded, pdfCompileSupported, strictExportSupported]);

  const filteredArtifacts = useMemo(
    () => artifacts.filter((item) => `${item.name} ${item.type} ${item.status}`.toLowerCase().includes(query.toLowerCase())),
    [artifacts, query]
  );

  function appendToChat(text: string) {
    const normalized = text.trim();
    if (!normalized) return;
    setMessage((current) => {
      const prefix = current.trim().length > 0 ? `${current}\n\n` : "";
      return `${prefix}${normalized}`;
    });
  }

  function submitMessage() {
    const normalized = message.trim();
    if (!normalized) return;

    setChatHistory((current) => [
      ...current,
      {
        id: createClientId(),
        content: normalized,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
      }
    ]);
    setMessage("");
  }

  function updateBlock(id: string, updater: (block: DocumentBlock) => DocumentBlock) {
    setBlocks((current) => current.map((block) => (block.id === id ? updater(block) : block)));
  }

  function updateTextContent(id: string, content: string) {
    updateBlock(id, (block) => (isTextBlock(block) ? { ...block, content } : block));
  }

  function updateTableTitle(id: string, title: string) {
    updateBlock(id, (block) => (block.kind === "table" ? { ...block, title } : block));
  }

  function updateTableNote(id: string, note: string) {
    updateBlock(id, (block) => (block.kind === "table" ? { ...block, note } : block));
  }

  function updateTableCell(id: string, rowIndex: number, cellIndex: number, value: string) {
    updateBlock(id, (block) => {
      if (block.kind !== "table") return block;
      const rows = block.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentCellIndex) => (currentCellIndex === cellIndex ? value : cell))
          : row
      );
      return { ...block, rows };
    });
  }

  function addTableRow(id: string) {
    updateBlock(id, (block) => (block.kind === "table" ? { ...block, rows: [...block.rows, block.headers.map(() => "--")] } : block));
  }

  function removeTableRow(id: string) {
    updateBlock(id, (block) => {
      if (block.kind !== "table" || block.rows.length <= 1) return block;
      return { ...block, rows: block.rows.slice(0, -1) };
    });
  }

  function updateFigureTitle(id: string, title: string) {
    updateBlock(id, (block) => (block.kind === "figure" ? { ...block, title } : block));
  }

  function updateFigureCaption(id: string, caption: string) {
    updateBlock(id, (block) => (block.kind === "figure" ? { ...block, caption } : block));
  }

  function updateFigureLabel(id: string, imageLabel: string) {
    updateBlock(id, (block) => (block.kind === "figure" ? { ...block, imageLabel } : block));
  }

  function resizeFigure(id: string, delta: number) {
    updateBlock(id, (block) => {
      if (block.kind !== "figure") return block;
      return { ...block, widthPercent: Math.max(40, Math.min(100, block.widthPercent + delta)) };
    });
  }

  function cycleFigureAspect(id: string) {
    const order: AspectRatio[] = ["wide", "square", "tall"];
    updateBlock(id, (block) => {
      if (block.kind !== "figure") return block;
      const nextIndex = (order.indexOf(block.aspectRatio) + 1) % order.length;
      return { ...block, aspectRatio: order[nextIndex] };
    });
  }

  function updateSelectedStyle(patch: BlockStyle) {
    if (!selectedBlock) return;
    updateBlock(selectedBlock.id, (block) => ({ ...block, style: { ...block.style, ...patch } }));
  }

  function toggleSelectedBold() {
    if (!selectedStyle) return;
    updateSelectedStyle({ fontWeight: selectedStyle.fontWeight && selectedStyle.fontWeight >= 600 ? 400 : 700 });
  }

  function toggleSelectedAlignment(alignment: Alignment) {
    updateSelectedStyle({ textAlign: alignment });
  }

  function toggleSpanMode(id: string) {
    updateBlock(id, (block) => {
      if (block.placement !== "body") return block;
      return { ...block, span: block.span === "full" ? "single" : "full" };
    });
  }

  function saveWorkspace() {
    const timestamp = new Date().toLocaleString("zh-CN", { hour12: false });
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedTemplate,
        blocks,
        savedAt: timestamp,
        sourceDatasetName,
        sourceReferenceName,
        message,
        chatHistory,
        exportResult,
        leftCollapsed,
        rightCollapsed
      })
    );
    setSavedAt(timestamp);
    setDirty(false);
  }

  async function exportSubmission() {
    setIsExporting(true);
    setExportError(null);

    try {
      const payload = buildSubmissionPayload(blocks, activeTemplate);
      const result = await exportSubmissionPdf(payload);
      setExportResult(result);
      if (!result.compile_succeeded) {
        setExportError("模板编译未完全通过，请查看右侧输出物或后端日志。");
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "PDF 导出失败");
      setExportResult(null);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppHeader />
      <div className="workspace-shell h-[calc(100vh-4rem)] overflow-hidden p-4">
        <div className="workspace-grid grid h-full grid-cols-[auto_minmax(0,1fr)_auto] gap-4">
          <aside
            className={cn(
              "workspace-sidebar min-h-0 transition-all duration-200",
              leftCollapsed ? "w-12" : "w-[320px]"
            )}
          >
            {leftCollapsed ? (
              <div className="flex h-full flex-col items-center rounded-lg border bg-white py-3 shadow-soft">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLeftCollapsed(false)}
                  title="展开左侧栏"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 shadow-soft">
                  <div className="text-sm font-medium">输入与模板</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLeftCollapsed(true)}
                    title="收起左侧栏"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>

                <Card className="shrink-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareText className="h-5 w-5 text-primary" />
                      稿件来源
                    </CardTitle>
                    <CardDescription>当前页用于编辑首页生成后的稿件结构、表格、图注和模板排版。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                      <span className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-primary" />
                        AI 对话生成
                      </span>
                      <Badge variant="success">当前源</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                      <span className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4 text-slate-600" />
                        当前模板
                      </span>
                      <Badge variant="outline">{activeTemplate.label}</Badge>
                    </div>
                    <div className="rounded-md border bg-white px-3 py-2">
                      <div className="text-xs text-slate-500">数据表</div>
                      <div className="mt-1 text-sm text-slate-700">{sourceDatasetName || "首页未传入文件名"}</div>
                    </div>
                    <div className="rounded-md border bg-white px-3 py-2">
                      <div className="text-xs text-slate-500">参考文章</div>
                      <div className="mt-1 text-sm text-slate-700">{sourceReferenceName || "未附加参考文章"}</div>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <div className="font-medium">最近请求</div>
                      <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">
                        {message.trim() || chatHistory.at(-1)?.content || "当前稿件由首页对话生成，可继续在底部输入框中细化修改要求。"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex min-h-0 flex-1 flex-col">
                  <CardHeader className="shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <LayoutTemplate className="h-5 w-5 text-primary" />
                      模板样式
                    </CardTitle>
                    <CardDescription>模板控制文档画板，不把段落拆成固定宽度卡片。</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 space-y-2 overflow-auto">
                    {(Object.entries(templateSpecs) as Array<[TemplateId, TemplateSpec]>).map(([id, template]) => (
                      <button
                        key={id}
                        onClick={() => setSelectedTemplate(id)}
                        className={cn(
                          "w-full rounded-md border px-3 py-3 text-left text-sm transition-colors",
                          selectedTemplate === id ? "border-primary bg-primary/5" : "bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{template.label}</div>
                          <Badge variant={selectedTemplate === id ? "success" : "outline"}>
                            {template.bodyMode === "double" ? "双栏" : "单栏"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{template.description}</div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </aside>

          <section className="workspace-main flex min-w-0 min-h-0 flex-col overflow-hidden rounded-lg border bg-white shadow-soft">
            <div className="workspace-toolbar-bar flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activeTemplate.label}</Badge>
                <Badge variant="secondary">{activeTemplate.journal}</Badge>
                <Badge variant={dirty ? "warning" : "success"}>{dirty ? "未保存更改" : `已保存 ${savedAt}`}</Badge>
                <span className="text-sm text-muted-foreground">
                  {activeTemplate.bodyMode === "double" ? "正文双栏" : "正文单栏"} · 模板编辑板
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-1.5">
                  <Type className="h-4 w-4 text-slate-500" />
                  <select
                    value={selectedStyle?.fontFamily ?? activeTemplate.fontFamily}
                    onChange={(event) => updateSelectedStyle({ fontFamily: event.target.value })}
                    disabled={!selectedBlock}
                    className="bg-transparent text-sm outline-none disabled:cursor-not-allowed"
                  >
                    {fontOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-1.5">
                  <select
                    value={selectedStyle?.fontSize ?? activeTemplate.bodyFontSize}
                    onChange={(event) => updateSelectedStyle({ fontSize: Number(event.target.value) })}
                    disabled={!selectedBlock}
                    className="bg-transparent text-sm outline-none disabled:cursor-not-allowed"
                  >
                    {fontSizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size} pt
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant={selectedStyle?.fontWeight && selectedStyle.fontWeight >= 600 ? "default" : "outline"}
                  size="sm"
                  disabled={!selectedBlock}
                  onClick={toggleSelectedBold}
                >
                  <Bold className="h-4 w-4" />
                </Button>

                <Button
                  variant={selectedStyle?.textAlign === "left" ? "default" : "outline"}
                  size="sm"
                  disabled={!selectedBlock}
                  onClick={() => toggleSelectedAlignment("left")}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant={selectedStyle?.textAlign === "center" ? "default" : "outline"}
                  size="sm"
                  disabled={!selectedBlock}
                  onClick={() => toggleSelectedAlignment("center")}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>

                {selectedBlock &&
                selectedBlock.placement === "body" &&
                (selectedBlock.kind === "table" || selectedBlock.kind === "figure") ? (
                  <Button variant="outline" size="sm" onClick={() => toggleSpanMode(selectedBlock.id)}>
                    <Columns2 className="h-4 w-4" />
                    {selectedBlock.span === "full" ? "当前跨栏" : "当前单栏"}
                  </Button>
                ) : null}

                <Button variant="outline" size="sm" onClick={saveWorkspace}>
                  <Save className="h-4 w-4" />
                  保存
                </Button>
                <Button size="sm" onClick={exportSubmission} disabled={isExporting || !pdfCompileSupported}>
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {strictExportSupported ? "导出投稿 PDF" : "导出模板 PDF"}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 px-6 pb-28 pt-6 sm:pb-32">
              <div
                className={cn(
                  "document-page mx-auto border border-slate-200 shadow-soft",
                  activeTemplate.pageWidthClass,
                  activeTemplate.pagePaddingClass,
                  activeTemplate.pageToneClass
                )}
              >
                <div className="mb-5 border-b border-slate-200 pb-4">
                  <div className={cn("flex items-center justify-between text-[10px] uppercase tracking-[0.18em]", activeTemplate.headerToneClass)}>
                    <span>{activeTemplate.journal}</span>
                    <span>{strictExportSupported ? "Submission layout" : "Template layout"}</span>
                  </div>
                </div>

                <section className="border-b border-slate-200 pb-6">
                  {titleBlock ? (
                    <section
                      onClick={() => setSelectedId(titleBlock.id)}
                      onDoubleClick={() => appendToChat(titleBlock.content)}
                      className={cn(
                        "rounded-sm border border-transparent px-1 py-1 transition-colors",
                        selectedId === titleBlock.id && "bg-primary/5 ring-1 ring-primary/30"
                      )}
                    >
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(titleBlock.id);
                        }}
                        onBlur={(event) => updateTextContent(titleBlock.id, event.currentTarget.innerText)}
                        className="editable-block whitespace-pre-wrap break-words text-center font-semibold outline-none"
                        style={{ ...getDefaultStyle(activeTemplate, titleBlock), ...titleBlock.style }}
                      >
                        {titleBlock.content}
                      </div>
                    </section>
                  ) : null}

                  <div className="mt-4 text-center text-[11px] leading-6 text-slate-700" style={{ fontFamily: activeTemplate.fontFamily }}>
                    {manuscriptPreview.authors.map((author) => `${author.given_name} ${author.family_name}`).join(", ")}
                  </div>

                  <div className="mt-2 space-y-1 text-center text-[10.5px] text-slate-500" style={{ fontFamily: activeTemplate.fontFamily }}>
                    {manuscriptPreview.affiliations.map((affiliation) => (
                      <div key={affiliation.id}>
                        {affiliation.organization}
                        {affiliation.city ? `, ${affiliation.city}` : ""}
                        {affiliation.country ? `, ${affiliation.country}` : ""}
                      </div>
                    ))}
                  </div>

                  {metaBlock ? (
                    <section
                      onClick={() => setSelectedId(metaBlock.id)}
                      onDoubleClick={() => appendToChat(metaBlock.content)}
                      className={cn(
                        "mt-4 rounded-sm border border-transparent px-1 py-1 transition-colors",
                        selectedId === metaBlock.id && "bg-primary/5 ring-1 ring-primary/30"
                      )}
                    >
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(metaBlock.id);
                        }}
                        onBlur={(event) => updateTextContent(metaBlock.id, event.currentTarget.innerText)}
                        className="editable-block whitespace-pre-wrap text-center outline-none"
                        style={{ ...getDefaultStyle(activeTemplate, metaBlock), ...metaBlock.style }}
                      >
                        {metaBlock.content}
                      </div>
                    </section>
                  ) : null}

                  {abstractBlock ? (
                    <section
                      onClick={() => setSelectedId(abstractBlock.id)}
                      onDoubleClick={() => appendToChat(abstractBlock.content)}
                      className={cn(
                        "mt-5 rounded-sm border border-transparent px-1 py-1 transition-colors",
                        selectedId === abstractBlock.id && "bg-primary/5 ring-1 ring-primary/30"
                      )}
                    >
                      {abstractBlock.label ? (
                        <div
                          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                          style={{ fontFamily: activeTemplate.fontFamily }}
                        >
                          {abstractBlock.label}
                        </div>
                      ) : null}
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(abstractBlock.id);
                        }}
                        onBlur={(event) => updateTextContent(abstractBlock.id, event.currentTarget.innerText)}
                        className="editable-block whitespace-pre-wrap break-words outline-none"
                        style={{ ...getDefaultStyle(activeTemplate, abstractBlock), ...abstractBlock.style }}
                      >
                        {abstractBlock.content}
                      </div>
                    </section>
                  ) : null}

                  <div className="mt-4 text-[10.5px] text-slate-600" style={{ fontFamily: activeTemplate.fontFamily }}>
                    <span className="font-semibold">Keywords: </span>
                    {manuscriptPreview.keywords.map((keyword) => keyword.value).join("; ")}
                  </div>
                </section>

                <article
                  className={cn("mt-6", activeTemplate.bodyMode === "double" ? "latex-body-columns" : "space-y-4")}
                >
                  {bodyBlocks.map((block) => {
                    const isSelected = selectedId === block.id;
                    const resolvedStyle = { ...getDefaultStyle(activeTemplate, block), ...block.style };
                    const containerClass = cn(
                      "latex-flow-block rounded-sm border border-transparent px-1 py-1 transition-colors",
                      activeTemplate.bodyMode === "double" && block.span === "full" && "latex-column-span-all",
                      isSelected && "bg-primary/5 ring-1 ring-primary/30"
                    );

                    if (block.kind === "text") {
                      return (
                        <section
                          key={block.id}
                          onClick={() => setSelectedId(block.id)}
                          onDoubleClick={() => appendToChat(block.content)}
                          className={containerClass}
                        >
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(block.id);
                            }}
                            onBlur={(event) => updateTextContent(block.id, event.currentTarget.innerText)}
                            className={cn(
                              "editable-block whitespace-pre-wrap break-words outline-none",
                              block.role === "section" && "mb-1 border-b border-slate-200 pb-1"
                            )}
                            style={resolvedStyle}
                          >
                            {block.content}
                          </div>
                        </section>
                      );
                    }

                    if (block.kind === "table") {
                      return (
                        <section key={block.id} onClick={() => setSelectedId(block.id)} className={containerClass}>
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(block.id);
                            }}
                            onBlur={(event) => updateTableTitle(block.id, event.currentTarget.innerText)}
                            className="editable-block text-[11px] font-semibold outline-none"
                            style={{ fontFamily: resolvedStyle.fontFamily }}
                          >
                            {block.title}
                          </div>

                          <div className="mt-3 overflow-x-auto rounded-sm border border-slate-300">
                            <table
                              className="w-full border-collapse"
                              style={{ fontFamily: resolvedStyle.fontFamily, fontSize: resolvedStyle.fontSize }}
                            >
                              <thead className="bg-slate-50">
                                <tr>
                                  {block.headers.map((header) => (
                                    <th key={header} className="border-b border-slate-300 px-2 py-2 text-left font-semibold">
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {block.rows.map((row, rowIndex) => (
                                  <tr key={`${block.id}-row-${rowIndex}`} className="border-b border-slate-200 last:border-b-0">
                                    {row.map((cell, cellIndex) => (
                                      <td key={`${block.id}-${rowIndex}-${cellIndex}`} className="align-top">
                                        <div
                                          contentEditable
                                          suppressContentEditableWarning
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedId(block.id);
                                          }}
                                          onBlur={(event) =>
                                            updateTableCell(block.id, rowIndex, cellIndex, event.currentTarget.innerText)
                                          }
                                          className="editable-block min-h-10 whitespace-pre-wrap px-2 py-2 outline-none"
                                        >
                                          {cell}
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                addTableRow(block.id);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              添加行
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeTableRow(block.id);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                              删除行
                            </Button>
                            <Badge variant="outline">{block.span === "full" ? "跨栏表格" : "单栏表格"}</Badge>
                          </div>

                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onDoubleClick={() => appendToChat(block.note)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(block.id);
                            }}
                            onBlur={(event) => updateTableNote(block.id, event.currentTarget.innerText)}
                            className="editable-block mt-2 whitespace-pre-wrap text-[11px] text-slate-600 outline-none"
                            style={{ fontFamily: resolvedStyle.fontFamily, lineHeight: resolvedStyle.lineHeight }}
                          >
                            {block.note}
                          </div>
                        </section>
                      );
                    }

                    return (
                      <section key={block.id} onClick={() => setSelectedId(block.id)} className={containerClass}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(block.id);
                            }}
                            onBlur={(event) => updateFigureTitle(block.id, event.currentTarget.innerText)}
                            className="editable-block text-[11px] font-semibold outline-none"
                            style={{ fontFamily: resolvedStyle.fontFamily }}
                          >
                            {block.title}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                resizeFigure(block.id, -6);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                resizeFigure(block.id, 6);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                cycleFigureAspect(block.id);
                              }}
                            >
                              <ImageIcon className="h-4 w-4" />
                              {block.aspectRatio}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-center">
                          <div
                            className="rounded-sm border border-slate-300 bg-slate-50 p-3 transition-all"
                            style={{ width: `${block.widthPercent}%` }}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center rounded-sm border border-dashed border-slate-300 bg-white",
                                getAspectRatioClass(block.aspectRatio)
                              )}
                            >
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(block.id);
                                }}
                                onBlur={(event) => updateFigureLabel(block.id, event.currentTarget.innerText)}
                                className="editable-block px-6 text-center text-sm text-slate-500 outline-none"
                              >
                                {block.imageLabel}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{block.widthPercent}% 宽度</Badge>
                          <Badge variant="outline">{block.span === "full" ? "跨栏图像" : "单栏图像"}</Badge>
                        </div>

                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onDoubleClick={() => appendToChat(block.caption)}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(block.id);
                          }}
                          onBlur={(event) => updateFigureCaption(block.id, event.currentTarget.innerText)}
                          className="editable-block mt-2 whitespace-pre-wrap text-[11px] text-slate-600 outline-none"
                          style={{ fontFamily: resolvedStyle.fontFamily, lineHeight: resolvedStyle.lineHeight }}
                        >
                          {block.caption}
                        </div>
                      </section>
                    );
                  })}
                </article>

                <section className="mt-8 border-t border-slate-200 pt-4">
                  <div
                    className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                    style={{ fontFamily: activeTemplate.fontFamily }}
                  >
                    References
                  </div>
                  <div className={cn(activeTemplate.bodyMode === "double" ? "latex-body-columns" : "space-y-3")}>
                    {manuscriptPreview.references.map((reference, index) => (
                      <div
                        key={reference.citation_key}
                        className="latex-flow-block text-[10.5px] leading-6 text-slate-700"
                        style={{ fontFamily: activeTemplate.fontFamily }}
                      >
                        [{index + 1}] {reference.authors}. {reference.title}. {reference.journal ?? "Journal"}.
                        {" "}
                        {reference.year}
                        {reference.volume ? `;${reference.volume}` : ""}
                        {reference.number ? `(${reference.number})` : ""}
                        {reference.pages ? `:${reference.pages}` : ""}.
                        {reference.doi ? ` doi:${reference.doi}` : ""}
                      </div>
                    ))}
                  </div>
                </section>

                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500">
                  <span>{activeTemplate.journal}</span>
                  <span>{strictExportSupported ? "Submission manuscript editor" : "Template manuscript editor"}</span>
                  <span>Page 1</span>
                </div>
              </div>
            </div>
          </section>

          <aside
            className={cn(
              "workspace-right min-h-0 transition-all duration-200",
              rightCollapsed ? "w-12" : "w-[300px]"
            )}
          >
            {rightCollapsed ? (
              <div className="flex h-full flex-col items-center rounded-lg border bg-white py-3 shadow-soft">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRightCollapsed(false)}
                  title="展开右侧栏"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Card className="flex h-full flex-col">
                <CardHeader className="shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        输出物查询
                      </CardTitle>
                      <CardDescription>检索当前画板中的文本、表格、图和导出对象。</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setRightCollapsed(true)} title="收起右侧栏">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索 Table、Figure、PDF、LaTeX..."
                  />
                  <div className="min-h-0 flex-1 space-y-3 overflow-auto">
                    {filteredArtifacts.map((item) =>
                      item.href ? (
                        <a
                          key={`${item.name}-${item.type}`}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border bg-white p-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">{item.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.type}</div>
                            </div>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                        </a>
                      ) : (
                        <button
                          key={`${item.name}-${item.type}`}
                          className="w-full rounded-lg border bg-white p-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">{item.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.type}</div>
                            </div>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                        </button>
                      )
                    )}
                  </div>

                  {exportResult ? (
                    <div className="rounded-md border bg-white p-3 text-xs text-slate-600">
                      <div className="font-medium text-slate-900">最近一次 PDF 导出</div>
                      <div className="mt-2 space-y-1">
                        <div>模板：{exportResult.template_id}</div>
                        <div>编译状态：{exportResult.compile_succeeded ? "成功" : "未完全成功"}</div>
                        <div>
                          导出类型：
                          {exportTemplate?.strict_pdf_supported ? "严格投稿模板" : "本地 LaTeX 模板"}
                        </div>
                        {exportPdfUrl ? (
                          <a className="text-primary underline" href={exportPdfUrl} target="_blank" rel="noreferrer">
                            打开生成 PDF
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {backendTemplate?.notes?.length ? (
                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                      <div className="font-medium text-slate-700">模板说明</div>
                      <div className="mt-2 space-y-1">
                        {backendTemplate.notes.map((note) => (
                          <div key={note}>{note}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        {historyOpen ? (
          <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 w-[min(760px,calc(100vw-1rem))] -translate-x-1/2 px-2">
            <Card className="pointer-events-auto border-slate-300 bg-white/96 shadow-2xl backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                      对话记录
                    </CardTitle>
                    <CardDescription>双击画板段落、表注或图注，可直接加入底部输入框。</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(false)} title="关闭对话记录">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-slate-50/80 p-3 text-sm text-slate-700">
                  <div className="flex gap-2">
                    <Bot className="mt-0.5 h-4 w-4 text-primary" />
                    <div>当前画板按 {activeTemplate.label} 模板排版编辑。最终 PDF 以右侧导出的 LaTeX 编译结果为准。</div>
                  </div>
                </div>

                {selectedBlock ? (
                  <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                    <div className="mb-1 text-xs font-medium text-primary">当前选中对象</div>
                    <div className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-600">
                      {getBlockPlainText(selectedBlock)}
                    </div>
                  </div>
                ) : null}

                <div className="max-h-72 space-y-3 overflow-auto">
                  {chatHistory.length > 0 ? (
                    chatHistory
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <div key={entry.id} className="rounded-lg border bg-white p-3">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">用户</Badge>
                              <span className="flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {entry.createdAt}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => appendToChat(entry.content)}>
                              再次加入
                            </Button>
                          </div>
                          <div className="whitespace-pre-wrap text-sm text-slate-700">{entry.content}</div>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
                      暂无已发送对话
                    </div>
                  )}
                </div>

                {message.trim() ? (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-3">
                    <div className="mb-1 text-xs font-medium text-slate-500">当前输入草稿</div>
                    <div className="whitespace-pre-wrap text-sm text-slate-700">{message}</div>
                  </div>
                ) : null}

                {exportError ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {exportError}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {exportError && !historyOpen ? (
          <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 w-[min(720px,calc(100vw-1rem))] -translate-x-1/2 px-2">
            <div className="pointer-events-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg">
              {exportError}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 w-[min(880px,calc(100vw-1rem))] -translate-x-1/2 px-2">
          <div className="pointer-events-auto rounded-2xl border border-slate-300 bg-white/96 px-2 py-2 shadow-2xl backdrop-blur">
            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={!selectedBlock}
                onClick={() => {
                  if (!selectedBlock) return;
                  appendToChat(getBlockPlainText(selectedBlock));
                }}
                title="添加当前选中对象"
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage();
                    }
                  }}
                  placeholder="输入修改要求，或双击画板对象加入这里"
                  className="min-h-[40px] max-h-32 w-full resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant={historyOpen ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setHistoryOpen((current) => !current)}
                  title="查看对话记录"
                  className="relative h-10 w-10 shrink-0 rounded-xl"
                >
                  <MessageSquareText className="h-4 w-4" />
                  {chatHistory.length > 0 ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </Button>
                <Button
                  onClick={submitMessage}
                  disabled={!message.trim()}
                  size="icon"
                  title="发送"
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
