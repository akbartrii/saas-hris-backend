import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CompanyContext = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const company = request.company;

    if (!company) return null;

    return data ? company[data] : company;
  },
);
