export type AdminAuditAction = "CREATE" | "UPDATE" | "DELETE";

export const ADMIN_ENTITY = {
  INSTITUTION: "institution",
  EXCHANGE_RATE: "exchange_rate",
  INSTITUTION_PRODUCT: "institution_product",
  COUNTRY: "country",
  CURRENCY: "currency",
  MARKET_ASSET: "market_asset",
} as const;

export type AdminEntityType = (typeof ADMIN_ENTITY)[keyof typeof ADMIN_ENTITY];

export type SerializedAdminAuditLog = {
  id: string;
  action: AdminAuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  parentType: string | null;
  parentId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type AuditLogRecord = {
  id: string;
  action: AdminAuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  parentType: string | null;
  parentId: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export function serializeAdminAuditLog(record: AuditLogRecord): SerializedAdminAuditLog {
  return {
    id: record.id,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    entityLabel: record.entityLabel,
    parentType: record.parentType,
    parentId: record.parentId,
    before: record.before,
    after: record.after,
    createdAt: record.createdAt.toISOString(),
    user: record.user,
  };
}

export const ADMIN_AUDIT_ACTION_LABEL: Record<AdminAuditAction, string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  DELETE: "Remoção",
};

export const ADMIN_ENTITY_LABEL: Record<string, string> = {
  [ADMIN_ENTITY.INSTITUTION]: "Instituição",
  [ADMIN_ENTITY.EXCHANGE_RATE]: "Par de câmbio",
  [ADMIN_ENTITY.INSTITUTION_PRODUCT]: "Produto / conta",
  [ADMIN_ENTITY.COUNTRY]: "País",
  [ADMIN_ENTITY.CURRENCY]: "Moeda",
  [ADMIN_ENTITY.MARKET_ASSET]: "Ativo de mercado",
};
