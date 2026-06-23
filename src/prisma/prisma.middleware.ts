import { Prisma } from "@prisma/client";

const MODELS_WITHOUT_COMPANY_ID = new Set([
  "ms_roles",
  "ms_role_permissions",
  "ms_permissions",
  "ms_menus",
  "ms_ter",
  "ms_ter_fee",
  "ms_salary_keys",
  "ms_companies",
]);

type PrismaAction =
  | "create"
  | "createMany"
  | "findUnique"
  | "findFirst"
  | "findMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "aggregate"
  | "count";

const WRITE_ACTIONS = new Set<PrismaAction>([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

const READ_ACTIONS = new Set<PrismaAction>([
  "findFirst",
  "findMany",
  "aggregate",
  "count",
]);

type MiddlewareFn = (
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
) => Promise<any>;

export function createTenantMiddleware(
  getCompanyId: () => string | undefined,
): MiddlewareFn {
  return async (params: Prisma.MiddlewareParams, next) => {
    const model = params.model as string;

    if (!model || MODELS_WITHOUT_COMPANY_ID.has(model)) {
      return next(params);
    }

    const companyId = getCompanyId();

    if (!companyId) {
      return next(params);
    }

    const action = params.action as PrismaAction;

    if (WRITE_ACTIONS.has(action)) {
      if (!params.args?.data?.company_id && !params.args?.data?.companyId) {
        if (params.args?.data) {
          params.args.data = {
            ...params.args.data,
            company_id: companyId,
          };
        }
      }
    }

    if (READ_ACTIONS.has(action)) {
      if (!params.args?.where?.company_id && !params.args?.where?.companyId) {
        params.args = {
          ...params.args,
          where: {
            ...params.args?.where,
            company_id: companyId,
          },
        };
      }
    }

    if (action === "update" || action === "delete") {
      if (!params.args?.where?.company_id && !params.args?.where?.companyId) {
        params.args = {
          ...params.args,
          where: {
            ...params.args?.where,
            company_id: companyId,
          },
        };
      }
    }

    return next(params);
  };
}
