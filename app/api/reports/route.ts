import { NextResponse } from 'next/server';
import { getStats, getAllDeviations } from '@/lib/db';

export async function GET() {
  try {
    const stats = getStats();
    const deviations = getAllDeviations();
    
    // Тренды по месяцам
    const monthlyTrends: Record<string, { total: number; critical: number; major: number; minor: number }> = {};
    deviations.forEach(d => {
      const month = d.created_at.substring(0, 7); // YYYY-MM
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = { total: 0, critical: 0, major: 0, minor: 0 };
      }
      monthlyTrends[month].total++;
      if (d.severity === 'Critical') monthlyTrends[month].critical++;
      if (d.severity === 'Major') monthlyTrends[month].major++;
      if (d.severity === 'Minor') monthlyTrends[month].minor++;
    });

    // Просроченные CAPA
    const overdueCapa: Array<{deviation: string; task: string; due_date: string; assigned_to: string}> = [];
    deviations.forEach(d => {
      try {
        const capaTasks = JSON.parse(d.capa_plan || '[]');
        capaTasks.forEach((task: Record<string, string>) => {
          if (task.due_date && task.status !== 'Completed') {
            if (new Date(task.due_date) < new Date()) {
              overdueCapa.push({
                deviation: d.deviation_number,
                task: task.title,
                due_date: task.due_date,
                assigned_to: task.assigned_to
              });
            }
          }
        });
      } catch {}
    });

    // Топ оборудование с отклонениями
    const equipmentFrequency: Record<string, number> = {};
    deviations.forEach(d => {
      if (d.related_equipment) {
        d.related_equipment.split(',').forEach(eq => {
          const name = eq.trim();
          equipmentFrequency[name] = (equipmentFrequency[name] || 0) + 1;
        });
      }
    });

    return NextResponse.json({
      stats,
      monthly_trends: Object.entries(monthlyTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
      overdue_capa: overdueCapa,
      equipment_frequency: Object.entries(equipmentFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([equipment, count]) => ({ equipment, count })),
      recent_critical: deviations
        .filter(d => d.severity === 'Critical')
        .slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
