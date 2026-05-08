'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { SeverityBadge, StatusBadge, CAPAStatusBadge, AIBadge, ConfidenceBar, LoadingSpinner } from '@/components/Badges';

interface CAPATask {
  id: string;
  title: string;
  description?: string;
  type: string;
  assigned_to: string;
  due_date: string;
  status: string;
  effectiveness_metric?: string;
  priority?: string;
}

interface RootCause {
  level: number;
  why: string;
  answer: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface Deviation {
  id: string;
  deviation_number: string;
  title: string;
  description: string;
  type: string;
  location: string;
  batch_number: string;
  product_name: string;
  detected_by: string;
  detected_date: string;
  immediate_actions: string;
  status: string;
  severity: string;
  severity_justification: string;
  ai_classification: string;
  root_cause_method: string;
  root_causes: string;
  capa_plan: string;
  related_equipment: string;
  related_supplier: string;
  related_sop: string;
  related_cases: string;
  assigned_to: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  comments: string;
  similar_cases?: Array<{ id: string; deviation_number: string; title: string; severity: string }>;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  'Draft': ['Under Review'],
  'Under Review': ['Approved', 'Rejected'],
  'Approved': ['Closed'],
  'Rejected': ['Draft'],
  'Closed': [],
};

const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Черновик', 'Under Review': 'На проверке',
  'Approved': 'Согласовано', 'Rejected': 'Отклонено', 'Closed': 'Закрыто',
};

type Tab = 'overview' | 'investigation' | 'capa' | 'history';

