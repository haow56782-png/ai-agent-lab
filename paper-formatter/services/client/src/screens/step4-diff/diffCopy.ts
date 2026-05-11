export interface DiffCopyShape {
  banner_pending_title: string;
  banner_pending_body: string;
  banner_done_title: string;
  banner_done_body: string;
  banner_partial_title: string;
  banner_partial_body: string;
  banner_done_label: string;
  banner_pending_label: string;
  page_nav_title: string;
  review_now: string;
  review_item_of_total: string;
  review_item_current: string;
  review_item_total: string;
  review_error: string;
  review_retry: string;
  review_empty_title: string;
  review_empty_body: string;
  footer_pending: string;
  footer_done: string;
  footer_accept_all: string;
  footer_download: string;
  footer_download_disabled: string;
  accept: string;
  reject: string;
  self_edit: string;
  accept_all_confirm_title: string;
  accept_all_confirm_body: string;
  cancel: string;
  accept_all_confirm_action: string;
  progress_label: string;
  change_count: string;
  page_prefix: string;
  page_meta: string;
  abstract_title: string;
  figure_caption: string;
  overflow_notes: string;
  review_card_label: string;
  sr_review_suggestion: string;
  beforeunload_warning: string;
  export_started: string;
  export_failed: string;
  export_blocked: string;
}

export const DIFF_COPY: Record<'zh-CN', DiffCopyShape> = {
  'zh-CN': {
    banner_pending_title: '你的正文没有被改动。',
    banner_pending_body: '下面 {count} 只是排版调整，请你过目。',
    banner_done_title: '全部确认完成。',
    banner_done_body: '可以下载定稿了。',
    banner_partial_title: '还有 {count} 等你点头。',
    banner_partial_body: '剩余 {count} 你已经处理过了。',
    banner_done_label: '已全部确认',
    banner_pending_label: '处待确认',
    page_nav_title: '页码',
    review_now: '现在看',
    review_item_of_total: '第 {current} 处 / 共 {total} 处',
    review_item_current: '第 {current} 处',
    review_item_total: '共 {total} 处',
    review_error: '批改结果加载失败',
    review_retry: '重试',
    review_empty_title: '全部确认完成',
    review_empty_body: '可以下载定稿了',
    footer_pending: '还有 {count} 待确认',
    footer_done: '全部确认完成',
    footer_accept_all: '全部接受这 {count}',
    footer_download: '下载定稿',
    footer_download_disabled: '还有 {count} 待确认',
    accept: '接受',
    reject: '拒绝',
    self_edit: '我自己改',
    accept_all_confirm_title: '确定全部接受这 {count}?',
    accept_all_confirm_body: '确认后这些排版调整会全部标记为已接受，你仍会停留在确认页，随后可手动下载定稿。',
    cancel: '取消',
    accept_all_confirm_action: '确定全部接受',
    progress_label: '确认进度',
    change_count: '{count} 处',
    page_prefix: '第 {page} 页',
    page_meta: '第 {page} 页 · {chapter}',
    abstract_title: '摘要',
    figure_caption: '图 1-2 论文版式校对流程示意',
    overflow_notes: '+{count} 条批注',
    review_card_label: '章节标题修改建议',
    sr_review_suggestion: '{page}{chapter}修改建议：{target}',
    beforeunload_warning: '你已确认部分修改，关闭后已确认状态会保留',
    export_started: '交稿稿件已开始生成',
    export_failed: '导出失败：{message}',
    export_blocked: '还有 {count} 需要你确认后才能下载定稿',
  },
};

export type DiffLocale = keyof typeof DIFF_COPY;

export function createDiffTranslator(locale: DiffLocale = 'zh-CN') {
  const copy = DIFF_COPY[locale];
  const t = (key: keyof DiffCopyShape, vars: Record<string, string | number> = {}) =>
    Object.entries(vars).reduce(
      (text, [name, value]) => text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
      copy[key],
    );

  return { copy, t };
}
