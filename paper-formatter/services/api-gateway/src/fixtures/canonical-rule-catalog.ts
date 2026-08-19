export type CanonicalRuleType = "format" | "content" | "structure" | "layout";

export type ThesisObjectSubset =
  | "page_canvas"
  | "cover"
  | "originality_statement"
  | "authorization"
  | "abstract_zh"
  | "abstract_en"
  | "keywords"
  | "toc"
  | "heading"
  | "paragraph"
  | "header_footer"
  | "page_number"
  | "formula"
  | "table"
  | "table_caption"
  | "continuation_table"
  | "figure"
  | "figure_caption"
  | "floating_object"
  | "citation"
  | "reference"
  | "footnote"
  | "appendix"
  | "acknowledgement"
  | "translated_source"
  | "section_break"
  | "directory_field";

export interface CanonicalRuleGroup {
  cat: string;
  thesisSubset: ThesisObjectSubset;
  targetObject: string;
  uiSection: string;
  items: string[];
}

export interface CanonicalRuleCatalogEntry {
  ruleId: string;
  label: string;
  category: string;
  categoryCode: string;
  description: string;
  type: CanonicalRuleType;
  source: "school" | "gb" | "system";
  thesisSubset: ThesisObjectSubset;
  targetObject: string;
  uiSection: string;
}

const EXPLICIT_CANONICAL_RULES: CanonicalRuleCatalogEntry[] = [
  { ruleId: "canonical_formula_font", label: "公式变量字体规范", category: "13. 公式", categoryCode: "13", description: "变量斜体,单位与函数名正体,矢量符号加粗", type: "format", source: "school", thesisSubset: "formula", targetObject: "公式", uiSection: "正文" },
  { ruleId: "canonical_formula_numbering", label: "公式连续编号", category: "13. 公式", categoryCode: "13", description: "独立公式使用章节序号连续编号,编号置于行末", type: "structure", source: "school", thesisSubset: "formula", targetObject: "公式", uiSection: "正文" },
  { ruleId: "canonical_formula_alignment", label: "公式居中与编号右对齐", category: "13. 公式", categoryCode: "13", description: "独立公式居中排版,编号通过右对齐制表位落在行末", type: "layout", source: "school", thesisSubset: "formula", targetObject: "公式", uiSection: "正文" },
  { ruleId: "canonical_formula_citation", label: "公式引用格式", category: "13. 公式", categoryCode: "13", description: "正文公式引用使用式加圆括号编号形式", type: "content", source: "school", thesisSubset: "formula", targetObject: "公式引用", uiSection: "正文" },
  { ruleId: "canonical_three_line_table_enforce", label: "三线表强制", category: "14. 表格对象", categoryCode: "14", description: "数据表保留顶线,栏目线,底线,不使用竖线和多余内部横线", type: "format", source: "school", thesisSubset: "table", targetObject: "表格", uiSection: "图表" },
  { ruleId: "canonical_table_unit_consistency", label: "表内单位与有效数字一致", category: "14. 表格对象", categoryCode: "14", description: "同列数据单位统一,有效数字位数一致", type: "content", source: "school", thesisSubset: "table", targetObject: "表格", uiSection: "图表" },
  { ruleId: "canonical_figure_axis_legend", label: "图坐标轴与图例完整", category: "17. 图片对象", categoryCode: "17", description: "数据图包含坐标轴量名,单位和图例", type: "content", source: "school", thesisSubset: "figure", targetObject: "数据图", uiSection: "图表" },
  { ruleId: "canonical_figure_vector_resolution", label: "图清晰度与矢量优先", category: "17. 图片对象", categoryCode: "17", description: "线条图优先使用矢量格式,位图达到印刷分辨率", type: "format", source: "school", thesisSubset: "figure", targetObject: "图片", uiSection: "图表" },
  { ruleId: "canonical_symbol_table_presence", label: "符号表 / 物理量单位表", category: "05. 中文摘要", categoryCode: "05", description: "公式密集论文包含主要物理量,符号和单位说明表", type: "structure", source: "school", thesisSubset: "abstract_zh", targetObject: "符号表", uiSection: "摘要" },
  { ruleId: "canonical_code_block_style", label: "代码块格式", category: "10. 正文段落", categoryCode: "10", description: "代码块使用等宽字体并保留缩进层级", type: "format", source: "school", thesisSubset: "paragraph", targetObject: "代码块", uiSection: "正文" },
  { ruleId: "canonical_algorithm_caption", label: "算法伪代码题注", category: "18. 图题", categoryCode: "18", description: "算法块包含连续编号题注并支持正文引用", type: "structure", source: "school", thesisSubset: "figure_caption", targetObject: "算法", uiSection: "图表" },
  { ruleId: "canonical_reference_type_marker", label: "文献类型标识符", category: "21. 参考文献", categoryCode: "21", description: "参考文献条目包含文献类型标识符", type: "content", source: "school", thesisSubset: "reference", targetObject: "参考文献条目", uiSection: "参考文献" },
  { ruleId: "canonical_reference_numbering", label: "参考文献编号格式", category: "21. 参考文献", categoryCode: "21", description: "顺序编码制参考文献使用方括号数字连续编号", type: "content", source: "school", thesisSubset: "reference", targetObject: "参考文献条目", uiSection: "参考文献" },
  { ruleId: "canonical_reference_author", label: "作者著录", category: "21. 参考文献", categoryCode: "21", description: "参考文献条目以作者著录起始", type: "content", source: "school", thesisSubset: "reference", targetObject: "参考文献条目", uiSection: "参考文献" },
  { ruleId: "canonical_reference_year", label: "出版年份", category: "21. 参考文献", categoryCode: "21", description: "参考文献条目包含四位出版年份", type: "content", source: "school", thesisSubset: "reference", targetObject: "参考文献条目", uiSection: "参考文献" },
  { ruleId: "canonical_reference_vol_pages", label: "卷期页码", category: "21. 参考文献", categoryCode: "21", description: "期刊参考文献包含卷号,期号和起止页码", type: "content", source: "school", thesisSubset: "reference", targetObject: "参考文献条目", uiSection: "参考文献" },
  { ruleId: "canonical_reference_citation_match", label: "编号与正文引用对应", category: "21. 参考文献", categoryCode: "21", description: "正文引用编号与参考文献条目编号一一对应", type: "content", source: "school", thesisSubset: "reference", targetObject: "正文引用", uiSection: "参考文献" },
];

