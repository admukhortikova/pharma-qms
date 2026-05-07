import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for the demo (since we can't use file-based SQLite easily in Next.js)
// In production would use proper database

export interface Deviation {
  id: string;
  deviation_number: string;
  title: string;
  description: string;
  type: string; // OOS, Process Deviation, Equipment Failure, etc.
  location: string; // Clean Room, Lab, Warehouse, etc.
  batch_number: string;
  product_name: string;
  detected_by: string;
  detected_date: string;
  immediate_actions: string;
  status: string; // Draft, Under Review, Approved, Closed, Rejected
  severity: string; // Minor, Major, Critical
  severity_justification: string;
  ai_classification: string; // JSON
  root_cause_method: string; // 5Why, Fishbone
  root_causes: string; // JSON
  capa_plan: string; // JSON
  related_equipment: string;
  related_supplier: string;
  related_sop: string;
  related_cases: string; // JSON
  assigned_to: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  comments: string; // JSON array
  attachments: string; // JSON array
}

export interface CAPATask {
  id: string;
  deviation_id: string;
  title: string;
  description: string;
  type: string; // Corrective, Preventive
  assigned_to: string;
  due_date: string;
  status: string; // Open, In Progress, Completed, Overdue
  effectiveness_metric: string;
  effectiveness_check_date: string;
  completed_at: string;
  created_at: string;
}

// Synthetic demo data
const DEMO_DEVIATIONS: Deviation[] = [
  {
    id: 'dev-001',
    deviation_number: 'DEV-2025-001',
    title: 'OOS результат по растворению таблеток Аспирин-ФС 500мг',
    description: 'В ходе контроля готовой продукции серии AB2025-034 получен результат растворения 68% за 45 минут, при норме не менее 80%. Повторный анализ подтвердил результат. Серия переведена в карантин.',
    type: 'OOS (Out of Specification)',
    location: 'Лаборатория контроля качества',
    batch_number: 'AB2025-034',
    product_name: 'Аспирин-ФС 500мг таблетки',
    detected_by: 'Петрова М.А.',
    detected_date: '2025-03-15',
    immediate_actions: 'Серия переведена в карантин. Повторный анализ проведён на 6 единицах. Уведомлён начальник ОКК. Оборудование (диссолюционный тестер DT-820) выведено из эксплуатации для проверки.',
    status: 'Under Review',
    severity: 'Critical',
    severity_justification: 'OOS по критическому параметру качества (растворение) для готовой продукции. Прямой риск для пациента.',
    ai_classification: JSON.stringify({
      severity: 'Critical',
      confidence: 0.94,
      gmp_category: 'Product Quality Failure',
      risk_factors: ['Готовая продукция', 'Критический параметр качества', 'Подтверждённый OOS', 'Риск для пациента'],
      regulatory_refs: ['ICH Q6A', 'USP <711>', 'GMP Annex 11'],
      recommended_actions: ['Полная блокировка серии', 'Уведомление регулятора', 'Расследование в течение 30 дней']
    }),
    root_cause_method: '5Why',
    root_causes: JSON.stringify([
      { level: 1, why: 'Почему растворение ниже нормы?', answer: 'Таблетки не распадаются должным образом за нормативное время' },
      { level: 2, why: 'Почему таблетки не распадаются?', answer: 'Повышенная твёрдость таблеток выше верхнего предела спецификации' },
      { level: 3, why: 'Почему твёрдость повышена?', answer: 'Давление прессования на таблетпрессе превысило заданное значение' },
      { level: 4, why: 'Почему давление было превышено?', answer: 'Неисправность датчика давления — показывал 18 кН при реальных 23 кН' },
      { level: 5, why: 'Почему неисправность не была обнаружена?', answer: 'Калибровка датчика не проводилась 8 месяцев вместо плановых 6' }
    ]),
    capa_plan: JSON.stringify([
      { id: 'capa-001-1', title: 'Внеплановая калибровка всех датчиков давления', type: 'Corrective', assigned_to: 'Сидоров П.В.', due_date: '2025-03-22', status: 'Completed', metric: 'Акт калибровки с результатами в норме' },
      { id: 'capa-001-2', title: 'Пересмотр графика калибровки — сокращение до 3 месяцев', type: 'Preventive', assigned_to: 'Козлов А.И.', due_date: '2025-04-01', status: 'In Progress', metric: 'Утверждённый новый SOP-KAL-015' },
      { id: 'capa-001-3', title: 'Обучение операторов по распознаванию отклонений оборудования', type: 'Preventive', assigned_to: 'HR Отдел', due_date: '2025-04-15', status: 'Open', metric: 'Протоколы обучения + тест >80%' }
    ]),
    related_equipment: 'Таблетпресс Fette 2090, Диссолюционный тестер DT-820',
    related_supplier: '',
    related_sop: 'SOP-PRD-042 (Прессование таблеток), SOP-QC-011 (Тест растворения)',
    related_cases: JSON.stringify(['dev-003']),
    assigned_to: 'Иванов С.К.',
    due_date: '2025-04-15',
    created_at: '2025-03-15T09:30:00Z',
    updated_at: '2025-03-18T14:20:00Z',
    comments: JSON.stringify([
      { id: 'c1', author: 'Иванов С.К.', text: 'Инициировано расследование. Запросил данные по датчику давления за последние 12 месяцев.', date: '2025-03-15T11:00:00Z' },
      { id: 'c2', author: 'Петрова М.А.', text: 'Повторный анализ на новом оборудовании подтвердил OOS. Рекомендую Critical статус.', date: '2025-03-16T09:15:00Z' },
      { id: 'c3', author: 'Директор ОКК', text: 'Согласован статус Critical. Уведомление регулятора до 20 марта.', date: '2025-03-17T16:30:00Z' }
    ]),
    attachments: JSON.stringify(['protocol_AB2025-034.pdf', 'dissolution_results.xlsx'])
  },
  {
    id: 'dev-002',
    deviation_number: 'DEV-2025-002',
    title: 'Превышение допустимого числа частиц в чистой зоне класса А',
    description: 'Мониторинг чистых помещений зафиксировал превышение частиц ≥0.5 мкм: 3850/м³ при норме ≤3520/м³ в зоне наполнения инъекционных растворов. Производство остановлено.',
    type: 'Отклонение окружающей среды',
    location: 'Чистая зона Класс А — Цех №3 (Инъекции)',
    batch_number: 'INJ-2025-089, INJ-2025-090',
    product_name: 'Глюкоза 5% р-р для инфузий',
    detected_by: 'Система мониторинга Lighthouse 5014i',
    detected_date: '2025-03-28',
    immediate_actions: 'Производство остановлено немедленно. Серии INJ-2025-089 и 090 переведены в карантин. Проведена экстренная дезинфекция. Вызван технический инженер HVAC.',
    status: 'Approved',
    severity: 'Major',
    severity_justification: 'Превышение в зоне А для стерильного производства. Потенциальный риск для стерильности продукции, но разовое событие без подтверждённой контаминации.',
    ai_classification: JSON.stringify({
      severity: 'Major',
      confidence: 0.89,
      gmp_category: 'Environmental Control Failure',
      risk_factors: ['Стерильное производство', 'Зона Класс А', 'Несколько затронутых серий', 'HVAC отклонение'],
      regulatory_refs: ['EU GMP Annex 1', 'ISO 14644-1', 'GMP Annex 15'],
      recommended_actions: ['Блокировка серий до стерильного тестирования', 'Техническое расследование HVAC', 'Дополнительный мониторинг 2 недели']
    }),
    root_cause_method: 'Fishbone',
    root_causes: JSON.stringify({
      effect: 'Превышение частиц в Классе А',
      causes: {
        'Equipment': ['Засорение HEPA-фильтра H14 (замена просрочена на 3 месяца)'],
        'Environment': ['Плановые ТО соседнего помещения создали вибрацию'],
        'Method': ['Дверь шлюза открывалась дольше нормы'],
        'People': ['Новый сотрудник не прошёл полное обучение по gowning'],
        'Materials': ['Нестандартная упаковка компонентов создала дополнительные частицы']
      }
    }),
    capa_plan: JSON.stringify([
      { id: 'capa-002-1', title: 'Замена HEPA-фильтров зоны А', type: 'Corrective', assigned_to: 'Технический отдел', due_date: '2025-04-05', status: 'Completed', metric: 'Тест целостности фильтра DOP/PAO < 0.01%' },
      { id: 'capa-002-2', title: 'Пересмотр графика замены HEPA-фильтров', type: 'Preventive', assigned_to: 'Инженер HVAC', due_date: '2025-04-20', status: 'In Progress', metric: 'Обновлённый SOP-ENG-023 утверждён' },
      { id: 'capa-002-3', title: 'Переобучение сотрудника по gowning процедуре', type: 'Corrective', assigned_to: 'Старший оператор', due_date: '2025-04-08', status: 'Completed', metric: 'Протокол обучения + практический тест' }
    ]),
    related_equipment: 'HVAC система Цех №3, HEPA-фильтры H14, Мониторинг Lighthouse 5014i',
    related_supplier: 'AAF International (HEPA-фильтры)',
    related_sop: 'SOP-ENV-007 (Мониторинг ЧП), SOP-ENG-023 (ТО HVAC)',
    related_cases: JSON.stringify([]),
    assigned_to: 'Волков Д.Н.',
    due_date: '2025-05-01',
    created_at: '2025-03-28T14:00:00Z',
    updated_at: '2025-04-02T10:30:00Z',
    comments: JSON.stringify([
      { id: 'c4', author: 'Волков Д.Н.', text: 'HVAC инженер подтвердил: фильтр в предаварийном состоянии. Срочная замена.', date: '2025-03-28T16:00:00Z' },
      { id: 'c5', author: 'QA Менеджер', text: 'Стерильное тестирование серий назначено. Результаты через 14 дней.', date: '2025-03-29T09:00:00Z' }
    ]),
    attachments: JSON.stringify(['particle_monitoring_report.pdf', 'hvac_inspection.pdf'])
  },
  {
    id: 'dev-003',
    deviation_number: 'DEV-2025-003',
    title: 'Отклонение по твёрдости таблеток Ибупрофен 400мг — превышение верхней границы',
    description: 'Контроль в процессе производства серии IB2025-021: 4 из 20 измерений показали твёрдость >130 Н при норме 80-130 Н. Производство продолжено с усиленным мониторингом.',
    type: 'Отклонение в процессе',
    location: 'Таблеточный цех — Линия 2',
    batch_number: 'IB2025-021',
    product_name: 'Ибупрофен 400мг таблетки п.о.',
    detected_by: 'Смирнова А.В.',
    detected_date: '2025-04-10',
    immediate_actions: 'Регулировка давления прессования проведена оператором. Производство продолжено под усиленным контролем (измерение каждые 15 мин вместо 30).',
    status: 'Closed',
    severity: 'Minor',
    severity_justification: 'Незначительное превышение (максимум 137 Н), устранено in-process. Серия выпущена после полного контроля качества.',
    ai_classification: JSON.stringify({
      severity: 'Minor',
      confidence: 0.87,
      gmp_category: 'In-Process Control Deviation',
      risk_factors: ['Незначительное превышение нормы', 'Устранено в процессе', 'Серийный выпуск возможен'],
      regulatory_refs: ['ICH Q10', 'GMP Глава 5'],
      recommended_actions: ['Расследование первопричины', 'Коррекция параметров процесса', 'Выпуск после подтверждения ОКК']
    }),
    root_cause_method: '5Why',
    root_causes: JSON.stringify([
      { level: 1, why: 'Почему твёрдость превысила норму?', answer: 'Давление прессования автоматически увеличилось' },
      { level: 2, why: 'Почему давление увеличилось?', answer: 'Изменились свойства гранулята (влажность снизилась)' },
      { level: 3, why: 'Почему влажность гранулята изменилась?', answer: 'Гранулят хранился в условиях пониженной влажности дольше допустимого' },
      { level: 4, why: 'Почему хранился дольше?', answer: 'Задержка подачи гранулята из-за смены смен — ожидание 4 часа' },
      { level: 5, why: 'Почему нет контроля времени ожидания?', answer: 'SOP не регламентирует максимальное время хранения гранулята до прессования' }
    ]),
    capa_plan: JSON.stringify([
      { id: 'capa-003-1', title: 'Дополнение SOP-PRD-038: максимальное время хранения гранулята', type: 'Preventive', assigned_to: 'Технолог Лебедев', due_date: '2025-04-25', status: 'Completed', metric: 'Утверждённый SOP с указанием max 2 часа' },
      { id: 'capa-003-2', title: 'Установка таймеров-сигнализаторов на контейнеры с гранулятом', type: 'Preventive', assigned_to: 'Технический отдел', due_date: '2025-05-10', status: 'In Progress', metric: 'Акт ввода в эксплуатацию 5 таймеров' }
    ]),
    related_equipment: 'Таблетпресс Fette 2090',
    related_supplier: '',
    related_sop: 'SOP-PRD-038 (Гранулирование), SOP-PRD-042 (Прессование)',
    related_cases: JSON.stringify(['dev-001']),
    assigned_to: 'Лебедев К.С.',
    due_date: '2025-05-10',
    created_at: '2025-04-10T10:00:00Z',
    updated_at: '2025-04-25T15:00:00Z',
    comments: JSON.stringify([
      { id: 'c6', author: 'Лебедев К.С.', text: 'Серия IB2025-021 выпущена после полного финального контроля. Все показатели в норме.', date: '2025-04-24T11:00:00Z' }
    ]),
    attachments: JSON.stringify(['ipc_records_IB2025-021.pdf'])
  },
  {
    id: 'dev-004',
    deviation_number: 'DEV-2025-004',
    title: 'Сбой системы мониторинга температуры склада АФС',
    description: 'В течение 4 часов система непрерывного мониторинга температуры склада АФС (API Warehouse) не фиксировала данные из-за сбоя ПО. Реальные температурные условия неизвестны.',
    type: 'Сбой оборудования/ПО',
    location: 'Склад АФС — Зона хранения 2-8°C',
    batch_number: 'Не применимо',
    product_name: 'АФС Метформин HCl, АФС Амоксициллин',
    detected_by: 'Кладовщик Орлов В.А.',
    detected_date: '2025-04-18',
    immediate_actions: 'Произведён ручной замер температуры: 4.2°C (в норме). Резервный логгер установлен. ИТ-отдел уведомлён. Материалы на складе не перемещались.',
    status: 'Draft',
    severity: 'Major',
    severity_justification: 'Неизвестность температурных условий для 2 критических АФС в течение 4 часов. Требует оценки стабильности.',
    ai_classification: JSON.stringify({
      severity: 'Major',
      confidence: 0.82,
      gmp_category: 'Data Integrity / Storage Conditions',
      risk_factors: ['Критические материалы', 'Потеря данных мониторинга', 'Неизвестный риск деградации', 'Annex 11 нарушение'],
      regulatory_refs: ['GMP Annex 11', 'GMP Глава 4 (Документация)', 'ICH Q1A'],
      recommended_actions: ['Оценка стабильности затронутых АФС', 'Аудит системы мониторинга', 'Резервирование системы']
    }),
    root_cause_method: 'Fishbone',
    root_causes: JSON.stringify({
      effect: 'Сбой мониторинга температуры на 4 часа',
      causes: {
        'Equipment': ['Устаревшая версия ПО мониторинга (v2.1, актуальная v3.4)'],
        'Environment': ['Перебой питания на 2 секунды вызвал зависание ПО'],
        'Method': ['Отсутствие процедуры автоматического перезапуска при сбое'],
        'People': ['Отсутствие ночной смены для контроля системы'],
        'Materials': ['Нет UPS для сервера мониторинга']
      }
    }),
    capa_plan: JSON.stringify([
      { id: 'capa-004-1', title: 'Обновление ПО мониторинга до v3.4', type: 'Corrective', assigned_to: 'ИТ-отдел', due_date: '2025-04-30', status: 'Open', metric: 'Акт обновления + валидационный тест' },
      { id: 'capa-004-2', title: 'Установка UPS для серверов мониторинга', type: 'Preventive', assigned_to: 'Технический отдел', due_date: '2025-05-15', status: 'Open', metric: 'UPS установлен, тест автономии 8 часов' },
      { id: 'capa-004-3', title: 'Настройка SMS-алертов при сбое мониторинга', type: 'Preventive', assigned_to: 'ИТ-отдел', due_date: '2025-04-28', status: 'Open', metric: 'Тест рассылки: 100% получателей за 5 мин' }
    ]),
    related_equipment: 'Система мониторинга Ellab TrackSense, Сервер мониторинга',
    related_supplier: 'Ellab (система мониторинга)',
    related_sop: 'SOP-WH-005 (Хранение АФС), SOP-IT-012 (Обслуживание систем мониторинга)',
    related_cases: JSON.stringify([]),
    assigned_to: 'Новикова Т.И.',
    due_date: '2025-05-20',
    created_at: '2025-04-18T08:00:00Z',
    updated_at: '2025-04-18T12:00:00Z',
    comments: JSON.stringify([]),
    attachments: JSON.stringify(['manual_temp_log_20250418.pdf'])
  },
  {
    id: 'dev-005',
    deviation_number: 'DEV-2025-005',
    title: 'Загрязнение флаконов — обнаружены посторонние частицы при визуальном контроле',
    description: 'При 100% визуальном контроле серии AMP-2025-044 (ампулы Натрия Хлорид 0.9%) обнаружено 12 флаконов из 5000 с видимыми частицами чёрного цвета. ИДентификация частиц в процессе.',
    type: 'Контаминация продукта',
    location: 'Линия наполнения ампул — Цех №3',
    batch_number: 'AMP-2025-044',
    product_name: 'Натрия Хлорид 0.9% раствор для инъекций, ампулы 5 мл',
    detected_by: 'Визуальный контроль — оператор Фёдорова Л.К.',
    detected_date: '2025-05-02',
    immediate_actions: 'Производство остановлено. Вся серия AMP-2025-044 (5000 ампул) переведена в карантин. Отдел QC отбирает образцы для идентификации частиц. Линия законсервирована для расследования.',
    status: 'Under Review',
    severity: 'Critical',
    severity_justification: 'Видимые частицы в инъекционном препарате. Прямая угроза безопасности пациентов. Требуется уведомление регулятора в течение 24 часов.',
    ai_classification: JSON.stringify({
      severity: 'Critical',
      confidence: 0.97,
      gmp_category: 'Product Contamination - Physical',
      risk_factors: ['Инъекционный препарат', 'Видимые частицы', 'Риск эмболии у пациента', 'Системная проблема линии'],
      regulatory_refs: ['EU GMP Annex 1', 'USP <1>', 'FDA 21 CFR 211.192'],
      recommended_actions: ['Отзыв/уничтожение всей серии', 'Уведомление регулятора немедленно', 'Полная остановка линии до выяснения причины', 'Анализ предыдущих серий']
    }),
    root_cause_method: '5Why',
    root_causes: JSON.stringify([
      { level: 1, why: 'Почему частицы попали в ампулы?', answer: 'Ведётся расследование — предварительная гипотеза: износ прокладок наполнительного клапана' },
      { level: 2, why: '', answer: '' },
      { level: 3, why: '', answer: '' },
      { level: 4, why: '', answer: '' },
      { level: 5, why: '', answer: '' }
    ]),
    capa_plan: JSON.stringify([]),
    related_equipment: 'Линия наполнения Bausch+Ströbel HAS 4010',
    related_supplier: 'Klöckner Pentaplast (первичная упаковка)',
    related_sop: 'SOP-PRD-055 (Наполнение ампул), SOP-QC-003 (Визуальный контроль)',
    related_cases: JSON.stringify(['dev-002']),
    assigned_to: 'Директор ОКК',
    due_date: '2025-05-09',
    created_at: '2025-05-02T15:30:00Z',
    updated_at: '2025-05-02T18:00:00Z',
    comments: JSON.stringify([
      { id: 'c7', author: 'Директор ОКК', text: 'СРОЧНО. Regulator notification подготавливается. Весь цех №3 под проверкой. Нужны результаты идентификации частиц к утру.', date: '2025-05-02T19:00:00Z' }
    ]),
    attachments: JSON.stringify(['visual_inspection_report.pdf', 'particle_photos.zip'])
  }
];

// In-memory store
let deviations: Deviation[] = [...DEMO_DEVIATIONS];

export function getAllDeviations(): Deviation[] {
  return deviations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getDeviationById(id: string): Deviation | undefined {
  return deviations.find(d => d.id === id);
}

export function createDeviation(data: Partial<Deviation>): Deviation {
  const now = new Date().toISOString();
  const count = deviations.length + 1;
  const year = new Date().getFullYear();
  
  const deviation: Deviation = {
    id: uuidv4(),
    deviation_number: `DEV-${year}-${String(count).padStart(3, '0')}`,
    title: data.title || '',
    description: data.description || '',
    type: data.type || '',
    location: data.location || '',
    batch_number: data.batch_number || '',
    product_name: data.product_name || '',
    detected_by: data.detected_by || '',
    detected_date: data.detected_date || now.split('T')[0],
    immediate_actions: data.immediate_actions || '',
    status: 'Draft',
    severity: data.severity || '',
    severity_justification: data.severity_justification || '',
    ai_classification: data.ai_classification || '{}',
    root_cause_method: data.root_cause_method || '5Why',
    root_causes: data.root_causes || '[]',
    capa_plan: data.capa_plan || '[]',
    related_equipment: data.related_equipment || '',
    related_supplier: data.related_supplier || '',
    related_sop: data.related_sop || '',
    related_cases: data.related_cases || '[]',
    assigned_to: data.assigned_to || '',
    due_date: data.due_date || '',
    created_at: now,
    updated_at: now,
    comments: '[]',
    attachments: '[]',
  };
  
  deviations.push(deviation);
  return deviation;
}

export function updateDeviation(id: string, data: Partial<Deviation>): Deviation | null {
  const index = deviations.findIndex(d => d.id === id);
  if (index === -1) return null;
  
  deviations[index] = {
    ...deviations[index],
    ...data,
    id,
    updated_at: new Date().toISOString(),
  };
  
  return deviations[index];
}

export function getStats() {
  const total = deviations.length;
  const bySeverity = {
    Critical: deviations.filter(d => d.severity === 'Critical').length,
    Major: deviations.filter(d => d.severity === 'Major').length,
    Minor: deviations.filter(d => d.severity === 'Minor').length,
  };
  const byStatus = {
    Draft: deviations.filter(d => d.status === 'Draft').length,
    'Under Review': deviations.filter(d => d.status === 'Under Review').length,
    Approved: deviations.filter(d => d.status === 'Approved').length,
    Closed: deviations.filter(d => d.status === 'Closed').length,
  };
  const overdue = deviations.filter(d => {
    if (!d.due_date || d.status === 'Closed') return false;
    return new Date(d.due_date) < new Date();
  }).length;
  
  const byType: Record<string, number> = {};
  deviations.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + 1;
  });
  
  const byLocation: Record<string, number> = {};
  deviations.forEach(d => {
    byLocation[d.location] = (byLocation[d.location] || 0) + 1;
  });
  
  return { total, bySeverity, byStatus, overdue, byType, byLocation };
}

export function findSimilarCases(deviation: Partial<Deviation>): Deviation[] {
  return deviations
    .filter(d => d.id !== deviation.id)
    .filter(d => 
      d.type === deviation.type || 
      d.location === deviation.location ||
      d.related_equipment?.split(',').some(e => deviation.related_equipment?.includes(e.trim()))
    )
    .slice(0, 3);
}
