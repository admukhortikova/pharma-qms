'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { SeverityBadge, StatusBadge } from '@/components/Badges';

interface Deviation {
  id: string;
  deviation_number: string;
  title: string;
  type: string;
  location: string;
  batch_number: string;
  severity: string;
  status: string;
  created_at: string;
  due_date: string;
  assigned_to: string;
  detected_date: string;
}

const SEVERITY_ORDER = { Critical: 0, Major: 1, Minor: 2, '': 3 };
const TYPES = ['Все типы', 'OOS (Out of Specification)', 'Отклонение в процессе', 'Отклонение окружающей среды', 'Сбой оборудования/ПО', 'Контаминация продукта'];
const SEVERITIES = ['Все', 'Critical', 'Major', 'Minor'];
const STATUSES = ['Все', 'Draft', 'Under Review', 'Approved', 'Closed'];

export default function DeviationsList() {
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [filtered, setFiltered] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('Все');
  const [filterStatus, setFilterStatus] = useState('Все');
  const [filterType, setFilterType] = useState('Все типы');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'status'>('date');

  useEffect(() => {
    fetch('/api/deviations')
      .then(r => r.json())
      .then(data => {
        setDeviations(data);
        setFiltered(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = [...deviations];
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.deviation_number.toLowerCase().includes(q) ||
        d.batch_number.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q)
      );
    }
    if (filterSeverity !== 'Все') result = result.filter(d => d.severity === filterSeverity);
    if (filterStatus !== 'Все') result = result.filter(d => d.status === filterStatus);
    if (filterType !== 'Все типы') result = result.filter(d => d.type === filterType);

    if (sortBy === 'date') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'severity') result.sort((a, b) => (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] || 3) - (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] || 3));
    if (sortBy === 'status') result.sort((a, b) => a.status.localeCompare(b.status));

    setFiltered(result);
  }, [deviations, search, filterSeverity, filterStatus, filterType, sortBy]);

  const isOverdue = (due: string, status: string) => {
    if (!due || status === 'Closed') return false;
    return new Date(due) < new Date();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px' }}>
        
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Реестр отклонений</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 14 }}>
              Всего: {filtered.length} из {deviations.length}
            </p>
          </div>
          <Link href="/deviations/new" className="btn-primary">+ Новое отклонение</Link>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Поиск по названию, номеру, серии..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          
          <select className="input" style={{ width: 'auto', minWidth: 120 }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select className="input" style={{ width: 'auto', minWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s === 'Draft' ? 'Черновик' : s === 'Under Review' ? 'На проверке' : s === 'Approved' ? 'Согласовано' : s === 'Closed' ? 'Закрыто' : s}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', minWidth: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', minWidth: 140 }} value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'severity' | 'status')}>
            <option value="date">По дате (новые)</option>
            <option value="severity">По критичности</option>
            <option value="status">По статусу</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                {['Номер', 'Название / Место', 'Тип', 'Серия', 'Критичность', 'Статус', 'Дата', 'Срок', 'Ответственный'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div className="shimmer" style={{ height: 14, borderRadius: 4, width: j === 1 ? '80%' : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⚪</div>
                    <div style={{ fontSize: 14 }}>Отклонений не найдено</div>
                  </td>
                </tr>
              ) : filtered.map(d => (
                <tr key={d.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', borderLeft: d.severity === 'Critical' ? '3px solid var(--critical)' : d.severity === 'Major' ? '3px solid var(--major)' : '3px solid transparent' }}
                  onClick={() => window.location.href = `/deviations/${d.id}`}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{d.deviation_number}</span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 240 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.location}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.batch_number || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}><SeverityBadge severity={d.severity} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={d.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString('ru-RU')}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {d.due_date ? (
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: isOverdue(d.due_date, d.status) ? 'var(--critical)' : 'var(--text-secondary)', fontWeight: isOverdue(d.due_date, d.status) ? 700 : 400 }}>
                        {isOverdue(d.due_date, d.status) ? '⚠ ' : ''}{new Date(d.due_date).toLocaleDateString('ru-RU')}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.assigned_to || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
