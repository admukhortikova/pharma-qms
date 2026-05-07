'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '⬡', label: 'Дашборд' },
  { href: '/deviations', icon: '⚠', label: 'Отклонения' },
  { href: '/deviations/new', icon: '+', label: 'Новое отклонение' },
  { href: '/reports', icon: '▦', label: 'Отчёты QA' },
];

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 28px', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--ai-gradient)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'white',
          }}>Q</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3 }}>PharmaQMS</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', letterSpacing: 0.5 }}>GMP DEVIATION MGMT</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, padding: '0 12px', marginBottom: 8, textTransform: 'uppercase' }}>
          Навигация
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href) && !(item.href === '/deviations' && pathname === '/deviations/new');
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                <span style={{ 
                  width: 20, height: 20, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: item.icon === '+' ? 18 : 14,
                  fontWeight: 700,
                }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* GMP indicator */}
      <div style={{ 
        padding: '12px', 
        background: 'rgba(16, 185, 129, 0.05)',
        border: '1px solid rgba(16, 185, 129, 0.15)',
        borderRadius: 8,
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', fontFamily: 'IBM Plex Mono' }}>GMP COMPLIANT</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>EU GMP Annex 1, ICH Q10</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>21 CFR Part 211</div>
      </div>
    </aside>
  );
}
