const VALID_REASONS = new Set(['invalid-dimensions', 'duplicate-id']);

export function validateFabricationItems(items = []) {
  const seen = new Set();
  const valid = [];
  const rejected = [];

  for (const [index, item] of items.entries()) {
    const id = item?.id ?? `piece-${index + 1}`;
    const width = Number(item?.width);
    const depth = Number(item?.depth);

    if (!Number.isFinite(width) || !Number.isFinite(depth) || width <= 0 || depth <= 0) {
      rejected.push({ id, name: item?.name ?? id, width, depth, reason: 'invalid-dimensions' });
      continue;
    }

    if (seen.has(id)) {
      rejected.push({ id, name: item?.name ?? id, width, depth, reason: 'duplicate-id' });
      continue;
    }

    seen.add(id);
    valid.push({ ...item, id, width, depth });
  }

  return { valid, rejected };
}

export function isKnownFabricationRejectReason(reason) {
  return VALID_REASONS.has(reason) || reason === 'no-fit';
}
