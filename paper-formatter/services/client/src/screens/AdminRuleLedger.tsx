import React, { useEffect, useMemo, useState } from 'react';
import {
  api,
  type AdminDomainSummary,
  type AdminOperation,
  type AdminOperationCapability,
  type AdminOverview,
  type AdminRecordRow,
} from '../api/client';
import '../styles/admin-rule-ledger.css';

const OPERATIONS: AdminOperation[] = ['create', 'read', 'update', 'delete'];

const FALLBACK_CAPABILITY: AdminOperationCapability = {
  enabled: false,
  label: '未加载',
  reason: '后台能力矩阵未加载，不能执行本地假动作。',
};
const EMPTY_DOMAINS: AdminDomainSummary[] = [];
const EMPTY_TABLES: string[] = [];
const EMPTY_FLOW_STEPS: string[] = [];

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const AdminRuleLedger: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | string>('overview');
  const [activeOperation, setActiveOperation] = useState<AdminOperation>('read');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<AdminRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const domains = overview?.domains ?? EMPTY_DOMAINS;
  const tables = overview?.tables ?? EMPTY_TABLES;
  const flowSteps = overview?.flowSteps ?? EMPTY_FLOW_STEPS;
  const activeDomain = useMemo<AdminDomainSummary | null>(() => {
    if (!domains.length) return null;
    return domains.find((domain) => domain.id === activeView) ?? domains[0];
  }, [activeView, domains]);
  const isOverview = activeView === 'overview';
  const capabilityTotals = overview?.capabilityTotals ?? { enabled: 0, total: 0 };

  useEffect(() => {
    let alive = true;
    setOverviewLoading(true);
    api.adminOverview()
      .then((data) => {
        if (!alive) return;
        setOverview(data);
        setOverviewError(null);
      })
      .catch((error) => {
        if (!alive) return;
        setOverviewError(normalizeError(error, '后台概览接口连接失败'));
      })
      .finally(() => {
        if (alive) setOverviewLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (isOverview || !activeDomain) return;
    let alive = true;
    setRecordsLoading(true);
    api.adminDomainRecords(activeDomain.id, { search, limit: 50 })
      .then((result) => {
        if (!alive) return;
        setRecords(result.records);
        setRecordsError(null);
      })
      .catch((error) => {
        if (!alive) return;
        setRecords([]);
        setRecordsError(normalizeError(error, '后台记录接口连接失败'));
      })
      .finally(() => {
        if (alive) setRecordsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeDomain, isOverview, search]);

  const operationStatus = (operation: AdminOperation) =>
    activeDomain?.operations[operation] ?? FALLBACK_CAPABILITY;

  return (
    <main className="admin-ledger-shell" data-testid="admin-rule-ledger">
      <aside className="admin-sidebar" aria-label="论文排版后台导航">
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-logo">策</span>
          <div>
            <strong>论文排版后台</strong>
            <small>Production Admin</small>
          </div>
        </div>
        <nav>
          <button type="button" className={isOverview ? 'is-active' : ''} onClick={() => setActiveView('overview')}>
            <span>▣</span> 首页概览
          </button>
          {domains.map((domain) => (
            <button
              type="button"
              className={activeView === domain.id ? 'is-active' : ''}
              key={domain.id}
              onClick={() => {
                setActiveView(domain.id);
                setActiveOperation('read');
              }}
            >
              <span>{domain.icon}</span> {domain.navLabel}
            </button>
          ))}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-main-header">
          <div>
            <p className="admin-kicker">CORE ADMIN · STEP2 → STEP6</p>
            <h1>{isOverview ? '论文排版后台 · 核心功能模块' : activeDomain?.title ?? '后台模块加载中'}</h1>
            <p>
              {isOverview
                ? '10 张表归并为 5 大功能域，所有操作按真实接口能力、权限边界和审计规则展示。'
                : activeDomain?.subtitle ?? '正在连接后台模块定义。'}
            </p>
          </div>
          <button type="button" onClick={onBack} className="admin-return-button">返回论文工作台</button>
        </header>

        {overviewLoading ? (
          <section className="admin-state-card" aria-live="polite">
            <strong>正在连接后台数据...</strong>
            <span>读取 /api/v1/admin/overview，确认数据库表、功能域和接口能力矩阵。</span>
          </section>
        ) : overviewError ? (
          <section className="admin-state-card is-error" role="alert">
            <strong>后台 API 未连接</strong>
            <span>{overviewError}</span>
          </section>
        ) : isOverview ? (
          <>
            <section className="admin-metrics" aria-label="生产后台概览">
              <article>
                <span>功能域</span>
                <strong>{domains.length}</strong>
                <small>F1-F5 业务归并</small>
              </article>
              <article>
                <span>数据库表</span>
                <strong>{tables.length}</strong>
                <small>{tables.join(' / ')}</small>
              </article>
              <article>
                <span>已具备接口动作</span>
                <strong>{capabilityTotals.enabled}/{capabilityTotals.total}</strong>
                <small>其余动作禁止假成功</small>
              </article>
              <article>
                <span>接口数据源</span>
                <strong>Live API</strong>
                <small>/api/v1/admin/overview</small>
              </article>
            </section>

            <section className="admin-flow-card" aria-label="核心主流程">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">MAIN CHAIN</p>
                  <h2>主流程链路</h2>
                </div>
                <code>document_id / job_id / rule_id</code>
              </div>
              <div className="admin-flow-rail">
                {flowSteps.map((step, index) => (
                  <div key={step}>
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-domain-grid" aria-label="五大功能域">
              {domains.map((domain) => (
                <button type="button" key={domain.id} onClick={() => setActiveView(domain.id)} className="admin-domain-card">
                  <span>{domain.icon}</span>
                  <strong>{domain.title}</strong>
                  <small>{domain.subtitle}</small>
                  <em>
                    {domain.tables.map((table) => `${table}:${overview?.tableCounts[table] ?? 0}`).join(' / ')}
                  </em>
                </button>
              ))}
            </section>
          </>
        ) : activeDomain ? (
          <>
            <section className="admin-module-card">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">{activeDomain.tables.join(' · ')}</p>
                  <h2>{activeDomain.title}</h2>
                  <p>{activeDomain.positioning}</p>
                </div>
                <mark>{activeDomain.primaryKey}</mark>
              </div>

              <div className="admin-operation-bar" aria-label="增删改查操作">
                {OPERATIONS.map((operation) => {
                  const capability = operationStatus(operation);
                  return (
                    <button
                      type="button"
                      key={operation}
                      className={`${activeOperation === operation ? 'is-active' : ''} ${capability.enabled ? '' : 'is-disabled'}`}
                      onClick={() => setActiveOperation(operation)}
                      aria-disabled={!capability.enabled}
                    >
                      <b>{capability.label}</b>
                      <small>{capability.enabled ? capability.endpoint : capability.reason}</small>
                    </button>
                  );
                })}
              </div>

              <div className="admin-workbench">
                <section className="admin-list-panel" aria-label={`${activeDomain.navLabel}列表`}>
                  <div className="admin-toolbar">
                    <input
                      aria-label="搜索记录"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="按 ID / 状态 / 表名搜索"
                    />
                    <span>{recordsLoading ? '查询中...' : `${records.length} 条记录`}</span>
                  </div>
                  {recordsError ? (
                    <div className="admin-inline-state is-error" role="alert">{recordsError}</div>
                  ) : recordsLoading ? (
                    <div className="admin-inline-state">正在读取 /api/v1/admin/domains/{activeDomain.id}/records</div>
                  ) : (
                    <div className="admin-record-table">
                      <div className="admin-record-row is-head">
                        <span>ID</span>
                        <span>名称</span>
                        <span>状态</span>
                        <span>承载表</span>
                        <span>证据</span>
                      </div>
                      {records.map((row) => (
                        <button type="button" className="admin-record-row" key={`${row.owner}:${row.id}`}>
                          <span>{row.id}</span>
                          <strong>{row.name}</strong>
                          <mark>{row.status}</mark>
                          <span>{row.owner}</span>
                          <span>{row.evidence}</span>
                        </button>
                      ))}
                      {!records.length && (
                        <div className="admin-inline-state">没有匹配记录。请更换搜索词，或确认对应表是否已有生产数据。</div>
                      )}
                    </div>
                  )}
                </section>

                <aside className="admin-contract-panel" aria-label="生产接口契约">
                  <p className="admin-kicker">OPERATION CONTRACT</p>
                  <h3>{operationStatus(activeOperation).label}</h3>
                  {operationStatus(activeOperation).enabled ? (
                    <>
                      <p>真实接口已存在，前端可接表单与乐观刷新，但不能绕过接口直接改本地状态。</p>
                      <code>{operationStatus(activeOperation).endpoint}</code>
                      <ul>
                        <li>提交前校验字段与权限。</li>
                        <li>成功后重新查询服务端数据。</li>
                        <li>涉及状态迁移时写入 audit_records。</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p>该动作当前不可执行，生产后台必须先补接口、权限和审计链路。</p>
                      <code>{operationStatus(activeOperation).reason}</code>
                      <ul>
                        <li>按钮允许查看原因，但不展示假成功态。</li>
                        <li>涉及不可变表时只能新增版本或追加审计。</li>
                        <li>删除类动作必须先定义归档策略与依赖检查。</li>
                      </ul>
                    </>
                  )}
                </aside>
              </div>
            </section>

            <section className="admin-sql-coverage" aria-label="SQL 表覆盖">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">SQL COVERAGE</p>
                  <h2>10 张表覆盖</h2>
                </div>
                <code>SELECT * FROM {activeDomain.tables[0]}</code>
              </div>
              <div className="admin-table-chip-grid">
                {tables.map((table) => (
                  <span className={activeDomain.tables.includes(table) ? 'is-active' : ''} key={table}>{table}</span>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="admin-state-card">
            <strong>暂无后台模块</strong>
            <span>接口已返回，但没有功能域定义。</span>
          </section>
        )}
      </section>
    </main>
  );
};

export default AdminRuleLedger;