export const REQUIRED_THESIS_SUBSETS: ThesisObjectSubset[] = [
  "page_canvas",
  "cover",
  "originality_statement",
  "authorization",
  "abstract_zh",
  "abstract_en",
  "keywords",
  "toc",
  "heading",
  "paragraph",
  "header_footer",
  "page_number",
  "formula",
  "table",
  "table_caption",
  "continuation_table",
  "figure",
  "figure_caption",
  "floating_object",
  "citation",
  "reference",
  "footnote",
  "appendix",
  "acknowledgement",
  "translated_source",
  "section_break",
  "directory_field",
];

export const CANONICAL_RULE_GROUPS: CanonicalRuleGroup[] = [
  {
    cat: "01. 页面与纸张",
    thesisSubset: "page_canvas",
    targetObject: "页面/版心",
    uiSection: "页面",
    items: ["纸张尺寸为 A4（210×297mm）", "页边距：上 25mm、下 25mm、左 30mm、右 25mm", "装订线：0mm", "版心尺寸：宽 155mm、高 247mm", "页面方向为纵向", "双面打印：左右页边距不互换"],
  },
  {
    cat: "02. 封面字段",
    thesisSubset: "cover",
    targetObject: "封面",
    uiSection: "封面",
    items: ["论文中文题目：二号黑体，居中", "论文英文题目：Times New Roman 二号，居中", "学院字段位于题名下方信息区", "专业、班级、姓名、学号按封面信息区顺序排列", "指导教师与提交日期字段完整保留", "封面不显示页码"],
  },
  {
    cat: "03. 原创性声明",
    thesisSubset: "originality_statement",
    targetObject: "原创性声明页",
    uiSection: "前置页",
    items: ["原创性声明作为前置固定页保留", "声明标题：三号黑体，居中", "声明正文不参与正文段落重排", "签名与日期区域保留原始位置", "声明页不计入正文页码"],
  },
  {
    cat: "04. 授权书",
    thesisSubset: "authorization",
    targetObject: "版权授权书页",
    uiSection: "前置页",
    items: ["版权授权书作为前置固定页保留", "授权书标题：三号黑体，居中", "授权书正文不参与正文段落重排", "保密勾选与签名区域保留原始布局", "授权书页不计入正文页码"],
  },
  {
    cat: "05. 中文摘要",
    thesisSubset: "abstract_zh",
    targetObject: "中文摘要",
    uiSection: "摘要",
    items: ["中文摘要标题：三号黑体，居中", "中文摘要正文：小四宋体", "中文摘要正文首行缩进 2 字符", "中文摘要正文行距：1.5 倍", "中文摘要字数：300-500 字", "中文摘要独立分节并位于目录前"],
  },
  {
    cat: "06. 英文摘要",
    thesisSubset: "abstract_en",
    targetObject: "英文摘要",
    uiSection: "摘要",
    items: ["英文题目：Times New Roman 三号，加粗，居中", "ABSTRACT 标题：Times New Roman 三号，加粗，居中", "英文摘要正文：Times New Roman 小四", "英文摘要正文行距：1.5 倍", "英文摘要词数：250-400 个英文词", "英文摘要另页起并位于中文摘要之后"],
  },
  {
    cat: "07. 关键词",
    thesisSubset: "keywords",
    targetObject: "中英文关键词",
    uiSection: "摘要",
    items: ["中文关键词标签：黑体，小四", "中文关键词数量：3-8 个", "中文关键词之间使用分号分隔", "英文 KEY WORDS 使用大写并保留词间空格", "英文关键词逗号分隔且逗号后加空格"],
  },
  {
    cat: "08. 目录",
    thesisSubset: "toc",
    targetObject: "目录正文",
    uiSection: "目录",
    items: ["目录标题：三号黑体，居中", "目录条目：小四宋体，1.5 倍行距", "目录包含一至三级标题", "目录包含参考文献、附录、致谢等后置部分", "目录条目页码右对齐，并使用点线前导符连接标题", "目录页自身不显示正文页码"],
  },
  {
    cat: "09. 标题层级",
    thesisSubset: "heading",
    targetObject: "章节标题",
    uiSection: "正文",
    items: ["一级标题：三号黑体，居中，段前 24 磅、段后 18 磅", "二级标题：四号黑体，顶格，编号后空一格", "三级标题：小四黑体，左缩进 2 字符", "四级标题：小四黑体，左缩进 2 字符，编号后空一格", "手工编号标题需要归并到稳定标题层级", "目录伪标题不得误判为正文标题"],
  },
  {
    cat: "10. 正文段落",
    thesisSubset: "paragraph",
    targetObject: "正文段落",
    uiSection: "正文",
    items: ["中文正文：小四宋体", "英文正文：Times New Roman 小四", "正文首行缩进 2 字符", "正文行距：1.5 倍", "正文两端对齐", "空段与软回车不应破坏段落结构"],
  },
  {
    cat: "11. 页眉页脚",
    thesisSubset: "header_footer",
    targetObject: "页眉/页脚",
    uiSection: "页眉页脚",
    items: ["正文页眉显示论文题目或章节信息", "页眉字体：小五宋体，居中", "页脚区域保留页码位置", "首页不同：封面、声明、授权页不显示正文页码", "奇偶页页眉页脚分别保存，不混用同一节设置"],
  },
  {
    cat: "12. 页码",
    thesisSubset: "page_number",
    targetObject: "页码",
    uiSection: "页眉页脚",
    items: ["前置部分页码使用罗马数字", "正文页码使用阿拉伯数字", "正文页码从 1 开始", "页码位于页脚居中", "封面、声明页、授权书页不显示页码", "分节后页码续接关系保持正确"],
  },
  {
    cat: "13. 公式",
    thesisSubset: "formula",
    targetObject: "公式",
    uiSection: "正文",
    items: ["公式另起一行居中", "公式编号使用圆括号并置于行末", "公式按章节编号", "公式编号连续不跳号", "长公式优先在等号处转行", "多行公式按等号对齐"],
  },
  {
    cat: "14. 表格对象",
    thesisSubset: "table",
    targetObject: "表格",
    uiSection: "图表",
    items: ["表格居中于页面", "表内中文：五号宋体；英文：五号 Times New Roman", "表格跨页时保留结构完整", "合并单元格不应破坏表格语义", "表序连续不重复跳号", "表格与正文上下间距各保留 0.5 行"],
  },
  {
    cat: "15. 表题",
    thesisSubset: "table_caption",
    targetObject: "表题",
    uiSection: "图表",
    items: ["表题置于表格上方并居中", "表序后空一格写表题", "表题末尾不加标点", "表题：五号宋体，加粗", "表题必须绑定到对应表格对象", "一页多表不得交叉绑定表题"],
  },
  {
    cat: "16. 续表",
    thesisSubset: "continuation_table",
    targetObject: "续表",
    uiSection: "图表",
    items: ["续表识别采用结构信号优先", "后表与主表列数一致作为结构证据", "表头文本哈希一致作为结构证据", "中间无非空正文段落作为相邻证据", "续表 caption 文本只作为辅助证据", "结构冲突时输出 warning 而非静默合并"],
  },
  {
    cat: "17. 图片对象",
    thesisSubset: "figure",
    targetObject: "图片/图对象",
    uiSection: "图表",
    items: ["图片居中排列，宽度不超过版心宽度", "图片与正文上下间距各保留 0.5 行", "图片与图题位于同一页；跨页时输出人工复核", "图片编号全文统一或按章节统一", "图片不得被误归类为表格问题", "坐标轴标明名称和单位"],
  },
  {
    cat: "18. 图题",
    thesisSubset: "figure_caption",
    targetObject: "图题",
    uiSection: "图表",
    items: ["图题位于图片下方并居中", "图序后空一格写图题", "图题末尾不加标点", "图题：五号宋体，加粗", "图题必须绑定到对应图片对象", "一页多图不得交叉绑定图题"],
  },
  {
    cat: "19. 浮动对象/印章/水印",
    thesisSubset: "floating_object",
    targetObject: "浮动图片/Shape/印章/水印",
    uiSection: "图层",
    items: ["浮动图片不得覆盖正文文字", "印章对象不得遮挡正文可读性", "水印位于文字下方时不作为 P1 错误", "批注图层不得压住正文行", "浮动对象修复不得删除原对象", "无法安全判断时转人工确认"],
  },
  {
    cat: "20. 引用标注",
    thesisSubset: "citation",
    targetObject: "正文引用",
    uiSection: "引用",
    items: ["引用标注采用中括号编号", "引用标注位置为上标", "引用按出现顺序连续编号", "连续引用使用起止序号", "同一处多篇引用用逗号分隔", "正文中图表引用不得误判为图题或表题"],
  },
  {
    cat: "21. 参考文献",
    thesisSubset: "reference",
    targetObject: "参考文献条目",
    uiSection: "参考文献",
    items: ["参考文献标题：三号黑体，居中", "参考文献遵循 GB/T 7714 顺序编码制", "参考文献正文：五号宋体；英文与标点使用 Times New Roman", "参考文献换行采用悬挂缩进", "文献类型标识完整", "DOI、URL、访问日期按规范保留"],
  },
  {
    cat: "22. 脚注/注释",
    thesisSubset: "footnote",
    targetObject: "脚注/注释",
    uiSection: "注释",
    items: ["脚注编号连续", "脚注正文：小五宋体", "脚注段落不并入正文统计", "脚注分隔线保留", "注释内容位置不影响正文版芯"],
  },
  {
    cat: "23. 附录",
    thesisSubset: "appendix",
    targetObject: "附录",
    uiSection: "后置部分",
    items: ["附录标题：三号黑体，居中", "附录正文中文：小四宋体", "附录正文英文：Times New Roman 小四", "附录正文首行缩进 2 字符", "附录正文行距：1.5 倍", "附录编号与目录保持一致"],
  },
  {
    cat: "24. 致谢",
    thesisSubset: "acknowledgement",
    targetObject: "致谢",
    uiSection: "后置部分",
    items: ["致谢标题：三号黑体，居中", "致谢中文正文：小四宋体", "致谢英文正文：Times New Roman 小四", "致谢正文首行缩进 2 字符", "致谢正文行距：1.5 倍", "致谢独立成页"],
  },
  {
    cat: "25. 外文原文及译文",
    thesisSubset: "translated_source",
    targetObject: "外文原文及译文",
    uiSection: "后置部分",
    items: ["外文原文及译文标题：三号黑体，居中", "原文篇幅不少于 1 万印刷符号", "外文原文及译文不编入论文目录", "外文原文与译文分别独立成页", "译文段落保留原文对照关系"],
  },
  {
    cat: "26. 分节符与分页",
    thesisSubset: "section_break",
    targetObject: "分节符/分页",
    uiSection: "页面",
    items: ["前置部分和正文部分用分节符隔离", "不同节之间页眉页码独立设置", "每章使用下一页分节符另页起", "章节之间不接排", "分节符不得破坏目录与正文页码关系"],
  },
  {
    cat: "27. 自动目录/图目录/表目录域",
    thesisSubset: "directory_field",
    targetObject: "Word 域/目录域",
    uiSection: "目录",
    items: ["自动目录使用 Word TOC 域", "图目录使用图题域", "表目录使用表题域", "目录页码右对齐并使用前导符", "目录域在文档更新后刷新", "目录与正文使用不同分节符隔离"],
  },
];

