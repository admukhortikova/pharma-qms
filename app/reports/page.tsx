'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface ReportData {
  stats: { total: number; bySeverity: { Critical: number; Major: number; Minor: number }; byStatus: Record<string,number>; byType: Record<string,number>; byLocation: Record<string,number> };
  monthly_trends: Array<{ month: string; total: number; critical: number; major: number; minor: number }>;
  overdue_capa: Array<{ deviation: string; task: string; due_date: string; assigned_to: string }>;
  equipment_frequency: Array<{ equipment: string; count: number }>;
}

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Загрузка отчётов...</div>
      </main>
    </div>
  );

  const maxMonthly = Math.max(...data.monthly_trends.map(m => m.total), 1);
  const maxEquip = Math.max(...data.equipment_frequency.map(e => e.count), 1);
  const maxType = Math.max(...Object.values(data.stats.byType), 1);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px' }}>
        
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Аналитика QA</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 14 }}>Отчёты и тренды по отклонениям · GMP Compliance Dashboard</p>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Всего отклонений', value: data.stats.total, color: 'var(--accent)' },
            { label: 'Critical открытых', value: data.stats.bySeverity.Critical, color: 'var(--critical)' },
            { label: 'Просроченных CAPA', value: data.overdue_capa.length, color: data.overdue_capa.length > 0 ? 'var(--critical)' : 'var(--success)' },
            { label: 'Закрытых кейсов', value: data.stats.byStatus['Closed'] || 0, color: 'var(--success)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'IBM Plex Mono', marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          
          {/* Monthly trend chart */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Тренд по месяцам
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
              {data.monthly_trends.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{ width: '100%', height: Math.max(4, (m.critical / maxMonthly) * 120), background: 'var(--critical)', borderRadius: '2px 2px 0 0' }} title={`Critical: ${m.critical}`} />
                    <div style={{ width: '100%', height: Math.max(4, (m.major / maxMonthly) * 120), background: 'var(--major)' }} title={`Major: ${m.major}`} />
                    <div style={{ width: '100%', height: Math.max(4, (m.minor / maxMonthly) * 120), background: 'var(--minor)', borderRadius: '0 0 2px 2px' }} title={`Minor: ${m.minor}`} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'IBM Plex Mono', textAlign: 'center' }}>
                    {m.month.replace('2025-', '').replace('2026-', '')}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[['var(--critical)', 'Critical'], ['var(--major)', 'Major'], ['var(--minor)', 'Minor']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By type */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              По типу отклонения
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(data.stats.byType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type}</span>
                    <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: 'var(--accent)', fontWeight: 700 }}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(count / maxType) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          
          {/* Overdue CAPA */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: data.overdue_capa.length > 0 ? 'var(--critical)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {data.overdue_capa.length > 0 ? `⚠ Просроченные CAPA (${data.overdue_capa.length})` : '✓ Просроченных CAPA нет'}
            </h3>
            {data.overdue_capa.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--success)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Все CAPA выполнены в срок</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.overdue_capa.map((item, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--critical-bg)', border: '1px solid var(--critical-border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{item.deviation}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--critical)' }}>{new Date(item.due_date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{item.task}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {item.assigned_to}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Equipment frequency */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Оборудование с отклонениями
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.equipment_frequency.slice(0, 8).map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.equipment}</span>
                    <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: item.count >= 2 ? 'var(--major)' : 'var(--text-muted)', fontWeight: 700 }}>{item.count}x</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(item.count / maxEquip) * 100}%`, background: item.count >= 2 ? 'var(--major)' : 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By location */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Отклонения по зонам производства
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {Object.entries(data.stats.byLocation).sort(([, a], [, b]) => b - a).map(([location, count]) => (
              <div key={location} style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</span>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'IBM Plex Mono', color: count >= 2 ? 'var(--major)' : 'var(--accent)', marginLeft: 8 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
