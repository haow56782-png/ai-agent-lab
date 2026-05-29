import React, { useEffect, useState } from 'react';

type StreamReportLink = {
  label: string;
  onClick: () => void;
};

type StreamReportSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; link: StreamReportLink };

interface Props {
  writtenBack: number;
  processCount: number;
  onOpenProcess: () => void;
  onShowSafety: () => void;
}

const STREAM_TICK_MS = 22;
const CHARS_PER_TICK = 2;

function getSegmentLength(segment: StreamReportSegment) {
  return segment.type === 'text' ? segment.text.length : segment.link.label.length;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const FixRuntimeStreamReport: React.FC<Props> = ({
  writtenBack,
  processCount,
  onOpenProcess,
  onShowSafety,
}) => {
  const segments: StreamReportSegment[] = [
    { type: 'text', text: `已完成 ${writtenBack} 项格式写回。` },
    { type: 'text', text: '系统只调整版式属性，正文语义保持不动；你可以继续 ' },
    { type: 'link', link: { label: `查看完整修复过程 · ${processCount} 项`, onClick: onOpenProcess } },
    { type: 'text', text: '，或核对 ' },
    { type: 'link', link: { label: '安全说明', onClick: onShowSafety } },
    { type: 'text', text: ' 后进入校对台。' },
  ];

  const totalChars = segments.reduce((sum, segment) => sum + getSegmentLength(segment), 0);
  const [visibleChars, setVisibleChars] = useState(() => (prefersReducedMotion() ? totalChars : 0));
  const complete = visibleChars >= totalChars;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisibleChars(totalChars);
      return undefined;
    }

    setVisibleChars(0);
    const timer = window.setInterval(() => {
      setVisibleChars((current) => {
        const next = Math.min(totalChars, current + CHARS_PER_TICK);
        if (next >= totalChars) {
          window.clearInterval(timer);
        }
        return next;
      });
    }, STREAM_TICK_MS);

    return () => window.clearInterval(timer);
  }, [totalChars]);

  let remainingChars = visibleChars;

  return (
    <section className="fix-runtime-stream-card" data-testid="fix-runtime-stream-report">
      <div className="fix-runtime-stream-kicker">
        <span aria-hidden="true" />
        流式生成摘要
      </div>
      <p className="fix-runtime-stream-line" aria-live="polite">
        {segments.map((segment, index) => {
          const length = getSegmentLength(segment);
          const visibleInSegment = Math.min(Math.max(remainingChars, 0), length);
          remainingChars -= length;

          if (visibleInSegment <= 0) return null;

          if (segment.type === 'text') {
            return (
              <React.Fragment key={`${segment.type}-${index}`}>
                {segment.text.slice(0, visibleInSegment)}
              </React.Fragment>
            );
          }

          const linkReady = visibleInSegment >= length;
          if (!linkReady) {
            return (
              <span className="fix-runtime-stream-link is-typing" key={`${segment.type}-${index}`}>
                {segment.link.label.slice(0, visibleInSegment)}
              </span>
            );
          }

          return (
            <button
              type="button"
              className="fix-runtime-stream-link"
              onClick={segment.link.onClick}
              key={`${segment.type}-${index}`}
            >
              {segment.link.label}
            </button>
          );
        })}
        {!complete ? <span className="fix-runtime-stream-caret" aria-hidden="true" /> : null}
      </p>
    </section>
  );
};
