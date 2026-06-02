"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  PencilLine,
  Send,
  Upload,
  X
} from "lucide-react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataQualityGateError,
  fetchFigurePromptOptions,
  generateDraftWithDataset,
  runPdfSelfTest,
  toAbsoluteApiUrl,
  type DatasetGovernance,
  type DatasetQualityGate,
  type FigurePromptOption,
  type PdfSelfTestResult,
  type SubmissionExportResult
} from "@/lib/api";
import {
  PENDING_WORKSPACE_DRAFT_KEY,
  templateSpecs,
  type TemplateId,
  type WorkspaceDraft
} from "@/lib/manuscript-workspace";

const templateOrder: TemplateId[] = ["elsevier", "eur-radiol", "qims", "rsna", "lzu-master", "lzu-doctor"];
const defaultFigureOptions: FigurePromptOption[] = [
  {
    id: "workflow",
    label: "研究流程图",
    description: "Cohort、影像、特征矩阵、模型、论文输出。",
    prompt_focus: "left-to-right manuscript workflow diagram"
  },
  {
    id: "model_pipeline",
    label: "模型管线图",
    description: "预处理、特征筛选、建模、验证和输出。",
    prompt_focus: "clinical imaging model development pipeline"
  },
  {
    id: "statistical_summary",
    label: "统计结果图",
    description: "ROC、校准、DCA、分组比较和热图。",
    prompt_focus: "statistical result figure"
  },
  {
    id: "clinical_pathway",
    label: "临床路径图",
    description: "影像检查、风险分层、临床决策和证据边界。",
    prompt_focus: "clinical decision pathway"
  }
];

