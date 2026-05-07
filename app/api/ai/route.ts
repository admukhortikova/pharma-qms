import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODEL = 'anthropic/claude-sonnet-4-5';
const MAX_TOKENS = 1200;

async function callLLM(prompt: string, maxTokens = 1500): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://pharma-qms.app',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: 'Ты отвечаешь ТОЛЬКО валидным JSON. Никакого текста до или после JSON. Никаких markdown блоков. Только чистый JSON.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  console.log('LLM raw response:', text.slice(0, 200));
  return text;
}

function parseJSON(text: string) {
  // Убираем markdown блоки
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // Ищем JSON объект если есть лишний текст
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  return JSON.parse(clean);
}

export async function POST(request: NextRequest) {
  try {
    const { action, deviation } = await request.json();

    if (action === 'classify') return await classifyDeviation(deviation);
    if (action === 'generate_capa') return await generateCAPA(deviation);
    if (action === 'generate_investigation') return await generateInvestigationPlan(deviation);
    if (action === 'check_completeness') return await checkCompleteness(deviation);

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'AI service error' }, { status: 500 });
  }
}

async function classifyDeviation(deviation: Record<string, string>) {
  const prompt = `Ты — эксперт по GMP (Good Manufacturing Practice) и управлению качеством в фармацевтическом производстве.

Проанализируй следующее отклонение и выполни GMP-ориентированную классификацию риска:

ОТКЛОНЕНИЕ:
Тип: ${deviation.type}
Место: ${deviation.location}
Серия: ${deviation.batch_number}
Продукт: ${deviation.product_name}
Описание: ${deviation.description}
Немедленные действия: ${deviation.immediate_actions}

Верни ТОЛЬКО JSON без markdown-блоков в следующем формате:
{
  "severity": "Minor|Major|Critical",
  "confidence": 0.85,
  "gmp_category": "Категория согласно GMP",
  "risk_factors": ["фактор1", "фактор2"],
  "regulatory_refs": ["ICH Q10", "EU GMP Annex 1"],
  "justification": "Детальное обоснование классификации на русском языке",
  "recommended_actions": ["действие1", "действие2"],
  "impact_assessment": {
    "patient_safety": "High|Medium|Low",
    "product_quality": "High|Medium|Low",
    "regulatory_compliance": "High|Medium|Low"
  }
}

ВАЖНО: отвечай максимально кратко, каждое поле не длиннее 10 слов.
Критерии классификации:
- Critical: прямой риск для пациента, системная проблема, возможный отзыв продукции
- Major: значительное отклонение от GMP, потенциальный риск качества, требует расследования
- Minor: незначительное отклонение, нет прямого риска, требует корректирующих действий`;

  try {
    const text = await callLLM(prompt, 1000);
    const classification = parseJSON(text);
    return NextResponse.json({ classification });
  } catch {
    return NextResponse.json({ classification: { severity: 'Major' } });
  }
}

async function generateCAPA(deviation: Record<string, string>) {
  const rootCauses = typeof deviation.root_causes === 'string'
    ? deviation.root_causes
    : JSON.stringify(deviation.root_causes);

  const prompt = `Ты — эксперт CAPA (Corrective and Preventive Actions) в GMP-регулируемой фармацевтической компании.

На основе отклонения и анализа корневых причин разработай детальный CAPA-план:

ОТКЛОНЕНИЕ:
Тип: ${deviation.type}
Критичность: ${deviation.severity}
Описание: ${deviation.description}
Корневые причины: ${rootCauses}

Верни ТОЛЬКО JSON без markdown-блоков:
{
  "capa_tasks": [
    {
      "id": "capa-new-1",
      "title": "Название задачи",
      "description": "Детальное описание действия",
      "type": "Corrective|Preventive",
      "assigned_to": "Роль/должность",
      "due_days": 14,
      "status": "Open",
      "effectiveness_metric": "Критерий эффективности — как измерим успех",
      "effectiveness_check_date_days": 90,
      "priority": "High|Medium|Low"
    }
  ],
  "effectiveness_review": "Описание процедуры проверки эффективности CAPA через 3 и 6 месяцев",
  "recurrence_prevention": "Конкретные меры предотвращения повторения",
  "estimated_completion_days": 30
}

ВАЖНО: МАКСИМУМ 5 задач суммарно. Описания не длиннее 1 предложения. Только самые важные действия.`;

  try {
    const text = await callLLM(prompt, 1500);
    const capa = parseJSON(text);
    return NextResponse.json({ capa });
  } catch {
    return NextResponse.json({ capa: { capa_tasks: [] } });
  }
}

