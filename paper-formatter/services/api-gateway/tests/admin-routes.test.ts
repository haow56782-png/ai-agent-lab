import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRoutes } from "../src/routes/admin.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import * as adminRepo from "../src/repositories/admin.js";

vi.mock("../src/repositories/admin.js", async () => {
  const actual = await vi.importActual<typeof import("../src/repositories/admin.js")>("../src/repositories/admin.js");
  return {
    ...actual,
    getOverview: vi.fn(),
    listDomainRecords: vi.fn(),
    listAuditRecords: vi.fn(),
  };
});

describe("admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function request(path: string) {
    return new Promise<{ response: { status: number }; body: any }>((resolve, reject) => {
      const strippedPath = path.replace(/^\/admin(?=\/|\?|$)/, "") || "/";
      const routerPath = strippedPath.startsWith("?") ? `/${strippedPath}` : strippedPath;
      const req: any = {
        method: "GET",
        url: routerPath,
        originalUrl: path,
        headers: { "content-type": "application/json" },
        query: Object.fromEntries(new URL(`http://local.test${path}`).searchParams.entries()),
        params: {},
      };
      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: unknown) {
          resolve({ response: { status: this.statusCode }, body: payload });
          return this;
        },
        send(payload: unknown) {
          resolve({ response: { status: this.statusCode }, body: payload });
          return this;
        },
      };
      adminRoutes.handle(req, res, (err: unknown) => {
        if (!err) {
          resolve({ response: { status: 404 }, body: { error: { message: "Not found" } } });
          return;
        }
        errorHandler(err as Error, req, res, reject);
      });
    });
  }

  it("returns production admin overview from the repository", async () => {
    vi.mocked(adminRepo.getOverview).mockResolvedValue({
      domains: adminRepo.ADMIN_DOMAINS,
      tables: [...adminRepo.ADMIN_TABLES],
      flowSteps: adminRepo.ADMIN_FLOW_STEPS,
      capabilityTotals: { enabled: 10, total: 20 },
      tableCounts: { documents: 2, findings: 3 },
    } as any);

    const { response, body } = await request("/admin/overview");

    expect(response.status).toBe(200);
    expect(body.domains).toEqual(adminRepo.ADMIN_DOMAINS);
    expect(body.tables).toContain("audit_records");
    expect(body.capabilityTotals).toEqual({ enabled: 10, total: 20 });
    expect(adminRepo.getOverview).toHaveBeenCalledOnce();
  });

  it("lists domain records with search and bounded limit", async () => {
    vi.mocked(adminRepo.listDomainRecords).mockResolvedValue([
      { id: "PAGE_LAYOUT_MARGIN", name: "页边距", status: "pending", owner: "findings", evidence: "document_id=doc_1" },
    ]);

    const { response, body } = await request("/admin/domains/tasks/records?search=margin&limit=30");

    expect(response.status).toBe(200);
    expect(body.domain.id).toBe("tasks");
    expect(body.records[0].id).toBe("PAGE_LAYOUT_MARGIN");
    expect(adminRepo.listDomainRecords).toHaveBeenCalledWith("tasks", { search: "margin", limit: 30 });
  });

  it("rejects unknown domains instead of falling back to fake data", async () => {
    const { response, body } = await request("/admin/domains/unknown/records");

    expect(response.status).toBe(404);
    expect(body.error.message).toContain("Unknown admin domain");
    expect(adminRepo.listDomainRecords).not.toHaveBeenCalled();
  });

  it("exposes audit records as read-only admin data", async () => {
    vi.mocked(adminRepo.listAuditRecords).mockResolvedValue([
      { id: "audit_1", name: "accept finding", status: "accepted", owner: "audit_records", evidence: "target_id=finding_1" },
    ]);

    const { response, body } = await request("/admin/audit-records?search=finding_1&limit=10");

    expect(response.status).toBe(200);
    expect(body.records[0].owner).toBe("audit_records");
    expect(adminRepo.listAuditRecords).toHaveBeenCalledWith({ search: "finding_1", limit: 10 });
  });
});
