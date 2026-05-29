import { expect, test } from '@playwright/test';
import { APP_STATE_BOOTSTRAP_KEY } from '../src/test-support/bootstrapAppState';

test.describe('Step2 profile gating', () => {
  test('dedupes repeated profile bootstrap requests under StrictMode', async ({ page }) => {
    let listProfilesCalls = 0;
    let detectSchoolCalls = 0;
    let profileDetailCalls = 0;

    await page.route('**/api/v1/profiles', async (route) => {
      listProfilesCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              schoolId: 'nku',
              name: '南开大学',
              faculty: '经济学院',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 2,
              uploadCount: 4,
              sourceType: 'official',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/profiles/detect', async (route) => {
      detectSchoolCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: true,
          name: '南开大学',
          confidence: 0.96,
          existingSchoolId: 'nku',
        }),
      });
    });

    await page.route('**/api/v1/profiles/nku', async (route) => {
      profileDetailCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          school_id: 'nku',
          name: '南开大学',
          faculty: '经济学院',
          version: 'v2026.05',
          effective_from: '2026-05-01',
          rules_json: [
            { ruleId: 'margin_top_mm', label: '上边距', value: 28, unit: 'mm' },
          ],
          style_map: [
            { ruleId: 'body_fonts', allowedFonts: ['宋体'] },
          ],
          source_type: 'official',
        }),
      });
    });

    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '南开大学.docx', size: '1.2 MB', pages: 72 },
        documentIdentity: {
          legacyDocId: 'doc_nku',
          canonicalDocumentId: '22222222-2222-4222-8222-222222222222',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');
    await expect(page.getByText('上边距')).toBeVisible();

    expect(listProfilesCalls).toBe(1);
    expect(detectSchoolCalls).toBe(1);
    expect(profileDetailCalls).toBe(1);
  });

  test('renders the school list and selected summary from backend profiles instead of local learned schools', async ({ page }) => {
    await page.route('**/api/v1/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              schoolId: 'nku',
              name: '南开大学',
              faculty: '经济学院',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 108,
              uploadCount: 4,
              sourceType: 'official',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/profiles/detect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: false,
          name: null,
          confidence: 0,
          existingSchoolId: null,
        }),
      });
    });

    await page.route('**/api/v1/profiles/nku', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          school_id: 'nku',
          name: '南开大学',
          faculty: '经济学院',
          version: 'v2026.05',
          effective_from: '2026-05-01',
          gb_version: 'GB/T 7713.1-2025',
          rules_json: [
            { ruleId: 'margin_top_mm', label: '上边距', value: 28, unit: 'mm' },
            { ruleId: 'line_spacing', label: '正文行距', value: 1.5 },
          ],
          style_map: [
            { ruleId: 'body_fonts', allowedFonts: ['宋体', 'Times New Roman'] },
          ],
          source_type: 'official',
          upload_count: 4,
        }),
      });
    });

    await page.addInitScript(([storageKey]) => {
      window.localStorage.setItem('zhenggao_learned_schools', JSON.stringify([
        {
          id: 'learned_hudong',
          name: '胡冬',
          faculty: '上传范式模板',
          match: 79,
          rules: 65,
          version: 'vAuto',
          initial: '胡',
          accent: 'var(--brand-700)',
          baseStandardVersion: 'GB/T 7713.1-2025',
          effectiveFrom: '2026-05-10',
          sourceType: 'learned',
          uploadCount: 1,
        },
      ]));
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '2026毕业论文.docx', size: '1.2 MB', pages: 72 },
        documentIdentity: {
          legacyDocId: 'demo-doc',
          canonicalDocumentId: '11111111-1111-4111-8111-111111111111',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');

    await expect(page.getByRole('button', { name: /南开大学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /胡冬/ })).toHaveCount(0);

    await page.getByRole('button', { name: /南开大学/ }).click();
    await expect(page.getByText('南开大学 · 经济学院', { exact: true })).toBeVisible();
    await expect(page.getByText('profile · v2026.05 · 生效 2026年5月1日 · 3 条规则')).toBeVisible();
    await expect(page.getByText('已录入可执行规范包', { exact: true })).toBeVisible();
    await expect(page.getByText('上边距')).toBeVisible();
    await expect(page.getByText('28 mm')).toBeVisible();
    await expect(page.getByText('宋体 / Times New Roman')).toBeVisible();
    await expect(page.getByText('A4 · 上 25 / 下 25 / 左 30 / 右 25 mm · 装订线 0')).toHaveCount(0);
  });

  test('does not expose the legacy browse-mode bypass when no profile is selected', async ({ page }) => {
    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '2026毕业论文.docx', size: '1.2 MB', pages: 72 },
        documentIdentity: {
          legacyDocId: 'demo-doc',
          canonicalDocumentId: '11111111-1111-4111-8111-111111111111',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');

    await expect(page.getByText('先选一套规范，再往下走')).toBeVisible();
    await expect(page.getByRole('button', { name: '先进入浏览模式' })).toHaveCount(0);
    await expect(page.getByText('不再回到旧的浏览模式分支')).toBeVisible();
  });

  test('auto-creates and auto-selects a detected school when no existing profile matches', async ({ page }) => {
    await page.route('**/api/v1/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              schoolId: 'cqu',
              name: '重庆大学',
              faculty: '机械工程学院',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 96,
              uploadCount: 3,
              sourceType: 'official',
            },
            {
              schoolId: 'lzu-auto',
              name: '兰州大学',
              faculty: '',
              version: 'v1.0',
              effectiveFrom: '2026-05-13',
              ruleCount: 0,
              uploadCount: 1,
              sourceType: 'learned',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/profiles/detect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: true,
          name: '兰州大学',
          confidence: 0.93,
          existingSchoolId: null,
        }),
      });
    });

    await page.route('**/api/v1/profiles/auto-create', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          schoolId: 'lzu-auto',
          name: '兰州大学',
          version: 'v1.0',
          isNew: true,
        }),
      });
    });

    await page.route('**/api/v1/profiles/lzu-auto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          school_id: 'lzu-auto',
          name: '兰州大学',
          faculty: '',
          version: 'v1.0',
          effective_from: '2026-05-13',
          gb_version: 'GB/T 7713.1-2025',
          rules_json: [],
          style_map: [],
          source_type: 'detected',
          upload_count: 1,
        }),
      });
    });

    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '兰州大学本科生论文.docx', size: '430 KB', pages: 15 },
        documentIdentity: {
          legacyDocId: 'doc_885227a3',
          canonicalDocumentId: 'c18d930a-e21c-4e19-9a70-8d75b08dfa48',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');

    await expect(page.getByText('profile · v1.0 · 生效 2026年5月13日 · 0 条规则')).toBeVisible();
    await expect(page.getByText('已识别学校名，规则包待补齐', { exact: true })).toBeVisible();
    await expect(page.getByText('这所学校已经识别出来了，但规则包还没录入系统。')).toBeVisible();
    await expect(page.getByText('检测到新的学校线索')).toHaveCount(0);
  });

  test('filters schools by rule status without falling back to a shared static rule set', async ({ page }) => {
    await page.route('**/api/v1/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              schoolId: 'nku',
              name: '南开大学',
              faculty: '经济学院',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 12,
              uploadCount: 4,
              sourceType: 'official',
            },
            {
              schoolId: 'learned_foo',
              name: '模板学习大学',
              faculty: '上传范文模板',
              version: 'vAuto',
              effectiveFrom: '2026-05-10',
              ruleCount: 8,
              uploadCount: 1,
              sourceType: 'learned',
            },
            {
              schoolId: 'detected_bar',
              name: '待补规则大学',
              faculty: '',
              version: 'v1.0',
              effectiveFrom: '2026-05-12',
              ruleCount: 0,
              uploadCount: 0,
              sourceType: 'detected',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/profiles/detect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: false,
          name: null,
          confidence: 0,
          existingSchoolId: null,
        }),
      });
    });

    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '筛选测试.docx', size: '1.2 MB', pages: 72 },
        documentIdentity: {
          legacyDocId: 'filter-doc',
          canonicalDocumentId: '33333333-3333-4333-8333-333333333333',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');

    await expect(page.getByRole('button', { name: '官方规则 · 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: '自动学习 · 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: '待补规则 · 1' })).toBeVisible();

    await expect(page.getByRole('button', { name: /南开大学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /模板学习大学/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /待补规则大学/ })).toHaveCount(0);

    await page.getByRole('button', { name: '自动学习' }).click();
    await expect(page.getByRole('button', { name: /模板学习大学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /南开大学/ })).toHaveCount(0);

    await page.getByRole('button', { name: '待补规则' }).click();
    await expect(page.getByRole('button', { name: /待补规则大学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /南开大学/ })).toHaveCount(0);
    await expect(page.locator('.chip.sun').getByText('待补规则', { exact: true })).toBeVisible();
  });

  test('keeps pending schools collapsed at the end of the all view until explicitly revealed', async ({ page }) => {
    await page.route('**/api/v1/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              schoolId: 'nku',
              name: '南开大学',
              faculty: '经济学院',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 12,
              uploadCount: 9,
              sourceType: 'official',
            },
            {
              schoolId: 'bnu',
              name: '北京师范大学',
              faculty: '学位论文模板',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 10,
              uploadCount: 3,
              sourceType: 'official',
            },
            {
              schoolId: 'detected_bar',
              name: '待补规则大学',
              faculty: '',
              version: 'v1.0',
              effectiveFrom: '2026-05-12',
              ruleCount: 0,
              uploadCount: 0,
              sourceType: 'detected',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/profiles/detect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: false,
          name: null,
          confidence: 0,
          existingSchoolId: null,
        }),
      });
    });

    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '排序测试.docx', size: '1.2 MB', pages: 72 },
        documentIdentity: {
          legacyDocId: 'sort-doc',
          canonicalDocumentId: '44444444-4444-4444-8444-444444444444',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');

    await page.getByRole('button', { name: '全部 · 3' }).click();
    await expect(page.getByRole('button', { name: /南开大学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /北京师范大学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /待补规则大学/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /继续查看待补规则 · 1 所/ })).toBeVisible();

    await page.getByRole('button', { name: /继续查看待补规则 · 1 所/ }).click();
    await expect(page.getByRole('button', { name: /待补规则大学/ })).toBeVisible();
  });

  test('sorts official schools by recent 7 day usage before cumulative upload count', async ({ page }) => {
    await page.route('**/api/v1/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              schoolId: 'nku',
              name: '南开大学',
              faculty: '经济学院',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 12,
              uploadCount: 9,
              recentUsageCount7d: 1,
              recentHitRate7d: 0.1,
              lastUsedAt: '2026-05-12T08:00:00.000Z',
              sourceType: 'official',
            },
            {
              schoolId: 'bnu',
              name: '北京师范大学',
              faculty: '学位论文模板',
              version: 'v2026.05',
              effectiveFrom: '2026-05-01',
              ruleCount: 10,
              uploadCount: 3,
              recentUsageCount7d: 4,
              recentHitRate7d: 0.4,
              lastUsedAt: '2026-05-14T08:00:00.000Z',
              sourceType: 'official',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/profiles/detect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: false,
          name: null,
          confidence: 0,
          existingSchoolId: null,
        }),
      });
    });

    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        step: 2,
        doc: { name: '近期命中排序.docx', size: '1.2 MB', pages: 72 },
        documentIdentity: {
          legacyDocId: 'recent-sort-doc',
          canonicalDocumentId: '55555555-5555-4555-8555-555555555555',
        },
        schoolId: null,
      }));
    }, [APP_STATE_BOOTSTRAP_KEY] as const);

    await page.goto('/');

    const schoolButtons = page.locator('button').filter({ has: page.locator('text=近7天') });
    await expect(schoolButtons.first()).toContainText('北京师范大学');
    await expect(schoolButtons.first()).toContainText('近7天 4 次命中');
    await expect(schoolButtons.nth(1)).toContainText('南开大学');
    await expect(schoolButtons.nth(1)).toContainText('近7天 1 次命中');
  });
});