async function generateInvestigationPlan(deviation: Record<string, string>) {
  const prompt = `Ты — QA специалист в GMP-фармацевтическом производстве.

Разработай КРАТКИЙ план расследования. МАКСИМУМ 5 шагов, МАКСИМУМ 3 гипотезы, МАКСИМУМ 5 пунктов в каждом списке. Описания не длиннее 1 предложения.

ОТКЛОНЕНИЕ:
Тип: ${deviation.type}
Критичность: ${deviation.severity}
Место: ${deviation.location}
Серия: ${deviation.batch_number}
Описание: ${deviation.description}

Верни ТОЛЬКО JSON (без markdown, без текста вокруг):
{"investigation_steps":[{"step":1,"title":"...","description":"...","responsible":"...","duration_days":3,"deliverable":"..."}],"data_to_collect":["..."],"people_to_interview":["..."],"documents_to_review":["..."],"hypothesis_list":[{"hypothesis":"...","probability":"High|Medium|Low","evidence_needed":"..."}],"total_duration_days":30,"regulatory_requirements":"..."}`;

  try {
    const text = await callLLM(prompt, 1500);
    console.log('INVESTIGATION RAW:', text);
    const investigation_plan = parseJSON(text);
    console.log('INVESTIGATION PARSED:', JSON.stringify(investigation_plan).slice(0, 300));
    return NextResponse.json({ investigation_plan });
  } catch (e) {
    console.log('INVESTIGATION PARSE ERROR:', e);
    return NextResponse.json({ investigation_plan: { investigation_steps: [], _error: String(e) } });
  }
}

async function checkCompleteness(deviation: Record<string, string>) {
  const capaCount = (() => {
    try { return JSON.parse(deviation.capa_plan || '[]').length; } catch { return 0; }
  })();

  const rootCausesCount = (() => {
    try {
      const rc = JSON.parse(deviation.root_causes || '[]');
      if (Array.isArray(rc)) return rc.filter((r: Record<string, string>) => r.answer).length;
      return Object.keys(rc.causes || {}).length;
    } catch { return 0; }
  })();

  const checks = {
    has_title: !!deviation.title,
    has_description: (deviation.description || '').length > 50,
    has_batch: !!deviation.batch_number,
    has_immediate_actions: (deviation.immediate_actions || '').length > 20,
    has_severity: !!deviation.severity,
    has_root_causes: rootCausesCount > 0,
    has_capa: capaCount >= 2,
    has_assigned: !!deviation.assigned_to,
    has_due_date: !!deviation.due_date,
    has_equipment: !!deviation.related_equipment,
    has_sop: !!deviation.related_sop,
  };

  const missing: string[] = [];
  if (!checks.has_title) missing.push('Заголовок отклонения');
  if (!checks.has_description) missing.push('Детальное описание (минимум 50 символов)');
  if (!checks.has_batch) missing.push('Номер серии');
  if (!checks.has_immediate_actions) missing.push('Немедленные действия');
  if (!checks.has_severity) missing.push('Классификация критичности');
  if (!checks.has_root_causes) missing.push('Анализ корневых причин');
  if (!checks.has_capa) missing.push('CAPA-план (минимум 2 действия)');
  if (!checks.has_assigned) missing.push('Ответственный за расследование');
  if (!checks.has_due_date) missing.push('Срок закрытия');
  if (!checks.has_equipment) missing.push('Связанное оборудование');
  if (!checks.has_sop) missing.push('Связанные SOP');

  const score = Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);
  const readyForApproval = score >= 80 && checks.has_severity && checks.has_root_causes && checks.has_capa;

  return NextResponse.json({
    completeness: {
      score,
      missing_fields: missing,
      checks,
      ready_for_approval: readyForApproval,
      message: score === 100
        ? 'Отклонение заполнено полностью и готово к согласованию'
        : `Полнота заполнения: ${score}%. ${missing.length} обязательных полей не заполнено.`,
    },
  });
}