export default function HomePage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("elsevier");
  const [prompt, setPrompt] = useState("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [dataSource, setDataSource] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("");
  const [expectedProblem, setExpectedProblem] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<WorkspaceDraft | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<SubmissionExportResult | null>(null);
  const [governance, setGovernance] = useState<DatasetGovernance | null>(null);
  const [llmStatus, setLlmStatus] = useState<{ used: boolean; provider?: string | null; error?: string | null } | null>(null);
  const [qualityGate, setQualityGate] = useState<DatasetQualityGate | null>(null);
  const [pendingQualityGate, setPendingQualityGate] = useState<DatasetQualityGate | null>(null);
  const [selectedFigurePrompt, setSelectedFigurePrompt] = useState<FigurePromptOption["id"]>("workflow");
  const [figureOptions, setFigureOptions] = useState<FigurePromptOption[]>(defaultFigureOptions);
  const [pdfSelfTest, setPdfSelfTest] = useState<PdfSelfTestResult | null>(null);
  const [isTestingPdf, setIsTestingPdf] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const datasetInputRef = useRef<HTMLInputElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplate = templateSpecs[selectedTemplate];
  const generatedPdfUrl = toAbsoluteApiUrl(generatedPdf?.pdf_url ?? null);
  const selectedFigureOption = figureOptions.find((option) => option.id === selectedFigurePrompt) ?? figureOptions[0];

  useEffect(() => {
    void fetchFigurePromptOptions()
      .then((options) => {
        if (options.length > 0) setFigureOptions(options);
      })
      .catch(() => undefined);
  }, []);

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
    if (!datasetFile) {
      setGenerateError("请先上传 Excel / CSV 表格。");
      return;
    }

    if (!normalizedPrompt) {
      setGenerateError("请先输入生成要求。");
      return;
    }
    if (!dataSource.trim() || !collectionMethod.trim() || !expectedProblem.trim()) {
      setGenerateError("请补充数据来源、数据收集方式和预期解决的问题。");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    if (!forceGenerate) {
      setPendingQualityGate(null);
    }

    try {
      const result = await generateDraftWithDataset({
        prompt: normalizedPrompt,
        selectedTemplate,
        dataSource: dataSource.trim(),
        collectionMethod: collectionMethod.trim(),
        expectedProblem: expectedProblem.trim(),
        datasetFile,
        referenceFile,
        figurePromptStyle: selectedFigurePrompt,
        forceGenerate
      });

      setGeneratedDraft(result.draft as WorkspaceDraft);
      setGeneratedPdf(result.export_result);
      setGovernance(result.governance);
      setQualityGate(result.quality_gate);
      setPendingQualityGate(null);
      setLlmStatus({
        used: Boolean(result.llm_used),
        provider: result.llm_provider ?? null,
        error: result.llm_error ?? null
      });

      if (!result.export_result.compile_succeeded) {
        setGenerateError("PDF 已尝试生成，但模板编译未完全通过，请先查看结果。");
      }
    } catch (error) {
      setGeneratedDraft(null);
      setGeneratedPdf(null);
      setGovernance(null);
      setLlmStatus(null);
      setQualityGate(null);
      if (error instanceof DataQualityGateError) {
        setPendingQualityGate(error.qualityGate);
        setGenerateError(error.qualityGate.decision);
        return;
      }
      setGenerateError(error instanceof Error ? error.message : "PDF 生成失败");
    } finally {
      setIsGenerating(false);
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

  function handleEditDraft() {
    if (!generatedDraft) {
      return;
    }

    window.localStorage.setItem(
      PENDING_WORKSPACE_DRAFT_KEY,
      JSON.stringify({
        ...generatedDraft,
        exportResult: generatedPdf
      })
    );
    router.push("/work");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-6 py-10">
        <div className="w-full">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="success">必须先上传表格</Badge>
              <Badge variant="outline">AI 数据质量闸门</Badge>
              <Badge variant="outline">六种 PDF 模板可自检</Badge>
              <Badge variant="outline">首页对话后直接生成 PDF</Badge>
            </div>

            <h1 className="text-center text-3xl font-semibold tracking-normal text-slate-950">
              医学影像论文写作入口
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
              首页只负责接收你的写作要求并生成第一版 PDF。查看时直接展示原始 PDF，编辑时进入模板编辑页继续改。
            </p>

            <div className="mt-8 rounded-2xl border bg-white p-4 shadow-soft sm:p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        上传表格
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">支持 .csv / .xlsx，首页生成前必填。</div>
                    </div>
                    <Badge variant={datasetFile ? "success" : "outline"}>{datasetFile ? "已选择" : "未上传"}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => datasetInputRef.current?.click()}>
                      <Upload className="h-4 w-4" />
                      选择表格
                    </Button>
                    {datasetFile ? (
                      <Button type="button" variant="ghost" onClick={() => setDatasetFile(null)}>
                        清除
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 rounded-xl border bg-white px-3 py-2 text-sm text-slate-700">
                    {datasetFile ? datasetFile.name : "尚未选择数据表"}
                  </div>
                  <input
                    ref={datasetInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(event) => setDatasetFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                        <FileText className="h-4 w-4 text-primary" />
                        可选参考文章
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">支持 .pdf / .doc / .docx，用于补结构和语气，不作为统计事实来源。</div>
                    </div>
                    <Badge variant={referenceFile ? "success" : "outline"}>{referenceFile ? "已选择" : "可选"}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => referenceInputRef.current?.click()}>
                      <Upload className="h-4 w-4" />
                      选择文章
                    </Button>
                    {referenceFile ? (
                      <Button type="button" variant="ghost" onClick={() => setReferenceFile(null)}>
                        清除
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 rounded-xl border bg-white px-3 py-2 text-sm text-slate-700">
                    {referenceFile ? referenceFile.name : "未附加参考文章"}
                  </div>
                  <input
                    ref={referenceInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4">
                <div>
                  <div className="text-sm font-medium text-slate-950">PDF 模板导出自检</div>
                  <div className="mt-1 text-xs text-muted-foreground">部署前用后端 LaTeX 实际编译 Elsevier、European Radiology、QIMS、RSNA、兰大硕士、兰大博士。</div>
                </div>
                <Button type="button" variant="outline" onClick={() => void handlePdfSelfTest()} disabled={isTestingPdf}>
                  {isTestingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  自检 PDF 模板
                </Button>
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
                  <BarChart3 className="h-4 w-4 text-primary" />
                  图像生成按钮
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
                        <div className="font-medium">{option.label}</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  当前图像 prompt：{selectedFigureOption?.prompt_focus}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50">
                <div className="grid gap-3 border-b px-4 py-4 md:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <div className="font-medium text-slate-900">数据来源</div>
                    <input
                      value={dataSource}
                      onChange={(event) => setDataSource(event.target.value)}
                      placeholder="例如：单中心回顾性医院数据库 / 公开数据集 TCIA"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <div className="font-medium text-slate-900">如何收集</div>
                    <input
                      value={collectionMethod}
                      onChange={(event) => setCollectionMethod(event.target.value)}
                      placeholder="例如：PACS+病理+随访合并，人工核对标签"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <div className="font-medium text-slate-900">预期解决问题</div>
                    <input
                      value={expectedProblem}
                      onChange={(event) => setExpectedProblem(event.target.value)}
                      placeholder="例如：术前预测LNM / 鉴别ACS与Stable CAD"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                    />
                  </label>
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
                    {datasetFile ? ` 数据表：${datasetFile.name}` : " 请先上传表格"}
                  </div>
                  <Button
                      onClick={() => void handleGenerate(false)}
                    disabled={
                      isGenerating ||
                      !prompt.trim() ||
                      !datasetFile ||
                      !dataSource.trim() ||
                      !collectionMethod.trim() ||
                      !expectedProblem.trim()
                    }
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    生成 PDF
                  </Button>
                </div>
              </div>

              {generateError ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {generateError}
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
                      <Button type="button" variant="outline" onClick={handleEditDraft} disabled={!generatedDraft}>
                        <PencilLine className="h-4 w-4" />
                        编辑稿件
                      </Button>
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