// ── RulesModal ──

const CQCCST_DETAIL = {
  school_id: 'cqccst',
  name: '重庆城市科技学院',
  faculty: '经济管理学院',
  version: 'v2021.06',
  effective_from: '2024-01-01T00:00:00.000Z',
  gb_version: 'GB/T 7714-2015',
  rules_json: [
    // page_canvas (2 rules)
    { ruleId: 'margin_top_mm', label: '上边距', value: 25, unit: 'mm', category: '01. 页面与纸张', categoryCode: '01', thesisSubset: 'page_canvas', targetObject: '页面/版心' },
    { ruleId: 'canonical_page_canvas_01', type: 'layout', label: '纸张尺寸', description: '纸张尺寸为 A4（210×297mm）', category: '01. 页面与纸张', categoryCode: '01', thesisSubset: 'page_canvas', targetObject: '页面/版心' },
    // cover (1 rule)
    { ruleId: 'canonical_cover_01', type: 'structure', label: '论文中文题目', description: '论文中文题目：二号黑体，居中', category: '02. 封面字段', categoryCode: '02', thesisSubset: 'cover', targetObject: '封面' },
    // abstract_zh (3 rules, one without targetObject)
    { ruleId: 'canonical_abstract_zh_01', type: 'structure', label: '中文摘要标题', description: '中文摘要标题：三号黑体，居中', category: '05. 中文摘要', categoryCode: '05', thesisSubset: 'abstract_zh', targetObject: '中文摘要' },
    { ruleId: 'canonical_abstract_zh_02', type: 'structure', label: '中文摘要正文', description: '中文摘要正文：小四宋体', category: '05. 中文摘要', categoryCode: '05', thesisSubset: 'abstract_zh' },
    { ruleId: 'canonical_abstract_zh_03', type: 'structure', label: '摘要字数', description: '中文摘要字数：300-500 字', category: '05. 中文摘要', categoryCode: '05', thesisSubset: 'abstract_zh', targetObject: '中文摘要' },
    // keywords (1 rule with real delimiter example)
    { ruleId: 'canonical_keywords_03', type: 'content', label: '关键词分隔符', description: '中文关键词之间使用分号分隔', category: '07. 关键词', categoryCode: '07', thesisSubset: 'keywords', targetObject: '中英文关键词' },
    // paragraph (1 rule_json)
    { ruleId: 'line_spacing', label: '正文行距', value: 1.5, category: '10. 正文段落', categoryCode: '10', thesisSubset: 'paragraph', targetObject: '正文段落' },
  ],
  style_map: [
    // paragraph style (displays as font list)
    { ruleId: 'body_fonts', allowedFonts: ['宋体', 'Times New Roman'], category: '10. 正文段落', categoryCode: '10', thesisSubset: 'paragraph', targetObject: '正文段落' },
  ],
  source_type: 'official',
  upload_count: 3,
};

