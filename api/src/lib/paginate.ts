export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sortBy<T>(items: readonly T[], key: keyof T, order: 'asc' | 'desc'): T[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y) * direction;
    return (Number(x) - Number(y)) * direction;
  });
}

// page past the end just returns empty data, not an error
export function paginate<T>(items: readonly T[], page: number, limit: number): { data: T[]; meta: PageMeta } {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) },
  };
}
