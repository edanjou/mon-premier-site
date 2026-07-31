export function orderItems<T extends { href: string }>(
  available: T[],
  savedOrder: string[] | null,
): T[] {
  if (!savedOrder) return available;
  const byHref = new Map(available.map((item) => [item.href, item]));
  const ordered = savedOrder
    .map((href) => byHref.get(href))
    .filter((item): item is T => Boolean(item));
  const remaining = available.filter((item) => !savedOrder.includes(item.href));
  return [...ordered, ...remaining];
}
