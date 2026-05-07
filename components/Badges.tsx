'use client';

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === 'Critical' ? 'badge-critical' 
    : severity === 'Major' ? 'badge-major' 
    : severity === 'Minor' ? 'badge-minor' 
    : 'badge-draft';
  return <span className={cls}>{severity || '—'}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Draft' ? 'badge-draft'
    : status === 'Under Review' ? 'badge-review'
    : status === 'Approved' ? 'badge-approved'
    : status === 'Closed' ? 'badge-closed'
    : 'badge-draft';
  const labels: Record<string, string> = {
    'Draft': 'Черновик',
    'Under Review': 'На проверке',
    'Approved': 'Согласовано',
    'Closed': 'Закрыто',
    'Rejected': 'Отклонено',
  };
  return <span className={cls}>{labels[status] || status}</span>;
}

export function CAPAStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    'Open': { bg: 'rgba(74,82,112,0.2)', color: '#7c85a8', border: 'rgba(74,82,112,0.4)' },
    'In Progress': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'Completed': { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'Overdue': { bg: 'rgba(255,61,90,0.1)', color: '#ff3d5a', border: 'rgba(255,61,90,0.3)' },
  };
  const style = colors[status] || colors['Open'];
  const labels: Record<string, string> = {
    'Open': 'Открыто',
    'In Progress': 'В работе',
    'Completed': 'Выполнено',
    'Overdue': 'Просрочено',
  };
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'IBM Plex Mono, monospace',
      display: 'inline-block',
    }}>
      {labels[status] || status}
    </span>
  );
}

export function AIBadge() {
  return (
    <span style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
      border: '1px solid rgba(99,102,241,0.3)',
      color: '#a5b4fc',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'IBM Plex Mono, monospace',
      letterSpacing: 0.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}>
      ◈ AI
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ff3d5a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color, minWidth: 35 }}>{pct}%</span>
    </div>
  );
}

export function RiskIndicator({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const config = {
    High: { color: '#ff3d5a', label: 'Высокий', dots: 3 },
    Medium: { color: '#f59e0b', label: 'Средний', dots: 2 },
    Low: { color: '#10b981', label: 'Низкий', dots: 1 },
  };
  const { color, label, dots } = config[level] || config.Medium;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i <= dots ? color : 'var(--border)',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
