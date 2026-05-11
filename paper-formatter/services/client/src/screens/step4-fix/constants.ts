import type { FixAction } from '../../mock/fixActions';
import type { FixStep } from './types';

export const FIX_STEPS: FixStep[] = [
  { type: 'margin', label: '页边距', icon: '📐', desc: '上 25 / 下 20 / 左 25 / 右 25 mm', status: 'pending' },
  { type: 'body_style', label: '正文样式', icon: '🔤', desc: '宋体 / Times New Roman · 小四 · 固定 23 磅行距', status: 'pending' },
  { type: 'heading', label: '标题层级', icon: '📑', desc: '黑体 · 段前段后 0.5 行 · 固定 23 磅', status: 'pending' },
  { type: 'page_number', label: '页码/分节', icon: '📄', desc: '罗马前置 → 阿拉伯正文 1 起', status: 'pending' },
  { type: 'cover', label: '封面/声明页', icon: '📋', desc: '字段对齐 · 字体字号 · 日期格式', status: 'pending' },
  { type: 'toc', label: '目录生成', icon: '📚', desc: 'TOC \\o "1-3" · 点线前导符 · 页码右对齐', status: 'pending' },
  { type: 'duplication_preprocess', label: '查重预处理', icon: '🛡️', desc: '页眉清理 · 参考文献格式 · 脚注标记', status: 'pending' },
  { type: 'header_footer', label: '页眉页脚', icon: '📝', desc: '前置页移除 · 正文页眉内容 · 页眉线', status: 'pending' },
  { type: 'abstract_format', label: '摘要 & 关键词', icon: '📝', desc: '字数检测 · 关键词分隔符 · 字体字号', status: 'pending' },
  { type: 'cross_ref', label: '交叉引用', icon: '🔗', desc: '修复断裂引用 · 重建书签', status: 'pending' },
  { type: 'caption', label: '图表题注', icon: '📊', desc: '编号连续性 · 题注位置 · 字体字号', status: 'pending' },
  { type: 'reference_format', label: '参考文献格式', icon: '📚', desc: 'GB/T 7714 · 编号 · 标点 · 作者格式', status: 'pending' },
  { type: 'table_format', label: '表格格式', icon: '📊', desc: '三线表 · 表标题黑体小四 · 表内宋体五号', status: 'pending' },
  { type: 'image_format', label: '图片格式', icon: '🖼', desc: '图边框 0.75pt 黑色 · 题注黑体小四', status: 'pending' },
  { type: 'punctuation', label: '标点符号', icon: '🔤', desc: '全角/半角纠正 · 中英文标点统一', status: 'pending' },
];

export const PAYWALL_PRICE = '¥9.9';
export const DEFAULT_FREE_FIX_LIMIT = 3;
export const LEGACY_DOC_HINT = '当前文件是旧版 .doc 格式（WPS 兼容模式），暂不支持直接排版。请先用 WPS 或 Word 打开后，另存为 .docx 再重新上传。';
export const BROWSE_MODE_FIX_HINT = '当前是浏览模式，已切换到本地修复演示，不会触发真实写回。';

export const FIX_ACTION_BASE_DURATION_MS: Record<FixAction['type'], number> = {
  insert: 680,
  delete: 420,
  replace: 760,
  annotate: 1120,
};
