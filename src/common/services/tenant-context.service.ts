import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  companyId: string | null;
}

@Injectable()
export class TenantContextService implements OnModuleDestroy {
  private readonly als = new AsyncLocalStorage<TenantContext>();

  run<R>(context: TenantContext, cb: () => R): R {
    return this.als.run(context, cb);
  }

  getCompanyId(): string | undefined {
    const store = this.als.getStore();
    return store?.companyId;
  }

  setCompanyId(companyId: string): void {
    const store = this.als.getStore();
    if (store) {
      store.companyId = companyId;
    }
  }

  hasContext(): boolean {
    return this.als.getStore() !== undefined;
  }

  onModuleDestroy() {
    this.als.disable();
  }
}
