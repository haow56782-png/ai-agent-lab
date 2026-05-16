import React from 'react';

export const FixSafetyNotice: React.FC = () => (
  <section className="fix-runtime-safety-notice" aria-label="安全修复模式">
    <strong>安全修复模式已开启</strong>
    <span>仅修改格式属性，不改变论文正文语义；所有修复会在最终确认页统一展示，确认前可以撤回单项修复。</span>
  </section>
);
