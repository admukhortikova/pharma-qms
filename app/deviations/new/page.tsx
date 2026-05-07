'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { LoadingSpinner, ConfidenceBar } from '@/components/Badges';

const TYPES = ['OOS (Out of Specification)', 'Отклонение в процессе', 'Отклонение окружающей среды', 'Сбой оборудования/ПО', 'Контаминация продукта', 'Ошибка документации', 'Отклонение поставщика', 'Другое'];
const LOCATIONS = ['Лаборатория контроля качества', 'Таблеточный цех', 'Чистая зона Класс А', 'Чистая зона Класс B/C', 'Цех жидких форм', 'Цех инъекций', 'Склад АФС', 'Склад готовой продукции', 'Упаковочный цех', 'Другое'];

interface AIClassification {
  severity: string;
  confidence: number;
  gmp_category: string;
  risk_factors: string[];
  regulatory_refs: string[];
  justification: string;
  recommended_actions: string[];
  impact_assessment: { patient_safety: string; product_quality: string; regulatory_compliance: string };
}

export default function NewDeviation() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    location: '',
    batch_number: '',
    product_name: '',
    detected_by: '',
    detected_date: new Date().toISOString().split('T')[0],
    immediate_actions: '',
    related_equipment: '',
    related_supplier: '',
    related_sop: '',
    assigned_to: '',
    due_date: '',
  });
  const [aiResult, setAiResult] = useState<AIClassification | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completeness, setCompleteness] = useState<{ score: number; missing_fields: string[]; ready_for_approval: boolean; message: string } | null>(null);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const runAI = async () => {
    if (!form.title || !form.description) {
      alert('Заполните название и описание отклонения');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'classify', deviation: form }),
      });
      const data = await res.json();
      setAiResult(data.classification);
    } catch (e) {
      alert('Ошибка AI-классификации');
    } finally {
      setAiLoading(false);
    }
  };

  const checkCompleteness = async () => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_completeness', deviation: { ...form, severity: aiResult?.severity || '' } }),
    });
    const data = await res.json();
    setCompleteness(data.completeness);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/deviations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          severity: aiResult?.severity || '',
          severity_justification: aiResult?.justification || '',
          ai_classification: JSON.stringify(aiResult || {}),
        }),
      });
      const data = await res.json();
      router.push(`/deviations/${data.id}`);
    } catch (e) {
      alert('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const RiskIcon = ({ level }: { level: string }) => {
    const colors = { High: 'var(--critical)', Medium: 'var(--major)', Low: 'var(--minor)' };
    const labels = { High: 'Высокий', Medium: 'Средний', Low: 'Низкий' };
    const color = colors[level as keyof typeof colors] || 'var(--text-muted)';
    return <span style={{ color, fontWeight: 700, fontSize: 12 }}>{labels[level as keyof typeof labels] || level}</span>;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px', maxWidth: 'calc(100vw - 220px)' }}>
        
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
              ← Назад
            </button>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Регистрация отклонения</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 14 }}>Заполните обязательные поля и используйте AI для классификации критичности</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          
          {/* Main Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Basic Info */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Основная информация
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Название отклонения *</label>
                  <input className="input" placeholder="Краткое описание инцидента..." value={form.title} onChange={e => set('title', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Тип отклонения *</label>
                    <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                      <option value="">Выберите тип...</option>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Место отклонения *</label>
                    <select className="input" value={form.location} onChange={e => set('location', e.target.value)}>
                      <option value="">Выберите место...</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Серия / Лот *</label>
                    <input className="input" placeholder="AB2025-001" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Наименование продукта</label>
                    <input className="input" placeholder="Продукт, дозировка, форма" value={form.product_name} onChange={e => set('product_name', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Обнаружил *</label>
                    <input className="input" placeholder="ФИО / должность" value={form.detected_by} onChange={e => set('detected_by', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Дата обнаружения *</label>
                    <input type="date" className="input" value={form.detected_date} onChange={e => set('detected_date', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Описание и немедленные действия
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Детальное описание отклонения * (для AI-анализа)</label>
                  <textarea className="input" rows={5} placeholder="Подробно опишите что произошло, когда, при каких обстоятельствах, какие параметры отклонились и на сколько..." value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label className="label">Немедленные действия *</label>
                  <textarea className="input" rows={3} placeholder="Что было сделано сразу после обнаружения: карантин серии, остановка производства, уведомления..." value={form.immediate_actions} onChange={e => set('immediate_actions', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Related */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Связанные объекты
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Оборудование</label>
                  <input className="input" placeholder="Таблетпресс Fette 2090, Анализатор растворения..." value={form.related_equipment} onChange={e => set('related_equipment', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Поставщик</label>
                    <input className="input" placeholder="Наименование поставщика" value={form.related_supplier} onChange={e => set('related_supplier', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">SOP</label>
                    <input className="input" placeholder="SOP-PRD-042, SOP-QC-011" value={form.related_sop} onChange={e => set('related_sop', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Маршрут согласования
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Ответственный за расследование</label>
                  <input className="input" placeholder="ФИО ответственного" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} />
                </div>
                <div>
                  <label className="label">Срок закрытия</label>
                  <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={checkCompleteness} className="btn-secondary">
                ◎ Проверить полноту
              </button>
              <button onClick={save} className="btn-primary" disabled={saving}>
                {saving ? <LoadingSpinner size={16} /> : null}
                {saving ? 'Сохранение...' : 'Зарегистрировать отклонение'}
              </button>
            </div>

            {/* Completeness result */}
            {completeness && (
              <div style={{ 
                padding: 20, borderRadius: 12,
                background: completeness.ready_for_approval ? 'var(--success-bg)' : 'var(--warning-bg)',
                border: `1px solid ${completeness.ready_for_approval ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: completeness.ready_for_approval ? 'var(--success)' : 'var(--warning)', fontFamily: 'IBM Plex Mono' }}>
                    {completeness.score}%
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Полнота заполнения</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{completeness.message}</div>
                  </div>
                </div>
                {completeness.missing_fields.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 6 }}>Не заполнено:</div>
                    {completeness.missing_fields.map(f => (
                      <div key={f} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: 'var(--warning)' }}>○</span> {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Panel */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div className="ai-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ai-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◈</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI-классификация</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>GMP Risk Assessment</div>
                </div>
              </div>

              <button onClick={runAI} className="btn-ai" style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }} disabled={aiLoading}>
                {aiLoading ? <LoadingSpinner size={16} /> : '◈'}
                {aiLoading ? 'Анализ...' : 'Запустить AI-анализ'}
              </button>

              {!aiResult && !aiLoading && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                  Заполните описание отклонения и нажмите кнопку для AI-классификации критичности по GMP
                </div>
              )}

              {aiResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
                  
                  {/* Severity */}
                  <div style={{ textAlign: 'center', padding: '16px', background: aiResult.severity === 'Critical' ? 'var(--critical-bg)' : aiResult.severity === 'Major' ? 'var(--major-bg)' : 'var(--minor-bg)', borderRadius: 10, border: `1px solid ${aiResult.severity === 'Critical' ? 'var(--critical-border)' : aiResult.severity === 'Major' ? 'var(--major-border)' : 'var(--minor-border)'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Критичность</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: aiResult.severity === 'Critical' ? 'var(--critical)' : aiResult.severity === 'Major' ? 'var(--major)' : 'var(--minor)', fontFamily: 'IBM Plex Mono' }}>
                      {aiResult.severity}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Уверенность AI</div>
                      <ConfidenceBar value={aiResult.confidence || 0.85} />
                    </div>
                  </div>

                  {/* GMP Category */}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>GMP-категория</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{aiResult.gmp_category}</div>
                  </div>

                  {/* Justification */}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Обоснование</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiResult.justification}</div>
                  </div>

                  {/* Risk factors */}
                  {aiResult.risk_factors?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Факторы риска</div>
                      {aiResult.risk_factors.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--critical)', fontSize: 10, marginTop: 3 }}>▲</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Impact */}
                  {aiResult.impact_assessment && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Оценка влияния</div>
                      {[
                        { label: 'Безопасность пациента', key: 'patient_safety' },
                        { label: 'Качество продукта', key: 'product_quality' },
                        { label: 'Регуляторный', key: 'regulatory_compliance' },
                      ].map(({ label, key }) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                          <RiskIcon level={aiResult.impact_assessment[key as keyof typeof aiResult.impact_assessment]} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Regulatory refs */}
                  {aiResult.regulatory_refs?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Регуляторные ссылки</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {aiResult.regulatory_refs.map((ref, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, color: '#a5b4fc', fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>{ref}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended actions */}
                  {aiResult.recommended_actions?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Рекомендуемые действия</div>
                      {aiResult.recommended_actions.map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--accent)', fontSize: 10, marginTop: 3 }}>→</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RiskIcon({ level }: { level: string }) {
  const colors: Record<string, string> = { High: 'var(--critical)', Medium: 'var(--major)', Low: 'var(--minor)' };
  const labels: Record<string, string> = { High: 'Высокий', Medium: 'Средний', Low: 'Низкий' };
  return <span style={{ color: colors[level] || 'var(--text-muted)', fontWeight: 700, fontSize: 12 }}>{labels[level] || level}</span>;
}