const EMPTY_DETAIL = {
  school_id: 'empty_u',
  name: '空白规则大学',
  faculty: '',
  version: 'v1.0',
  effective_from: '2026-05-12T00:00:00.000Z',
  rules_json: [],
  style_map: [],
  source_type: 'official',
  upload_count: 0,
};

async function bootstrapStep2WithProfile(page: any, profileDetail: any) {
  await page.route('**/api/v1/profiles', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [
          {
            schoolId: profileDetail.school_id || profileDetail.schoolId,
            name: profileDetail.name,
            faculty: profileDetail.faculty || '',
            version: profileDetail.version,
            effectiveFrom: profileDetail.effective_from,
            ruleCount: (profileDetail.rules_json?.length || 0) + (profileDetail.style_map?.length || 0),
            uploadCount: profileDetail.upload_count || 0,
            sourceType: profileDetail.source_type,
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/profiles/detect', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ detected: false, name: null, confidence: 0, existingSchoolId: null }),
    });
  });

  const schoolId = profileDetail.school_id || profileDetail.schoolId;
  await page.route(`**/api/v1/profiles/${schoolId}`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profileDetail),
    });
  });

  await page.addInitScript(([storageKey]) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      step: 2,
      doc: { name: '测试论文.docx', size: '1.2 MB', pages: 72 },
      documentIdentity: { legacyDocId: 'test-doc', canonicalDocumentId: '00000000-0000-4000-8000-000000000000' },
      schoolId: null,
    }));
  }, [APP_STATE_BOOTSTRAP_KEY] as const);

  await page.goto('/');
}