function inferRuleType(group: CanonicalRuleGroup, text: string): CanonicalRuleType {
  if (["citation", "reference", "keywords", "translated_source"].includes(group.thesisSubset)) return "content";
  if (["page_canvas", "header_footer", "page_number", "section_break", "directory_field"].includes(group.thesisSubset)) return "layout";
  if (["cover", "originality_statement", "authorization", "abstract_zh", "abstract_en", "toc", "heading", "appendix", "acknowledgement"].includes(group.thesisSubset)) return "structure";
  if (/引用|参考文献|关键词|DOI|URL/.test(text)) return "content";
  if (/独立成页|另页|分节符|页码|页眉|页脚|目录域|TOC/.test(text)) return "layout";
  if (/标题|摘要|目录|章节|附录|致谢|封面|声明|授权书/.test(text)) return "structure";
  return "format";
}

export function buildCanonicalRuleCatalog(): CanonicalRuleCatalogEntry[] {
  const generated = CANONICAL_RULE_GROUPS.flatMap((group) => {
    const code = group.cat.split(".")[0].padStart(2, "0");
    return group.items.map((description, index) => ({
      ruleId: `canonical_${group.thesisSubset}_${String(index + 1).padStart(2, "0")}`,
      label: description.split(/[：:，,。]/)[0],
      category: group.cat,
      categoryCode: code,
      description,
      type: inferRuleType(group, description),
      source: "school" as const,
      thesisSubset: group.thesisSubset,
      targetObject: group.targetObject,
      uiSection: group.uiSection,
    }));
  });
  return [...generated, ...EXPLICIT_CANONICAL_RULES];
}
