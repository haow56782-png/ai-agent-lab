import type { FormatterIntegrityResult } from '../api/client';

export type ContentIntegrityViewStatus = 'pending' | 'verified' | 'warning';

export interface ContentIntegrityView {
  status: ContentIntegrityViewStatus;
  icon: string;
  title: string;
  detail: string;
  shortLabel: string;
  toneColor: string;
  toneBackground: string;
}

export function getContentIntegrityView(integrity?: FormatterIntegrityResult | null): ContentIntegrityView {
  const contentLevel = integrity?.contentLevel;
  if (!contentLevel) {
    return {
      status: 'pending',
      icon: '…',
      title: '正文内容校验等待回传',
      detail: '修复稿生成后会比对原稿与修正稿的正文文本块。',
      shortLabel: '等待正文指纹',
      toneColor: 'var(--ink-500)',
      toneBackground: 'var(--paper-2)',
    };
  }

  if (contentLevel.match) {
    return {
      status: 'verified',
      icon: '✓',
      title: '正文内容校验通过',
      detail: `原稿与修正稿 ${contentLevel.originalBlockCount} 个正文文本块一致，只调整排版属性。`,
      shortLabel: '正文指纹一致',
      toneColor: 'var(--leaf-700)',
      toneBackground: 'var(--leaf-100)',
    };
  }

  return {
    status: 'warning',
    icon: '!',
    title: '正文内容校验发现差异',
    detail: `检测到 ${contentLevel.mismatchCount} 处正文文本块差异，下载前需要人工复核。`,
    shortLabel: '正文指纹异常',
    toneColor: 'var(--rust-700)',
    toneBackground: 'var(--rust-100)',
  };
}
