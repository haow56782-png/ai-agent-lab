export type RuleType = 'format' | 'content' | 'structure' | 'layout';

export interface RuleGroup {
  cat: string;
  items: string[];
}

export interface RuleDefinition {
  id: string;
  category: string;
  categoryCode: string;
  description: string;
  type: RuleType;
}

export const ALL_RULE_GROUPS: RuleGroup[] = [
  {
    cat: 'A. 页面基础规则',
    items: [
      '纸张 A4（210×297mm）',
      '页边距 上 25mm 下 25mm 左 30mm 右 25mm',
      '装订线 0 mm',
      '页眉 15mm，页脚 17.5mm',
      '版心尺寸 156×225mm',
      '页面版式 对称页边距（双面打印）',
    ],
  },
  {
    cat: 'B. 封面规则',
    items: [
      '中文论文题目：二号黑体，居中，上空一行',
      '英文论文题目：二号 Times New Roman，居中，下空三行',
      '学院、专业、姓名、学号、指导教师、提交日期：三号宋体',
      '封面不显示页码',
    ],
  },
  {
    cat: 'C. 学术诚信声明页规则',
    items: [
      '学术诚信声明为前置固定页',
      '标题按模板样式居中排版',
      '签名、日期、保密勾选等保留原布局',
      '独立成页，不计入正文页码',
    ],
  },
  {
    cat: 'D. 版权授权书页规则',
    items: [
      '版权使用授权书为前置固定页',
      '标题按模板样式居中排版',
      '签名、日期、保密勾选等保留原布局',
      '独立成页，不计入正文页码',
    ],
  },
  {
    cat: 'E. 中文摘要规则',
    items: [
      '摘要前论文题目：三号黑体，居中，上下各空一行',
      '"摘  要"：四号黑体，居中',
      '摘要正文：小四宋体，首行缩进 2 字符，1.5 倍行距，300–500 字',
      '"关键词"：小四黑体',
      '关键词正文：小四宋体，4–6 个，逗号分隔，最后一个关键词后无标点',
    ],
  },
  {
    cat: 'F. 英文摘要规则',
    items: [
      '英文题目：三号 Times New Roman，加粗，居中，全部大写，上下各空一行',
      '"ABSTRACT"：四号 Times New Roman，加粗，居中',
      '摘要正文：小四 Times New Roman，首行缩进 2 字符，1.5 倍行距，250–400 实词',
      '"KEY WORDS"：小四 Times New Roman，加粗，KEY 与 WORDS 之间有空格',
      '关键词：小四 Times New Roman，逗号分隔，逗号后加空格',
      '英文摘要在中文摘要之后另页起',
    ],
  },
  {
    cat: 'G. 目录规则',
    items: [
      '"目  录"：三号黑体，居中',
      '正文：小四宋体，1.5 倍行距',
      '含一级至三级标题、参考文献、附录、致谢',
      '外文原文及译文不编入目录',
      '目录页不显示页码',
    ],
  },
  {
    cat: 'H. 正文章节标题规则',
    items: [
      '一级标题：三号黑体，居中，上下各空一行，每章新起一页',
      '二级标题：四号黑体，顶格，序号后空一格，1.5 倍行距',
      '三级标题：四号黑体，左缩进两格，序号后空一格',
      '四级标题：四号黑体，左缩进两格，序号后空一格',
    ],
  },
  {
    cat: 'I. 正文段落规则',
    items: [
      '中文：小四宋体',
      '英文：小四 Times New Roman',
      '首行缩进 2 字符',
      '1.5 倍行距',
      '两端对齐',
    ],
  },
  {
    cat: 'J. 页眉页脚与页码规则',
    items: [
      '正文页眉：毕业论文题目',
      '页眉字体：黑体，小五',
      '摘要等前置部分页码：罗马数字，从Ⅰ开始',
      '正文章节页码：阿拉伯数字，从 1 开始',
      '页码位于页脚，居中',
      '页码字体：小五 Times New Roman',
      '封面、声明页、授权书页不显示页码',
    ],
  },
  {
    cat: 'K. 公式规则',
    items: [
      '公式另起一行，居中排版',
      '编号使用圆括号，置于行末',
      '按章节编号，格式为 (2-1)',
      '编号连续不重复跳号',
      '长公式转行时优先在等号处转行',
      '转行符号写在行首',
      '多行公式按等号对齐',
    ],
  },
  {
    cat: 'L. 表格规则',
    items: [
      '表题置于表格上方，居中',
      '表序左方不加标点，空一格写表题，末尾不加标点',
      '表题：小四宋体，加粗',
      '表内中文：小四宋体；英文：小四 Times New Roman',
      '表格居中于页面',
      '表头跨页时自动重复表头',
      '跨页时写"续表 xx"，表题省略，表头重复',
      '表序连续不重复跳号',
    ],
  },
  {
    cat: 'M. 图片规则',
    items: [
      '图序、图题位于图片下方，居中',
      '图题：小四宋体，加粗',
      '图序连续不重复跳号',
      '全文统一编号或按章节编号',
      '坐标轴标明名称和单位',
      '图片与图题尽量同页',
    ],
  },
  {
    cat: 'N. 引用标注规则',
    items: [
      '引用标注采用中括号编号 [1]',
      '标注位置为上标',
      '按出现顺序连续编号',
      '连续引用使用起止序号 [1-3]',
      '同一处引用多篇文献用逗号分隔 [1,2]',
    ],
  },
  {
    cat: 'O. 参考文献规则',
    items: [
      '"参考文献"：三号黑体，居中，上下各空一行',
      '标准：GB/T 7714-2015',
      '采用顺序编码制',
      '正文：小四宋体，单倍行距',
      '换行时第二行与第一行文字对齐（悬挂缩进）',
      '支持书籍 [M]、期刊 [J]、网页 [EB/OL]、专利 [P]、标准 [S]、报纸 [N]、学位论文 [D]',
    ],
  },
  {
    cat: 'P. 附录规则',
    items: [
      '"附录"：三号黑体，居中，上下各空一行',
      '正文中文：小四宋体',
      '正文英文：小四 Times New Roman',
      '首行缩进 2 字符',
      '1.5 倍行距',
    ],
  },
  {
    cat: 'Q. 致谢规则',
    items: [
      '"致  谢"：三号黑体，居中，上下各空一行',
      '正文中文：小四宋体',
      '正文英文：小四 Times New Roman',
      '首行缩进 2 字符',
      '1.5 倍行距',
      '致谢独立成页',
    ],
  },
  {
    cat: 'R. 外文原文及译文规则',
    items: [
      '"外文原文及译文"：三号黑体，居中，上下各空一行',
      '原文不少于 1 万印刷符号',
      '不编入论文目录',
      '外文原文与译文分别独立成页',
    ],
  },
  {
    cat: 'S. 分节符与章节分页规则',
    items: [
      '每一章从奇数页（右页）开始',
      '分节符：下一页 / 奇数页',
      '各章之间不接排，另页起',
      '前置部分和正文部分之间用分节符分隔',
      '不同节之间页眉/页码独立设置',
    ],
  },
  {
    cat: 'T. 自动目录/图目录/表目录域规则',
    items: [
      '自动目录：使用 Word 域代码 TOC \\o "1-3" \\h \\z \\u',
      '图目录：域代码 TOC \\c "图" \\h',
      '表目录：域代码 TOC \\c "表" \\h',
      '目录页码右对齐，制表符前导符 ……',
      '目录域在文档更新后手动刷新',
      '目录与正文使用不同分节符隔离',
    ],
  },
];

