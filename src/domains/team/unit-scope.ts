export type OrganizationUnitType = "HEADQUARTERS" | "REGION" | "BRANCH";

export interface OrganizationUnitNode {
  id: string;
  organizationId: string;
  parentId: string | null;
  type: OrganizationUnitType;
  name: string;
  isActive: boolean;
}

export interface UnitScopePolicy {
  organizationId: string;
  managedUnitIds: string[];
  includeDescendants?: boolean;
}

export function collectManagedUnitIds(
  units: OrganizationUnitNode[],
  policy: UnitScopePolicy,
): string[] {
  const activeUnits = units.filter(
    (unit) => unit.organizationId === policy.organizationId && unit.isActive,
  );

  if (!policy.includeDescendants) {
    return unique(policy.managedUnitIds.filter((unitId) => activeUnits.some((unit) => unit.id === unitId)));
  }

  const childrenByParent = activeUnits.reduce<Record<string, OrganizationUnitNode[]>>((acc, unit) => {
    if (!unit.parentId) return acc;
    acc[unit.parentId] = [...(acc[unit.parentId] ?? []), unit];
    return acc;
  }, {});

  const scoped = new Set<string>();
  const stack = [...policy.managedUnitIds];

  while (stack.length > 0) {
    const unitId = stack.pop();
    if (!unitId || scoped.has(unitId)) continue;
    if (!activeUnits.some((unit) => unit.id === unitId)) continue;

    scoped.add(unitId);
    stack.push(...(childrenByParent[unitId] ?? []).map((unit) => unit.id));
  }

  return [...scoped];
}

export function createAggregateOnlyFilter(
  organizationId: string,
  unitIds: string[],
): { organizationId: string; unitId?: { in: string[] } } {
  if (unitIds.length === 0) {
    return { organizationId };
  }

  return {
    organizationId,
    unitId: { in: unitIds },
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
