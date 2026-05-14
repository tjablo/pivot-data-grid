import type { DrillDownRequest, PivotModel, SourceFilter } from '../core/types';

export interface DrillDownSession {
  request: DrillDownRequest;
  scopeKey: string;
}

export class DrillDownSessionService {
  getScopeKey(model: PivotModel, filters: SourceFilter[]): string {
    return JSON.stringify({ filters, model });
  }

  create(scopeKey: string, request: DrillDownRequest): DrillDownSession {
    return { request, scopeKey };
  }

  getActive(session: DrillDownSession | null, scopeKey: string): DrillDownSession | null {
    return session?.scopeKey === scopeKey ? session : null;
  }
}

export const drillDownSessionService = new DrillDownSessionService();