const inferRuleType = (text: string): RuleType => {
  if (
    text.includes('引用') ||
    text.includes('参考文献') ||
    text.includes('关键词') ||
    text.includes('摘要正文') ||
    text.includes('原文不少于')
  ) {
    return 'content';
  }

  if (
    text.includes('独立成页') ||
    text.includes('新起一页') ||
    text.includes('另页起') ||
    text.includes('分节符') ||
    text.includes('不编入目录') ||
    text.includes('页码')
  ) {
    return 'layout';
  }

  if (
    text.includes('标题') ||
    text.includes('摘要') ||
    text.includes('目录') ||
    text.includes('章节') ||
    text.includes('附录') ||
    text.includes('致谢')
  ) {
    return 'structure';
  }

  return 'format';
};

export const STRUCTURED_RULES: RuleDefinition[] = ALL_RULE_GROUPS.flatMap((group) => {
  const code = group.cat.charAt(0);

  return group.items.map((item, index) => ({
    id: `${code}-${String(index + 1).padStart(2, '0')}`,
    category: group.cat,
    categoryCode: code,
    description: item,
    type: inferRuleType(item),
  }));
});

export const getRulesByCategory = () => {
  return ALL_RULE_GROUPS.map((group) => ({
    category: group.cat,
    categoryCode: group.cat.charAt(0),
    rules: STRUCTURED_RULES.filter((rule) => rule.category === group.cat),
  }));
};

export const RULE_COUNT = STRUCTURED_RULES.length;

if (import.meta.env?.MODE === 'development') {
  console.log(`✅ 规则转换完成，共 ${RULE_COUNT} 条规则`);
}