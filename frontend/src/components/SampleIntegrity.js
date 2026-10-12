const authorityKey = key => /(?:^|_)(?:id|ids)(?:_|$)/i.test(key) || /[a-z](?:Id|Ids)$/.test(key) || /^(?:consent|approved|approval|authorized|authorization|verified|certified)(?:$|[_A-Z])/i.test(key);
const humanAuthority = key => /^(?:consent|approved|approval|authorized|authorization|verified|certified)(?:$|[_A-Z])/i.test(key);
const sourceArray = key => /^(?:budgets|ae_data|observations|clinical_data|patient_data|records|subjects|visits|enrollment_curve|measurements|source_data)$/.test(key);
const parsed = value => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } };
const hasAuthority = value => { const data = parsed(value); return data && typeof data === 'object' && (Array.isArray(data) ? data.some(hasAuthority) : Object.entries(data).some(([key, item]) => authorityKey(key) || hasAuthority(item))); };
export function demonstrationData(value) {
  const data = parsed(value);
  if (Array.isArray(data)) return data.map(demonstrationData);
  if (data && typeof data === 'object') return Object.fromEntries(Object.entries(data).filter(([key]) => !authorityKey(key)).map(([key, item]) => [key, demonstrationData(item)]));
  return data;
}
export function protectPresetRequest(candidate, current = {}) {
  const actualSourceSelected = hasAuthority(current);
  return Object.fromEntries(Object.entries(candidate).map(([key, value]) => {
    if (humanAuthority(key)) return [key, current[key] ?? false];
    if (actualSourceSelected && sourceArray(key)) return [key, current[key] ?? ''];
    const before = parsed(current[key]), data = parsed(value);
    const protectedValue = hasAuthority(before) ? before : demonstrationData(data);
    return [key, typeof value === 'string' && data !== value ? JSON.stringify(protectedValue, null, 2) : protectedValue];
  }));
}
