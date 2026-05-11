export interface PaperBlockStyle {
  font: string;
  size: number;
  lineHeight: number;
  indent: number;
  spaceBefore: number;
  spaceAfter: number;
}

export interface PaperRuleRef {
  source: '学校规则' | '国标';
  code: string;
  name: string;
  summary: string;
}

export interface PaperBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'figure' | 'table' | 'reference';
  content: string;
  originalStyle: PaperBlockStyle;
  ruleRefs: PaperRuleRef[];
}

export interface PaperPage {
  pageNumber: number;
  header: string;
  footer: string;
  blocks: PaperBlock[];
}

export interface PaperContent {
  pages: PaperPage[];
}

interface CreatePaperContentOptions {
  title: string;
  header: string;
  totalPages: number;
  headings: string[];
  paragraphs: string[];
}

const SCHOOL_RULE_POOL = [
  { code: 'USTC-A1', name: '封面与题名页', summary: '题名、作者、院系和日期需按学校模板居中排列。' },
  { code: 'USTC-A2', name: '摘要与关键词', summary: '中文摘要后紧跟关键词，分号分隔，顺序固定。' },
  { code: 'USTC-B1', name: '章节标题', summary: '一级标题用黑体三号，段前段后保持统一。' },
  { code: 'USTC-B2', name: '正文版芯', summary: '正文按学校版芯设置页边距与固定行距。' },
  { code: 'USTC-C1', name: '目录与页码', summary: '目录点线与页码右对齐，前置页与正文分节。' },
  { code: 'USTC-C2', name: '图表题注', summary: '图表编号按章节连续，题注位置不可错位。' },
];

const BASELINE_RULE_POOL = [
  { code: 'GB/T 7713.1 §5.2', name: '题名层级', summary: '章节层级需对应统一题名字号与编号逻辑。' },
  { code: 'GB/T 7713.1 §6.1', name: '正文编排', summary: '段落首行缩进、行距和段前段后需一致。' },
  { code: 'GB/T 7713.1 §6.4', name: '图表编排', summary: '图表题注、注释和引用位置需符合国标。' },
  { code: 'GB/T 7713.1 §7.3', name: '参考文献著录', summary: '参考文献编号、标点与作者项应符合著录规则。' },
];

const STYLE_PRESETS = {
  h1: {
    font: '"SimHei", "STHeiti", "Heiti SC", sans-serif',
    size: 18,
    lineHeight: 28,
    indent: 0,
    spaceBefore: 0,
    spaceAfter: 14,
  },
  h2: {
    font: '"SimHei", "STHeiti", "Heiti SC", sans-serif',
    size: 16,
    lineHeight: 24,
    indent: 0,
    spaceBefore: 10,
    spaceAfter: 8,
  },
  h3: {
    font: '"SimHei", "STHeiti", "Heiti SC", sans-serif',
    size: 14,
    lineHeight: 22,
    indent: 0,
    spaceBefore: 8,
    spaceAfter: 6,
  },
  p: {
    font: '"Songti SC", "STSong", SimSun, serif',
    size: 12,
    lineHeight: 23,
    indent: 2,
    spaceBefore: 0,
    spaceAfter: 6,
  },
  figure: {
    font: '"Songti SC", "STSong", SimSun, serif',
    size: 11,
    lineHeight: 18,
    indent: 0,
    spaceBefore: 8,
    spaceAfter: 8,
  },
  table: {
    font: '"Songti SC", "STSong", SimSun, serif',
    size: 10.5,
    lineHeight: 16,
    indent: 0,
    spaceBefore: 8,
    spaceAfter: 8,
  },
  reference: {
    font: '"Times New Roman", "Songti SC", serif',
    size: 10.5,
    lineHeight: 18,
    indent: 0,
    spaceBefore: 0,
    spaceAfter: 4,
  },
} satisfies Record<PaperBlock['type'], PaperBlockStyle>;

function cleanLine(value: string, fallback: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean || fallback;
}

function buildRuleRefs(type: PaperBlock['type'], pageNumber: number, blockIndex: number): PaperRuleRef[] {
  const schoolRule = SCHOOL_RULE_POOL[(pageNumber + blockIndex) % SCHOOL_RULE_POOL.length];
  const baselineRule = BASELINE_RULE_POOL[(pageNumber + blockIndex) % BASELINE_RULE_POOL.length];
  const refs: PaperRuleRef[] = [
    {
      source: '学校规则',
      code: schoolRule.code,
      name: schoolRule.name,
      summary: schoolRule.summary,
    },
    {
      source: '国标',
      code: baselineRule.code,
      name: baselineRule.name,
      summary: baselineRule.summary,
    },
  ];

  if (type === 'reference') {
    refs.push({
      source: '国标',
      code: 'GB/T 7714-2015',
      name: '参考文献格式',
      summary: '著录顺序、标点和作者字段需采用 GB/T 7714 格式。',
    });
  }

  if (type === 'table' || type === 'figure') {
    refs.push({
      source: '学校规则',
      code: 'USTC-C2',
      name: '图表题注',
      summary: '图表题注应与内容居中对齐，编号连续且位置准确。',
    });
  }

  return refs.slice(0, 3);
}

