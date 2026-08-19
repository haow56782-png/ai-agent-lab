import React from 'react';

interface Props {
  highlighted?: boolean;
}

export const FixSafetyNotice = React.forwardRef<HTMLElement, Props>(({ highlighted = false }, ref) => (
  <section
    className={highlighted ? 'fix-runtime-safety-notice is-highlighted' : 'fix-runtime-safety-notice'}
    aria-label="安全修复模式"
    ref={ref}
    tabIndex={-1}
  >
    <strong>安全修复模式已开启</strong>
    <span>仅修改格式属性，不改变论文正文语义；所有修复会在最终确认页统一展示，确认前可以撤回单项修复。</span>
  </section>
));

FixSafetyNotice.displayName = 'FixSafetyNotice';
