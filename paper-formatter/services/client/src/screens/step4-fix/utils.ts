import type { PaperContent } from '../../mock/paperContent';

export function cleanDocLine(value: unknown, fallback = ''): string {
  const clean = String(value || '')
    .replace(/[\x00-\x08\x0e-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || fallback;
}

export function getPageChapterLabel(page?: PaperContent['pages'][number] | null): string {
  if (!page) return '论文正文';
  const heading = page.blocks.find((block) => block.type === 'h1' || block.type === 'h2' || block.type === 'h3');
  return cleanDocLine(heading?.content, `第 ${page.pageNumber} 页`);
}
