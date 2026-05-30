import { expect, test } from '@playwright/test';

const overviewPayload = {
  domains: [
    {
      id: 'documents',
      navLabel: '文档管理',
      title: 'F1 文档管理域',
      subtitle: '论文文档全生命周期 + 规范绑定',
      icon: '▣',
      tables: ['documents', 'document_profiles'],
      positioning: '上传文档、查看元数据、绑定学校规则包，并为后续任务提供 document_id。',
      lifecycle: ['草稿', 'ready', 'online', '归档'],
      primaryKey: 'document_id / doc_id',
      operations: {
        create: { enabled: true, label: '新增文档', endpoint: 'POST /api/v1/documents' },
        read: { enabled: true, label: '查询文档', endpoint: 'GET /api/v1/documents/:docId' },
        update: { enabled: false, label: '编辑绑定', reason: '生产接口缺少 document_profiles 绑定更新端点，不能伪造写入。' },
        delete: { enabled: false, label: '删除文档', reason: '文档已关联 jobs/findings/share_reports，生产环境应先实现归档。' },
      },
    },
    {
      id: 'rules',
      navLabel: '规则配置',
      title: 'F2 规则配置域',
      subtitle: '学校规范 → 规则包 → 规则明细 → 快照冻结',
      icon: '◇',
      tables: ['school_profiles', 'school_rule_sets', 'school_rules', 'rule_snapshots'],
      positioning: '管理学校规范库、规则包版本、规则明细分类，并在任务执行前冻结快照。',
      lifecycle: ['draft', 'reviewing', 'online', 'snapshot'],
      primaryKey: 'school_id / rule_set_id / rule_id',
      operations: {
        create: { enabled: true, label: '补充模板', endpoint: 'POST /api/v1/profiles/import-template' },
        read: { enabled: true, label: '查询规则', endpoint: 'GET /api/v1/profiles + GET /api/v1/profiles/:profileId' },
        update: { enabled: false, label: '编辑规则', reason: '直接编辑 school_rules 需要版本草稿、审批和发布接口。' },
        delete: { enabled: false, label: '删除规则', reason: 'rule_snapshots 只增不改。' },
      },
    },
    {
      id: 'tasks',
      navLabel: '任务执行',
      title: 'F3 任务执行域',
      subtitle: '排版任务调度 + 检查发现项处理',
      icon: '◎',
      tables: ['jobs', 'findings'],
      positioning: '承载 Step3→Step5：任务状态机、发现项工作台、重试/取消边界和人工确认。',
      lifecycle: ['pending', 'running', 'guarded', 'done', 'failed'],
      primaryKey: 'job_id / finding_id',
      operations: {
        create: { enabled: true, label: '创建任务', endpoint: 'POST /api/v1/jobs/analyze|fix|format' },
        read: { enabled: true, label: '查询任务', endpoint: 'GET /api/v1/jobs/:jobId + GET /api/v1/findings' },
        update: { enabled: true, label: '处理发现项', endpoint: 'POST /api/v1/findings/:id/accept|reject|self-edit' },
        delete: { enabled: false, label: '删除发现项', reason: '发现项必须保留审计链路；生产动作应是 accept/reject/self-edit/exempt，而非物理删除。' },
      },
    },
    {
      id: 'delivery',
      navLabel: '交付分享',
      title: 'F4 交付分享域',
      subtitle: '报告生成与对外分享',
      icon: '◈',
      tables: ['share_reports'],
      positioning: '关联文档、发现项和报告 payload，管理分享链接权限与有效期。',
      lifecycle: ['generated', 'active', 'expired'],
      primaryKey: 'share_id',
      operations: {
        create: { enabled: true, label: '生成报告', endpoint: 'POST /api/v1/share/report' },
        read: { enabled: true, label: '查看报告', endpoint: 'GET /api/v1/share/report/:shareId' },
        update: { enabled: false, label: '编辑权限', reason: '分享有效期/权限字段尚未入库，不能做假开关。' },
        delete: { enabled: false, label: '删除分享', reason: '生产应实现撤销/失效接口并写 audit_records。' },
      },
    },
    {
      id: 'audit',
      navLabel: '审计治理',
      title: 'F5 审计治理域',
      subtitle: '全链路操作留痕，只读追溯',
      icon: '◉',
      tables: ['audit_records'],
      positioning: '记录对象、操作人、动作、状态迁移和快照引用。审计域只读，不提供修改入口。',
      lifecycle: ['append_only', 'searchable', 'exportable'],
      primaryKey: 'audit_id',
      operations: {
        create: { enabled: false, label: '新增审计', reason: '审计记录只能由业务动作自动写入，禁止人工新增。' },
        read: { enabled: true, label: '查询审计', endpoint: 'GET /api/v1/admin/audit-records' },
        update: { enabled: false, label: '编辑审计', reason: '审计记录不可变。' },
        delete: { enabled: false, label: '删除审计', reason: '审计记录不可删除。' },
      },
    },
  ],
  tables: [
    'audit_records',
    'document_profiles',
    'documents',
    'findings',
    'jobs',
    'rule_snapshots',
    'school_profiles',
    'school_rule_sets',
    'school_rules',
    'share_reports',
  ],
  flowSteps: [
    'documents 上传文档',
    'document_profiles 绑定规则包',
    'rule_snapshots 冻结规则',
    'jobs 创建排版任务',
    'findings 跑出发现项',
    'share_reports 生成分享报告',
    'audit_records 全程留痕',
  ],
  capabilityTotals: { enabled: 10, total: 20 },
  tableCounts: {
    audit_records: 12,
    document_profiles: 2,
    documents: 3,
    findings: 316,
    jobs: 8,
    rule_snapshots: 41,
    school_profiles: 4,
    school_rule_sets: 2,
    school_rules: 163,
    share_reports: 5,
  },
};

