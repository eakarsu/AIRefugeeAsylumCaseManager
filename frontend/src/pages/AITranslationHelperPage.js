import React from 'react';
import AIPage from '../components/AIPage';
import { aiTranslationHelper } from '../services/api';

export default function AITranslationHelperPage() {
  return (
    <AIPage
      title="AI · Translation Helper"
      feature="translation-helper"
      subtitle="Client narrative translation with terminology preservation, dialect flag, and back-translation QA."
      inputs={[
        { key: 'source_text', label: 'Source Text', type: 'textarea',
          placeholder: 'Paste the text to translate.' },
        { key: 'source_lang', label: 'Source Language', type: 'text',
          placeholder: 'e.g. es-HN, ar-LB, ti, ps, uk' },
        { key: 'target_lang', label: 'Target Language', type: 'text',
          placeholder: 'e.g. en' },
        { key: 'domain',      label: 'Domain hint',    type: 'text',
          placeholder: 'e.g. IPV / denuncia, detention narrative, client correspondence' },
      ]}
      run={(v) => aiTranslationHelper({
        source_text: v.source_text,
        source_lang: v.source_lang,
        target_lang: v.target_lang,
        domain: v.domain,
      })}
    />
  );
}
