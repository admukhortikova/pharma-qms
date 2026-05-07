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
  severity: string;
  status: string;
  created_at: string;
  due_date: string;
  assigned_to: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<{ total: number; bySeverity: { Critical: number; Major: number; Minor: number }; byStatus: Record<string,number>; overdue: number } | null>(null);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then(r => r.json()),
      fetch('/api/deviations').then(r => r.json()),
    ]).then(([reportData, devData]) => {
      setStats(reportData.stats);
      setDeviations(devData.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isOverdue = (due: string, status: string) => {
    if (!due || status === 'Closed') return false;
    return new Date(due) < new Date();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px', maxWidth: 'calc(100vw - 220px)' }}>

        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: -0.5 }}>
              Дашборд QA
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 14 }}>
              Система управления отклонениями · GMP Compliant · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link href="/deviations/new" className="btn-primary">
            + Зарегистрировать отклонение
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
          {loading ? Array(5).fill(0).map((_, i) => (
            <div key={i} className="card shimmer" style={{ height: 100 }} />
          )) : stats ? [
            { label: 'Всего отклонений', value: stats.total, color: 'var(--accent)', icon: '⬡' },
            { label: 'Critical', value: stats.bySeverity.Critical, color: 'var(--critical)', icon: '▲', pulse: stats.bySeverity.Critical > 0 },
            { label: 'Major', value: stats.bySeverity.Major, color: 'var(--major)', icon: '◆' },
            { label: 'Minor', value: stats.bySeverity.Minor, color: 'var(--minor)', icon: '◇' },
            { label: 'Просрочено', value: stats.overdue, color: stats.overdue > 0 ? 'var(--critical)' : 'var(--success)', icon: '⏱', pulse: stats.overdue > 0 },
          ].map(({ label, value, color, icon, pulse }) => (
            <div className="card" style={{ padding: 20 }} key={label}>
              <div style={{ fontSize: 20, color, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'IBM Plex Mono' }} className={pulse ? 'pulse-critical' : ''}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{label}</div>
            </div>
          )) : null}
        </div>

        {/* Status and Severity */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Статусы расследований
              </h3>
              {[
                { label: 'Черновик', key: 'Draft', color: '#7c85a8' },
                { label: 'На проверке', key: 'Under Review', color: 'var(--warning)' },
                { label: 'Согласовано', key: 'Approved', color: '#818cf8' },
                { label: 'Закрыто', key: 'Closed', color: 'var(--success)' },
              ].map(({ label, key, color }) => {
                const count = (stats.byStatus[key] || 0);
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>{count}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Критичность
              </h3>
              {[
                { label: 'Critical', count: stats.bySeverity.Critical, color: 'var(--critical)', bg: 'var(--critical-bg)', border: 'var(--critical-border)' },
                { label: 'Major', count: stats.bySeverity.Major, color: 'var(--major)', bg: 'var(--major-bg)', border: 'var(--major-border)' },
                { label: 'Minor', count: stats.bySeverity.Minor, color: 'var(--minor)', bg: 'var(--minor-bg)', border: 'var(--minor-border)' },
              ].map(({ label, count, color, bg, border }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: bg, borderRadius: 8, border: `1px solid ${border}`, marginBottom: 10 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'IBM Plex Mono', minWidth: 40 }}>{count}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}% от общего</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Последние отклонения
            </h3>
            <Link href="/deviations" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Все отклонения →
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Номер', 'Название', 'Тип', 'Критичность', 'Статус', 'Срок', 'Ответственный'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</td></tr>
              ) : deviations.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onClick={() => window.location.href = `/deviations/${d.id}`}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{d.deviation_number}</span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.location}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.type}</span></td>
                  <td style={{ padding: '12px 16px' }}><SeverityBadge severity={d.severity} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={d.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    {d.due_date ? (
                      <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: isOverdue(d.due_date, d.status) ? 'var(--critical)' : 'var(--text-secondary)', fontWeight: isOverdue(d.due_date, d.status) ? 700 : 400 }}>
                        {isOverdue(d.due_date, d.status) ? '⚠ ' : ''}{new Date(d.due_date).toLocaleDateString('ru-RU')}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.assigned_to || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ai-panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--ai-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>◈</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>AI-ассистент готов к работе</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              При регистрации нового отклонения AI классифицирует критичность по GMP, предложит план расследования и сгенерирует CAPA с измеримыми метриками эффективности.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