export default function DeviationDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [dev, setDev] = useState<Deviation | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [aiLoading, setAiLoading] = useState<string>('');
  const [capaData, setCapaData] = useState<{ capa_tasks?: CAPATask[]; effectiveness_review?: string; recurrence_prevention?: string } | null>(null);
  const [investigationPlan, setInvestigationPlan] = useState<{ investigation_steps?: Array<{step:number;title:string;description:string;responsible:string;duration_days:number;deliverable:string}>; hypothesis_list?: Array<{hypothesis:string;probability:string;evidence_needed:string}> } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newCapaTask, setNewCapaTask] = useState({ title: '', type: 'Corrective', assigned_to: '', due_date: '', effectiveness_metric: '', description: '' });
  const [showAddCapa, setShowAddCapa] = useState(false);
  const [rootCauseMethod, setRootCauseMethod] = useState('');

  useEffect(() => {
    fetch(`/api/deviations/${id}`)
      .then(r => r.json())
      .then(data => { setDev(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const aiAction = async (action: string) => {
    if (!dev) return;
    setAiLoading(action);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deviation: { ...dev, root_causes: dev.root_causes } }),
      });
      const data = await res.json();
      console.log('AI response:', action, JSON.stringify(data));
      if (action === 'generate_capa') {
        if (data.capa) setCapaData(data.capa);
        else alert('Ответ: ' + JSON.stringify(data).slice(0, 200));
      }
      if (action === 'generate_investigation') {
        if (data.investigation_plan) setInvestigationPlan(data.investigation_plan);
        else alert('Ответ: ' + JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      alert('Ошибка AI: ' + String(e));
    } finally {
      setAiLoading('');
    }
  };

  const applyCapa = async () => {
    if (!dev || !capaData?.capa_tasks) return;
    const tasks = capaData.capa_tasks.map((t, i) => ({
      ...t, id: `capa-new-${i}`, status: 'Open',
      due_date: new Date(Date.now() + (t as unknown as { due_days: number }).due_days * 86400000).toISOString().split('T')[0],
    }));
    const updated = await fetch(`/api/deviations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capa_plan: JSON.stringify(tasks) }),
    }).then(r => r.json());
    setDev(updated);
    setCapaData(null);
  };

  const changeStatus = async (newStatus: string) => {
    if (!dev) return;
    setUpdatingStatus(true);
    const updated = await fetch(`/api/deviations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).then(r => r.json());
    setDev(updated);
    setUpdatingStatus(false);
  };

  const addComment = async () => {
    if (!dev || !newComment || !commentAuthor) return;
    const comments = JSON.parse(dev.comments || '[]');
    comments.push({ id: `c${Date.now()}`, author: commentAuthor, text: newComment, date: new Date().toISOString() });
    const updated = await fetch(`/api/deviations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: JSON.stringify(comments) }),
    }).then(r => r.json());
    setDev(updated);
    setNewComment('');
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size={40} />
      </main>
    </div>
  );

  if (!dev) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px' }}>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 100 }}>Отклонение не найдено</div>
      </main>
    </div>
  );

  const aiClass = (() => { try { return JSON.parse(dev.ai_classification || '{}'); } catch { return {}; } })();
  const rootCauses: RootCause[] = (() => { try { return JSON.parse(dev.root_causes || '[]'); } catch { return []; } })();
  const capaTasks: CAPATask[] = (() => { try { return JSON.parse(dev.capa_plan || '[]'); } catch { return []; } })();
  const comments: Comment[] = (() => { try { return JSON.parse(dev.comments || '[]'); } catch { return []; } })();
  const nextStatuses = STATUS_TRANSITIONS[dev.status] || [];
  const addManualCapa = async () => {
    if (!dev || !newCapaTask.title) return;
    const tasks = [...capaTasks, { ...newCapaTask, id: `capa-manual-${Date.now()}`, status: 'Open', priority: 'Medium' }];
    const updated = await fetch(`/api/deviations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capa_plan: JSON.stringify(tasks) }),
    }).then(r => r.json());
    setDev(updated);
    setNewCapaTask({ title: '', type: 'Corrective', assigned_to: '', due_date: '', effectiveness_metric: '', description: '' });
    setShowAddCapa(false);
  };

  const updateCapaStatus = async (taskId: string, status: string) => {
    if (!dev) return;
    const tasks = capaTasks.map(t => t.id === taskId ? { ...t, status } : t);
    const updated = await fetch(`/api/deviations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capa_plan: JSON.stringify(tasks) }),
    }).then(r => r.json());
    setDev(updated);
  };

  const isOverdue = dev.due_date && dev.status !== 'Closed' && new Date(dev.due_date) < new Date();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px', maxWidth: 'calc(100vw - 220px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Назад</button>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{dev.deviation_number}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <SeverityBadge severity={dev.severity} />
                <StatusBadge status={dev.status} />
                {isOverdue && <span style={{ color: 'var(--critical)', fontSize: 12, fontWeight: 700 }}>⚠ Просрочено</span>}
                {Object.keys(aiClass).length > 0 && <AIBadge />}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{dev.title}</h1>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {dev.location}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🧪 {dev.product_name}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Серия: {dev.batch_number}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👤 {dev.assigned_to}</span>
              </div>
            </div>

            {/* Status change */}
            {nextStatuses.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {nextStatuses.map(s => (
                  <button key={s} onClick={() => changeStatus(s)} disabled={updatingStatus}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Manrope',
                      background: s === 'Approved' ? 'rgba(99,102,241,0.1)' : s === 'Closed' ? 'var(--success-bg)' : s === 'Rejected' ? 'var(--critical-bg)' : 'var(--warning-bg)',
                      borderColor: s === 'Approved' ? 'rgba(99,102,241,0.3)' : s === 'Closed' ? 'rgba(16,185,129,0.3)' : s === 'Rejected' ? 'var(--critical-border)' : 'rgba(245,158,11,0.3)',
                      color: s === 'Approved' ? '#818cf8' : s === 'Closed' ? 'var(--success)' : s === 'Rejected' ? 'var(--critical)' : 'var(--warning)',
                    }}>
                    {updatingStatus ? '...' : `→ ${STATUS_LABELS[s]}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {([['overview', 'Обзор'], ['investigation', 'Расследование'], ['capa', 'CAPA-план'], ['history', 'История']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Manrope', fontSize: 14, fontWeight: tab === key ? 700 : 500,
                color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {label}
              {key === 'capa' && capaTasks.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', background: 'var(--accent-light)', borderRadius: 20, color: 'var(--accent)', fontFamily: 'IBM Plex Mono' }}>
                  {capaTasks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: Overview */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Description */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Описание</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{dev.description}</p>
              </div>

              {/* Immediate actions */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Немедленные действия</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{dev.immediate_actions}</p>
              </div>

              {/* Related */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Связанные объекты</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Оборудование', value: dev.related_equipment },
                    { label: 'Поставщик', value: dev.related_supplier },
                    { label: 'SOP', value: dev.related_sop },
                    { label: 'Тип', value: dev.type },
                  ].map(({ label, value }) => value && (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Комментарии ({comments.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '2px solid var(--accent)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.author}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(c.date).toLocaleDateString('ru-RU')} {new Date(c.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.text}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="input" placeholder="Ваше имя / должность" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} />
                  <textarea className="input" rows={3} placeholder="Добавить комментарий к расследованию..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ resize: 'vertical' }} />
                  <button onClick={addComment} className="btn-secondary" style={{ alignSelf: 'flex-end' }}>
                    Добавить комментарий
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar - AI result + meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Meta */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Детали</h3>
                {[
                  { label: 'Дата обнаружения', value: new Date(dev.detected_date).toLocaleDateString('ru-RU') },
                  { label: 'Обнаружил', value: dev.detected_by },
                  { label: 'Ответственный', value: dev.assigned_to },
                  { label: 'Срок закрытия', value: dev.due_date ? new Date(dev.due_date).toLocaleDateString('ru-RU') : '—' },
                  { label: 'Создано', value: new Date(dev.created_at).toLocaleDateString('ru-RU') },
                  { label: 'Обновлено', value: new Date(dev.updated_at).toLocaleDateString('ru-RU') },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* AI Classification */}
              {Object.keys(aiClass).length > 0 && (
                <div className="ai-panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 14 }}>◈</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI-классификация</span>
                    <AIBadge />
                  </div>
                  
                  {aiClass.confidence && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Уверенность</div>
                      <ConfidenceBar value={aiClass.confidence} />
                    </div>
                  )}
                  
                  {aiClass.gmp_category && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>GMP-категория</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{aiClass.gmp_category}</div>
                    </div>
                  )}
                  
                  {aiClass.justification && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Обоснование</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiClass.justification}</div>
                    </div>
                  )}

                  {aiClass.regulatory_refs?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {aiClass.regulatory_refs.map((ref: string, i: number) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, color: '#a5b4fc', fontFamily: 'IBM Plex Mono' }}>{ref}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Similar cases */}
              {dev.similar_cases && dev.similar_cases.length > 0 && (
                <div className="card" style={{ padding: 20 }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Похожие кейсы
                  </h3>
                  {dev.similar_cases.map(sc => (
                    <div key={sc.id} onClick={() => router.push(`/deviations/${sc.id}`)}
                      style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{sc.deviation_number}</span>
                        <SeverityBadge severity={sc.severity} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sc.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Investigation */}
        {tab === 'investigation' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Root cause method */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Анализ корневых причин — {dev.root_cause_method}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['5Why', 'Fishbone'].map(method => (
                      <button key={method} onClick={async () => {
                        const updated = await fetch(`/api/deviations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root_cause_method: method }) }).then(r => r.json());
                        setDev(updated);
                      }} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 600, border: `1px solid ${dev.root_cause_method === method ? 'var(--accent)' : 'var(--border)'}`, background: dev.root_cause_method === method ? 'var(--accent-light)' : 'transparent', color: dev.root_cause_method === method ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {Array.isArray(rootCauses) && dev.root_cause_method === '5Why' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {rootCauses.map((rc, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: rc.answer ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: rc.answer ? 'white' : 'var(--text-muted)', flexShrink: 0, fontFamily: 'IBM Plex Mono' }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          {rc.why && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>{rc.why}</div>}
                          {rc.answer ? (
                            <div style={{ fontSize: 14, color: 'var(--text-primary)', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '2px solid var(--accent)' }}>{rc.answer}</div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>Расследование в процессе...</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!Array.isArray(rootCauses) && rootCauses && (rootCauses as unknown as { effect?: string; causes?: Record<string, string[]> }).causes && (
                  <div>
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--critical-bg)', border: '1px solid var(--critical-border)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Следствие</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--critical)' }}>{(rootCauses as unknown as { effect: string }).effect}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {Object.entries((rootCauses as unknown as { causes: Record<string, string[]> }).causes).map(([category, items]) => (
                        <div key={category} style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>{category}</div>
                          {items.map((item, i) => (
                            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 6 }}>
                              <span style={{ color: 'var(--text-muted)' }}>·</span> {item}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Investigation Plan */}
              {investigationPlan && (
                <div className="ai-panel" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span>◈</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI-план расследования</span>
                    <AIBadge />
                  </div>

                  {investigationPlan.investigation_steps?.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{step.step}</div>
                      <div style={{ flex: 1, padding: '10px 14px', background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{step.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{step.description}</div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                          <span style={{ color: 'var(--text-muted)' }}>👤 {step.responsible}</span>
                          <span style={{ color: 'var(--text-muted)' }}>⏱ {step.duration_days} дн.</span>
                          <span style={{ color: 'var(--accent)' }}>📄 {step.deliverable}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(investigationPlan.hypothesis_list?.length ?? 0) > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Гипотезы</div>
                      {investigationPlan.hypothesis_list!.map((h, i) => (
                        <div key={i} style={{ padding: '10px 14px', marginBottom: 8, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{h.hypothesis}</span>
                            <span style={{ fontSize: 11, color: h.probability === 'High' ? 'var(--critical)' : h.probability === 'Medium' ? 'var(--major)' : 'var(--minor)', fontWeight: 700 }}>{h.probability}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нужно: {h.evidence_needed}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ai-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span>◈</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI-ассистент</span>
              </div>
              <button onClick={() => aiAction('generate_investigation')} className="btn-ai" style={{ width: '100%', justifyContent: 'center' }} disabled={aiLoading === 'generate_investigation'}>
                {aiLoading === 'generate_investigation' ? <LoadingSpinner size={16} /> : '◈'}
                {aiLoading === 'generate_investigation' ? 'Генерация...' : 'Сгенерировать план расследования'}
              </button>
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                AI сгенерирует детальный план расследования с шагами, ответственными, сроками и гипотезами корневых причин на основе GMP-методологии.
              </div>
            </div>
          </div>
        )}

        {/* TAB: CAPA */}
        {tab === 'capa' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {capaTasks.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>CAPA-план не сформирован</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Используйте AI для генерации CAPA на основе анализа корневых причин</div>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Всего задач', value: capaTasks.length, color: 'var(--accent)' },
                      { label: 'Выполнено', value: capaTasks.filter(t => t.status === 'Completed').length, color: 'var(--success)' },
                      { label: 'В работе', value: capaTasks.filter(t => t.status === 'In Progress').length, color: 'var(--warning)' },
                      { label: 'Открыто', value: capaTasks.filter(t => t.status === 'Open').length, color: 'var(--text-secondary)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'IBM Plex Mono' }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {capaTasks.map((task, i) => (
                    <div key={task.id} className="card" style={{ padding: 20, borderLeft: `3px solid ${task.type === 'Corrective' ? 'var(--major)' : 'var(--minor)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', background: task.type === 'Corrective' ? 'var(--major-bg)' : 'var(--minor-bg)', color: task.type === 'Corrective' ? 'var(--major)' : 'var(--minor)', border: `1px solid ${task.type === 'Corrective' ? 'var(--major-border)' : 'var(--minor-border)'}`, borderRadius: 20, fontWeight: 700, fontFamily: 'IBM Plex Mono' }}>
                              {task.type === 'Corrective' ? 'Корректирующее' : 'Предупреждающее'}
                            </span>
                            <CAPAStatusBadge status={task.status} />
                            {task.priority && (
                              <span style={{ fontSize: 11, color: task.priority === 'High' ? 'var(--critical)' : task.priority === 'Medium' ? 'var(--major)' : 'var(--text-muted)', fontWeight: 700 }}>
                                {task.priority === 'High' ? '▲' : task.priority === 'Medium' ? '◆' : '◇'} {task.priority}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{task.title}</div>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.description}</p>
                      )}
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Ответственный</div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.assigned_to}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Срок</div>
                          <div style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', color: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' ? 'var(--critical)' : 'var(--text-primary)' }}>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '—'}
                          </div>
                        </div>
                      </div>
                      
                      {task.effectiveness_metric && (
                        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                          <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Метрика эффективности</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.effectiveness_metric}</div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {task.status !== 'In Progress' && task.status !== 'Completed' && (
                          <button onClick={() => updateCapaStatus(task.id, 'In Progress')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'var(--warning-bg)', color: 'var(--warning)', cursor: 'pointer', fontFamily: 'Manrope' }}>
                            → В работу
                          </button>
                        )}
                        {task.status !== 'Completed' && (
                          <button onClick={() => updateCapaStatus(task.id, 'Completed')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)', background: 'var(--success-bg)', color: 'var(--success)', cursor: 'pointer', fontFamily: 'Manrope' }}>
                            ✓ Выполнено
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Кнопка добавить вручную */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddCapa(!showAddCapa)} className="btn-secondary" style={{ fontSize: 13 }}>
                  + Добавить задачу вручную
                </button>
              </div>

              {/* Форма ручного добавления */}
              {showAddCapa && (
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Новая CAPA задача</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="label">Название *</label>
                      <input className="input" placeholder="Название корректирующего действия" value={newCapaTask.title} onChange={e => setNewCapaTask(p => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Описание</label>
                      <textarea className="input" rows={2} placeholder="Детальное описание действия" value={newCapaTask.description} onChange={e => setNewCapaTask(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="label">Тип</label>
                        <select className="input" value={newCapaTask.type} onChange={e => setNewCapaTask(p => ({ ...p, type: e.target.value }))}>
                          <option value="Corrective">Корректирующее</option>
                          <option value="Preventive">Предупреждающее</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Ответственный</label>
                        <input className="input" placeholder="ФИО / должность" value={newCapaTask.assigned_to} onChange={e => setNewCapaTask(p => ({ ...p, assigned_to: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="label">Срок</label>
                        <input type="date" className="input" value={newCapaTask.due_date} onChange={e => setNewCapaTask(p => ({ ...p, due_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Метрика эффективности</label>
                        <input className="input" placeholder="Как измерим успех" value={newCapaTask.effectiveness_metric} onChange={e => setNewCapaTask(p => ({ ...p, effectiveness_metric: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowAddCapa(false)} className="btn-secondary" style={{ fontSize: 13 }}>Отмена</button>
                      <button onClick={addManualCapa} className="btn-primary" style={{ fontSize: 13 }}>Добавить задачу</button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Generated CAPA preview */}
              {capaData && capaData.capa_tasks && (
                <div className="ai-panel" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>◈</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI-предложение CAPA ({capaData.capa_tasks.length} задач)</span>
                      <AIBadge />
                    </div>
                    <button onClick={applyCapa} className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>
                      Применить CAPA
                    </button>
                  </div>
                  {capaData.capa_tasks.slice(0, 3).map((task, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: task.type === 'Corrective' ? 'var(--major)' : 'var(--minor)', fontWeight: 700, fontFamily: 'IBM Plex Mono' }}>
                          {task.type === 'Corrective' ? 'C' : 'P'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</span>
                      </div>
                      {task.effectiveness_metric && (
                        <div style={{ fontSize: 11, color: 'var(--success)' }}>✓ {task.effectiveness_metric}</div>
                      )}
                    </div>
                  ))}
                  {capaData.capa_tasks.length > 3 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>и ещё {capaData.capa_tasks.length - 3} задач...</div>
                  )}
                  {capaData.recurrence_prevention && (
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--success-bg)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>ПРЕДОТВРАЩЕНИЕ ПОВТОРЕНИЯ</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{capaData.recurrence_prevention}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ai-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span>◈</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI-генерация CAPA</span>
              </div>
              <button onClick={() => aiAction('generate_capa')} className="btn-ai" style={{ width: '100%', justifyContent: 'center' }} disabled={aiLoading === 'generate_capa'}>
                {aiLoading === 'generate_capa' ? <LoadingSpinner size={16} /> : '◈'}
                {aiLoading === 'generate_capa' ? 'Генерация CAPA...' : 'Сгенерировать CAPA-план'}
              </button>
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                AI разработает корректирующие и предупреждающие действия с измеримыми метриками эффективности, сроками и ответственными на основе корневых причин.
              </div>
            </div>
          </div>
        )}

        {/* TAB: History */}
        {tab === 'history' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              История изменений
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: dev.created_at, action: 'Отклонение зарегистрировано', author: dev.detected_by, color: 'var(--accent)' },
                ...(dev.status !== 'Draft' ? [{ date: dev.updated_at, action: `Статус изменён: ${STATUS_LABELS[dev.status] || dev.status}`, author: dev.assigned_to, color: 'var(--success)' }] : []),
                ...comments.map(c => ({ date: c.date, action: `Комментарий: "${c.text.substring(0, 50)}..."`, author: c.author, color: 'var(--text-secondary)' })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((event, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: event.color, flexShrink: 0, marginTop: 4 }} />
                      {i < 10 && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />}
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>{event.action}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {event.author} · {new Date(event.date).toLocaleDateString('ru-RU')} {new Date(event.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