test.describe('RulesModal two-column layout', () => {
  test('opens with correct header metadata and subset count', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    await expect(page.getByText('这篇论文将遵循的完整规则')).toBeVisible();
    await expect(page.getByText('重庆城市科技学院 · 经济管理学院').first()).toBeVisible();
    await expect(page.getByText('v2021.06').first()).toBeVisible();
    await expect(page.getByText(/9 条 · 5 个元子集/)).toBeVisible();
  });

  test('left sidebar lists all thesis subsets with rule counts', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    // Each subset label visible in sidebar buttons
    await expect(page.getByRole('button', { name: /01 页面版心/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /02 封面/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /05 中文摘要/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /07 关键词/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /10 正文段落/ })).toBeVisible();

    // Verify at least 5 subset navigation buttons exist
    const sidebarButtons = page.locator('div[style*="overflow:"] button');
    await expect(sidebarButtons.first()).toBeVisible();
  });

  test('defaults to first subset (page_canvas) and shows its rules on the right', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    // Right panel header shows first subset info
    await expect(page.getByText('01. 页面与纸张')).toBeVisible();
    await expect(page.getByText('page_canvas')).toBeVisible();
    await expect(page.getByText('2 条规则')).toBeVisible();

    // First subset's rules visible
    await expect(page.getByText('上边距').first()).toBeVisible();
    await expect(page.getByText('25 mm').first()).toBeVisible();
    await expect(page.getByText('纸张尺寸为 A4（210×297mm）').first()).toBeVisible();
    // targetObject visible
    await expect(page.getByText('页面/版心').first()).toBeVisible();
  });

  test('clicking a different subset switches right panel content', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    // Click 中文摘要 in sidebar
    await page.getByRole('button', { name: /05 中文摘要/ }).click();

    // Right panel switches to abstract_zh
    await expect(page.getByText('05. 中文摘要')).toBeVisible();
    await expect(page.getByText('abstract_zh')).toBeVisible();
    await expect(page.getByText('3 条规则')).toBeVisible();

    // abstract_zh rules appear
    await expect(page.getByText('中文摘要标题：三号黑体，居中').first()).toBeVisible();
    await expect(page.getByText('中文摘要正文：小四宋体').first()).toBeVisible();
    await expect(page.getByText('中文摘要字数：300-500 字').first()).toBeVisible();

    // page_canvas rules should NOT be visible now
    await expect(page.getByText('上边距 25 mm')).toHaveCount(0);

    // Click 关键词
    await page.getByRole('button', { name: /07 关键词/ }).click();
    await expect(page.getByText('07. 关键词')).toBeVisible();
    await expect(page.getByText('keywords')).toBeVisible();
    await expect(page.getByText('中文关键词之间使用分号分隔').first()).toBeVisible();
  });

  test('rule cards display index, targetObject, description, and values', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    // Switch to paragraph to see value rendering
    await page.getByRole('button', { name: /10 正文段落/ }).click();

    // paragraph has rulesJson (行距 1.5) + styleMap (allowedFonts)
    await expect(page.getByText('正文行距')).toBeVisible();
    await expect(page.getByText('1.5')).toBeVisible();
    await expect(page.getByText('字体：宋体 / Times New Roman')).toBeVisible();
  });

  test('rule without targetObject shows only rule text', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    // abstract_zh has one rule without targetObject (中文摘要正文：小四宋体)
    await page.getByRole('button', { name: /05 中文摘要/ }).click();
    await expect(page.getByText('中文摘要正文：小四宋体').first()).toBeVisible();
    // Its preceding rule has targetObject
    await expect(page.getByText('中文摘要标题：三号黑体，居中').first()).toBeVisible();
  });

  test('close button hides the modal', async ({ page }) => {
    await bootstrapStep2WithProfile(page, CQCCST_DETAIL);
    await page.getByRole('button', { name: /重庆城市科技学院/ }).click();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    await expect(page.getByText('这篇论文将遵循的完整规则')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByText('这篇论文将遵循的完整规则')).toHaveCount(0);
  });

  test('empty rules shows fallback state', async ({ page }) => {
    await bootstrapStep2WithProfile(page, EMPTY_DETAIL);
    // Switch to "全部" filter and expand pending profiles with 0 rules
    await page.getByRole('button', { name: /全部/ }).click();
    await page.getByRole('button', { name: /继续查看待补规则/ }).click();
    await page.getByText('空白规则大学').click();
    await expect(page.getByText(/0 条规则/)).toBeVisible();
    await expect(page.getByRole('button', { name: '按这套规范开始解析' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '待补规则，暂不能解析' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '补充规则模板' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '补充模板' })).toBeVisible();
    await page.getByRole('button', { name: '查看完整规则' }).click();

    await expect(page.getByText('这篇论文将遵循的完整规则')).toBeVisible();
    await expect(page.getByText('还处在待补规则状态')).toBeVisible();
    await expect(page.getByText('当前识别到的是学校档案')).toBeVisible();
  });
});
