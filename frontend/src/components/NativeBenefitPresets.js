import React from 'react';
import AIFieldPresets from './AIFieldPresets';

const actualSourceFields = new Set(['paystub_text', 'tax_return_text', 'letter_text']);
export const benefitPolicyQuestions = [
  'What source records and current rules must an authorized reviewer verify before a Medicaid eligibility determination? Do not assume eligibility, consent or a completed review.',
  'Explain which missing facts could change the applicable refugee or asylee Medicaid pathway. Separate general policy questions from verified case evidence.',
  'Compare the review steps and source documents needed for a policy citation. Do not invent a statute, case fact, official decision or approved benefit.',
];
export function benefitInputDefaults(verb) {
  return Object.fromEntries((verb?.inputs || []).map((field) => [field.key, actualSourceFields.has(field.key) ? '' : field.key === 'question' ? benefitPolicyQuestions[0] : field.defaultValue ?? '']));
}
export default function NativeBenefitPresets({ verb, values, onFill, disabled }) {
  const fields = verb.inputs || [];
  if (!fields.length) return null;
  const hasSource = fields.some((field) => actualSourceFields.has(field.key));
  const samples = (hasSource ? ['Keep source facts', 'Trim outer whitespace', 'Normalize line endings'] : ['Evidence checklist', 'Missing-fact review', 'Policy-source review']).map((name) => ({ label: `Demo AI · ${name}` }));
  const fill = (_, index) => {
    const next = { ...values };
    for (const field of fields) {
      const current = String(values[field.key] ?? '');
      if (actualSourceFields.has(field.key)) next[field.key] = index === 1 ? current.trim() : index === 2 ? current.replace(/\r\n?/g, '\n') : current;
      else if (field.key === 'question') next[field.key] = benefitPolicyQuestions[index];
      else next[field.key] = values[field.key] ?? field.defaultValue ?? '';
    }
    onFill(next);
  };
  return <div>
    <AIFieldPresets fields={fields.map((field) => ({ ...field, requiresExistingRecord: actualSourceFields.has(field.key) }))} samples={samples} onFill={fill} disabled={disabled} context={verb.label} />
    {hasSource && <p role="status">Paste the actual source text first. These three review choices preserve its facts; no example creates a paystub, tax return, employer letter, verification or official decision.</p>}
  </div>;
}