export function createMockPaperContent({
  title,
  header,
  totalPages,
  headings,
  paragraphs,
}: CreatePaperContentOptions): PaperContent {
  const safeTitle = cleanLine(title, '本科毕业论文');
  const safeHeader = cleanLine(header, '本科毕业论文');
  const safeHeadings = headings.length > 0
    ? headings.map((heading, index) => cleanLine(heading, `第 ${index + 1} 章`))
    : ['摘要', '绪论', '研究方法', '实验结果与分析', '结论'];
  const safeParagraphs = paragraphs.length > 0
    ? paragraphs.map((paragraph, index) => cleanLine(paragraph, `正文段落 ${index + 1}`))
    : [
        '本文围绕论文格式排版中的版芯控制、标题层级、图表题注与参考文献统一展开研究，并基于真实底稿逐项校对样式差异。',
        '通过对学校论文规范与国家标准基线的逐条映射，可以在不改变正文语义的前提下恢复段落字体、行距、缩进、页眉页脚与目录页码的完整一致性。',
        '实验部分针对图题、表题、脚注、参考文献和交叉引用等高频问题建立了逐页检查机制，使论文修改过程具有可追踪的证据链与交付可信度。',
      ];

  const pageCount = Math.max(1, totalPages);
  const pages: PaperPage[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const heading = safeHeadings[(pageNumber - 1) % safeHeadings.length];
    const paragraphOffset = ((pageNumber - 1) * 3) % safeParagraphs.length;
    const blocks: PaperBlock[] = [];

    if (pageNumber === 1) {
      blocks.push({
        type: 'h1',
        content: safeTitle,
        originalStyle: STYLE_PRESETS.h1,
        ruleRefs: buildRuleRefs('h1', pageNumber, blocks.length),
      });
    }

    blocks.push({
      type: pageNumber % 3 === 0 ? 'h3' : 'h2',
      content: heading,
      originalStyle: pageNumber % 3 === 0 ? STYLE_PRESETS.h3 : STYLE_PRESETS.h2,
      ruleRefs: buildRuleRefs(pageNumber % 3 === 0 ? 'h3' : 'h2', pageNumber, blocks.length),
    });

    blocks.push(
      {
        type: 'p',
        content: safeParagraphs[paragraphOffset % safeParagraphs.length],
        originalStyle: STYLE_PRESETS.p,
        ruleRefs: buildRuleRefs('p', pageNumber, blocks.length),
      },
      {
        type: 'p',
        content: safeParagraphs[(paragraphOffset + 1) % safeParagraphs.length],
        originalStyle: STYLE_PRESETS.p,
        ruleRefs: buildRuleRefs('p', pageNumber, blocks.length + 1),
      },
      {
        type: 'p',
        content: safeParagraphs[(paragraphOffset + 2) % safeParagraphs.length],
        originalStyle: STYLE_PRESETS.p,
        ruleRefs: buildRuleRefs('p', pageNumber, blocks.length + 2),
      },
    );

    if (pageNumber % 2 === 0) {
      blocks.push({
        type: 'table',
        content: [
          '项目|修订前|修订后',
          '正文字体|局部混用 Arial|统一为宋体 / Times New Roman',
          '行距|1.5 倍行距|固定 23 磅',
          '页码|断裂或重置异常|分节后连续',
        ].join('\n'),
        originalStyle: STYLE_PRESETS.table,
        ruleRefs: buildRuleRefs('table', pageNumber, blocks.length),
      });
    } else {
      blocks.push({
        type: 'figure',
        content: `图 ${Math.max(1, pageNumber - 1)}-${(pageNumber % 4) + 1} 论文版式校对流程示意`,
        originalStyle: STYLE_PRESETS.figure,
        ruleRefs: buildRuleRefs('figure', pageNumber, blocks.length),
      });
    }

    if (pageNumber >= Math.max(2, pageCount - 1)) {
      blocks.push(
        {
          type: 'reference',
          content: '[1] 张三. 本科毕业论文写作规范研究[J]. 高等教育研究, 2024.',
          originalStyle: STYLE_PRESETS.reference,
          ruleRefs: buildRuleRefs('reference', pageNumber, blocks.length),
        },
        {
          type: 'reference',
          content: '[2] Li M, Wang J. Document Layout Understanding for Academic Papers[J]. 2023.',
          originalStyle: STYLE_PRESETS.reference,
          ruleRefs: buildRuleRefs('reference', pageNumber, blocks.length + 1),
        },
      );
    }

    pages.push({
      pageNumber,
      header: safeHeader,
      footer: `${pageNumber}`,
      blocks,
    });
  }

  return { pages };
}
