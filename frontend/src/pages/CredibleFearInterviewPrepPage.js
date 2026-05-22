import React, { useEffect, useState } from 'react';
import { getToken } from '../services/api';

export default function CredibleFearInterviewPrepPage() {
  const [data, setData] = useState({ summary: {}, prepCases: [] });
  const [brief, setBrief] = useState(null);
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

  useEffect(() => {
    fetch('/api/credible-fear-interview-prep', { headers: headers() }).then((res) => res.json()).then(setData);
  }, []);

  const generateBrief = async (id) => {
    const res = await fetch('/api/credible-fear-interview-prep/brief', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ id }),
    });
    setBrief(await res.json());
  };

  return (
    <section>
      <h1>Credible Fear Interview Prep</h1>
      <p>Prepare applicants with claim-element practice, interpreter needs, and trauma-informed interview guidance.</p>
      <div className="cards">
        {Object.entries(data.summary).map(([key, value]) => <div className="card" key={key}><span>{key}</span><strong>{value}</strong></div>)}
      </div>
      {data.prepCases.map((item) => (
        <div className="card" key={item.id}>
          <strong>{item.applicant}</strong> · {item.basis} · {item.language}
          <p>{item.readiness}% ready · gaps: {item.gaps.length ? item.gaps.join(', ') : 'none'}</p>
          <button className="btn primary" onClick={() => generateBrief(item.id)}>Generate prep brief</button>
        </div>
      ))}
      {brief && <div className="card">{brief.applicant}: {brief.prepFocus.join(' · ')} {brief.traumaInformedNote}</div>}
    </section>
  );
}
