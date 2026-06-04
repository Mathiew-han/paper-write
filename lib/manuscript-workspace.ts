import type { ManuscriptInput } from "@/lib/api";

export type TemplateId = "qims" | "eur-radiol" | "rsna" | "elsevier" | "lzu-master" | "lzu-doctor";
export type TextRole = "title" | "meta" | "section" | "abstract" | "paragraph";
export type Alignment = "left" | "center";
export type SpanMode = "single" | "full";
export type AspectRatio = "wide" | "square" | "tall";

export type BlockStyle = Partial<{
  fontFamily: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  textAlign: Alignment;
  lineHeight: number;
}>;

export type TextBlock = {
  id: string;
  kind: "text";
  role: TextRole;
  placement: "front" | "body";
  span: SpanMode;
  label?: string;
  content: string;
  style?: BlockStyle;
};

export type TableBlock = {
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

export type FigureBlock = {
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

export type DocumentBlock = TextBlock | TableBlock | FigureBlock;

export type TemplateSpec = {
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

export type WorkspaceDraft = {
  selectedTemplate: TemplateId;
  blocks: DocumentBlock[];
  savedAt: string;
  sourceDatasetName?: string;
  sourceReferenceName?: string;
  message?: string;
  chatHistory?: Array<{ id: string; content: string; createdAt: string }>;
  exportResult?: unknown;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
};

export const PENDING_WORKSPACE_DRAFT_KEY = "mi-writing-pending-draft-v1";

export const templateSpecs: Record<TemplateId, TemplateSpec> = {
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

export const initialBlocks: DocumentBlock[] = [
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
      "Quantitative MRI parameters, particularly ADC- and histogram-derived metrics, are frequently used to distinguish pathologic groups when morphologic assessment alone is insufficient. The current project starts from a structured user request so that the manuscript logic, results text, and downstream tables remain tied to an explicit drafting intent."
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
      "The generation pipeline maps the prompt to a journal-aware manuscript scaffold, after which the user chooses or edits a LaTeX template-compatible layout before final compilation proceeds."
  },
  {
    id: "table-1",
    kind: "table",
    placement: "body",
    span: "full",
    title: "Table 1. Baseline characteristics",
    note: "Editable cells remain inside the current template flow. The final submitted PDF will still be compiled from the corresponding LaTeX template.",
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
      "The current output layer combines prompt-driven text, editable tables, and figure placeholders in one continuous manuscript canvas. Verified estimates, confidence intervals, and P values can later be written back into the same document without breaking the selected template structure."
  },
  {
    id: "figure-1",
    kind: "figure",
    placement: "body",
    span: "full",
    title: "Figure 1. ROC analysis",
    caption: "Receiver operating characteristic analysis for selected histogram and ADC-derived variables.",
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
      "This workspace is intentionally closer to an editable manuscript surface than to a stack of independent cards. The browser canvas is used for structured editing, while the final journal-style PDF remains coupled to the server-side LaTeX compilation pipeline."
  }
];

function cloneBlocks(blocks: DocumentBlock[]) {
  return JSON.parse(JSON.stringify(blocks)) as DocumentBlock[];
}

function sanitizePrompt(prompt: string) {
  return prompt.replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseKeywordText(value?: string) {
  return (value ?? "")
    .split(/[;,，；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveEnglishTopic(prompt: string) {
  const normalized = sanitizePrompt(prompt);
  if (!normalized) {
    return "medical imaging research draft";
  }

  return normalized.slice(0, 96);
}

function deriveTitle(prompt: string) {
  const topic = deriveEnglishTopic(prompt);
  if (topic === "medical imaging research draft") {
    return "Medical Imaging Study Draft for Journal-Style PDF Export";
  }

  const compact = topic.replace(/[.?!].*$/, "").trim();
  const trimmed = compact.length > 88 ? `${compact.slice(0, 85).trim()}...` : compact;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function createDraftFromPrompt(
  prompt: string,
  templateId: TemplateId,
  sourceDatasetName?: string,
  sourceReferenceName?: string
): WorkspaceDraft {
  const topic = deriveEnglishTopic(prompt);
  const title = deriveTitle(prompt);
  const template = templateSpecs[templateId];
  const blocks = cloneBlocks(initialBlocks);
  const savedAt = new Date().toLocaleString("zh-CN", { hour12: false });

  return {
    selectedTemplate: templateId,
    savedAt,
    sourceDatasetName,
    sourceReferenceName,
    message: prompt.trim(),
    chatHistory: prompt.trim()
      ? [{ id: `seed-${Date.now()}`, content: prompt.trim(), createdAt: savedAt }]
      : [],
    leftCollapsed: false,
    rightCollapsed: false,
    blocks: blocks.map((block) => {
      if (block.kind !== "text") {
        return block;
      }

      if (block.role === "title") {
        return { ...block, content: title };
      }

      if (block.role === "meta") {
        return {
          ...block,
          content:
            `Original Article | ${template.label} | AI-generated from homepage prompt` +
            (sourceDatasetName ? ` | Dataset: ${sourceDatasetName}` : "") +
            (sourceReferenceName ? ` | Reference: ${sourceReferenceName}` : "")
        };
      }

      if (block.role === "abstract") {
        return {
          ...block,
          content:
            `Background: ${topic} was selected as the drafting target from the homepage request. ` +
            "Methods: A journal-aware manuscript scaffold was created and aligned with the selected LaTeX template. " +
            "Results: The generated draft includes editable text, tables, figures, and a direct PDF compilation path. " +
            "Conclusions: The resulting manuscript can be reviewed as PDF and then refined inside the editor."
        };
      }

      if (block.id === "intro-1") {
        return {
          ...block,
          content:
            `The manuscript was initiated from a user request focused on ${topic}. ` +
            "This first-pass draft preserves a journal-style structure while leaving room for later refinement of claims, numbers, and figure logic."
        };
      }

      if (block.id === "methods-1") {
        return {
          ...block,
          content:
            "The homepage generation step creates a structured paper shell with title, abstract, section hierarchy, editable tables, and figure placeholders. " +
            "The corresponding PDF is compiled directly through the server-side LaTeX export pipeline."
        };
      }

      if (block.id === "results-1") {
        return {
          ...block,
          content:
            "The first generated PDF is intended to give the user a template-aligned manuscript snapshot immediately after the initial request. " +
            "Subsequent editing can then adjust narrative detail, tables, figure captions, and section wording without abandoning the chosen template."
        };
      }

      if (block.id === "discussion-1") {
        return {
          ...block,
          content:
            "This workflow separates initial generation from later editing. The homepage focuses on rapid PDF production, while the editor focuses on template-aware refinement of the manuscript surface."
        };
      }

      return block;
    })
  };
}

export function buildSubmissionPayload(blocks: DocumentBlock[], template: TemplateSpec): ManuscriptInput {
  const titleBlock = blocks.find(
    (block): block is TextBlock => block.kind === "text" && block.role === "title"
  );
  const metaBlock = blocks.find(
    (block): block is TextBlock => block.kind === "text" && block.role === "meta"
  );
  const abstractBlock = blocks.find(
    (block): block is TextBlock => block.kind === "text" && block.role === "abstract"
  );
  const textBlocks = blocks.filter((block): block is TextBlock => block.kind === "text");
  const isLzu = template.backendTemplateId === "lzu-master-thesis" || template.backendTemplateId === "lzu-doctor-thesis";
  const englishTitleBlock = textBlocks.find((block) => block.id === "english-title" || block.label === "英文题名");
  const chineseAbstractBlock = textBlocks.find((block) => block.id === "chinese-abstract" || block.label === "中文摘要");
  const englishAbstractBlock = textBlocks.find((block) => block.id === "english-abstract" || block.label === "English Abstract");
  const chineseKeywordsBlock = textBlocks.find((block) => block.id === "chinese-keywords" || block.label === "中文关键词");
  const englishKeywordsBlock = textBlocks.find((block) => block.id === "english-keywords" || block.label === "English Keywords");
  const chineseKeywords = parseKeywordText(chineseKeywordsBlock?.content);
  const englishKeywords = parseKeywordText(englishKeywordsBlock?.content);

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
    english_title: isLzu ? englishTitleBlock?.content.trim() || null : undefined,
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
    abstract: isLzu
      ? chineseAbstractBlock?.content.trim() || abstractBlock?.content.trim() || ""
      : abstractBlock?.content.trim() || "",
    chinese_abstract: isLzu ? chineseAbstractBlock?.content.trim() || abstractBlock?.content.trim() || "" : undefined,
    english_abstract: isLzu ? englishAbstractBlock?.content.trim() || null : undefined,
    chinese_keywords: isLzu ? chineseKeywords : undefined,
    english_keywords: isLzu ? englishKeywords : undefined,
    highlights: [
      "Immediate homepage prompt-to-PDF generation for manuscript initiation.",
      "Template-aware editing surface linked to the same LaTeX export pipeline.",
      "Journal-style text, table, figure, and reference scaffolds remain editable after generation."
    ],
    keywords: [
      { value: "medical imaging" },
      { value: "MRI" },
      { value: "ADC" },
      { value: "manuscript drafting" }
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