test.describe('Admin production console', () => {
  test('loads production domains and records from admin APIs', async ({ page }) => {
    await page.route('**/api/v1/admin/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(overviewPayload),
      });
    });
    await page.route('**/api/v1/admin/domains/tasks/records**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          domain: overviewPayload.domains[2],
          records: [
            {
              id: 'PAGE_LAYOUT_MARGIN',
              name: '页边距发现项',
              status: 'pending',
              owner: 'findings',
              evidence: 'document_id=doc_1 · severity=warning',
            },
          ],
        }),
      });
    });
    await page.route('**/api/v1/admin/domains/audit/records**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          domain: overviewPayload.domains[4],
          records: [
            {
              id: 'audit_1',
              name: 'accept finding',
              status: 'accepted',
              owner: 'audit_records',
              evidence: 'target_id=finding_1 · actor=local-author',
            },
          ],
        }),
      });
    });

    await page.goto('/#admin-rule-ledger');

    await expect(page.getByTestId('admin-rule-ledger')).toBeVisible();
    await expect(page.getByRole('heading', { name: '论文排版后台 · 核心功能模块' })).toBeVisible();
    await expect(page.getByText('10/20')).toBeVisible();
    await expect(page.getByText('documents:3 / document_profiles:2')).toBeVisible();

    const navigation = page.getByLabel('论文排版后台导航');
    for (const navLabel of ['文档管理', '规则配置', '任务执行', '交付分享', '审计治理']) {
      await expect(navigation.getByRole('button', { name: new RegExp(navLabel) })).toBeVisible();
    }

    await navigation.getByRole('button', { name: /任务执行/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'F3 任务执行域' })).toBeVisible();
    await expect(page.getByRole('button', { name: /创建任务/ })).toContainText('POST /api/v1/jobs/analyze|fix|format');
    await expect(page.getByRole('button', { name: /处理发现项/ })).toContainText('POST /api/v1/findings/:id/accept|reject|self-edit');
    await expect(page.getByText('PAGE_LAYOUT_MARGIN')).toBeVisible();
    await expect(page.getByText('页边距发现项')).toBeVisible();
    await page.getByRole('button', { name: /删除发现项/ }).click({ force: true });
    await expect(page.getByLabel('生产接口契约')).toContainText('发现项必须保留审计链路');

    await navigation.getByRole('button', { name: /审计治理/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'F5 审计治理域' })).toBeVisible();
    await expect(page.getByText('audit_1')).toBeVisible();
    await expect(page.getByLabel('增删改查操作').getByRole('button', { name: /新增审计/ })).toContainText('禁止人工新增');
    await expect(page.getByLabel('增删改查操作').getByRole('button', { name: /编辑审计/ })).toContainText('审计记录不可变');
    await expect(page.getByRole('button', { name: '返回论文工作台' })).toBeVisible();
  });
});
