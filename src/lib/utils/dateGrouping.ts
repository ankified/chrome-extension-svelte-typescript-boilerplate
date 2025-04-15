import { isToday, isYesterday, isThisWeek, isThisMonth, isSameWeek, isSameMonth, isSameYear, format, startOfWeek, startOfMonth, subWeeks, subMonths, getYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SavedItem } from '../../types';

export function getRelativeDateGroupKey(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return 'Sem Data';
  const now = new Date();
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  if (isThisWeek(date, { weekStartsOn: 1, locale: ptBR })) {
    // Exclui Hoje/ Ontem
    if (!isToday(date) && !isYesterday(date)) return 'Esta Semana';
  }
  const lastWeek = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
  if (isSameWeek(date, lastWeek, { weekStartsOn: 1, locale: ptBR })) return 'Semana Passada';
  if (isThisMonth(date)) {
    // Exclui Esta Semana
    if (!isThisWeek(date, { weekStartsOn: 1, locale: ptBR })) return 'Este Mês';
  }
  const lastMonth = subMonths(startOfMonth(now), 1);
  if (isSameMonth(date, lastMonth)) return 'Mês Passado';
  if (isSameYear(date, now)) {
    // Meses anteriores no ano corrente
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  }
  // Anos anteriores
  return getYear(date).toString();
}

export function groupItemsByDate(items: SavedItem[], dateField: 'dateAdded' | 'scheduledDate'): Map<string, SavedItem[]> {
  const map = new Map<string, SavedItem[]>();
  for (const item of items) {
    let dateValue: number | undefined = item[dateField];
    let date: Date | null = null;
    if (typeof dateValue === 'number' && !isNaN(dateValue)) {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      // Caso algum campo venha como string ISO
      date = parseISO(dateValue);
    }
    const key = getRelativeDateGroupKey(date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

const groupOrder = [
  'Hoje',
  'Ontem',
  'Esta Semana',
  'Semana Passada',
  'Este Mês',
  'Mês Passado',
  // Meses do ano corrente e anos anteriores vêm depois
  'Sem Data'
];

export function getSortedDateGroupKeys(keys: string[]): string[] {
  // Ordena conforme ordem lógica, depois meses/anos decrescentes
  const fixed = groupOrder.filter(k => keys.includes(k));
  const mesesAnos = keys.filter(k => !groupOrder.includes(k) && k.match(/^[A-Za-zçãé]+ de \d{4}$/)).sort((a, b) => {
    // Mais recentes primeiro
    const [ma, ya] = a.split(' de ');
    const [mb, yb] = b.split(' de ');
    if (ya !== yb) return Number(yb) - Number(ya);
    // Ordem dos meses (ptBR)
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return meses.indexOf(mb.toLowerCase()) - meses.indexOf(ma.toLowerCase());
  });
  const anos = keys.filter(k => k.match(/^\d{4}$/)).sort((a, b) => Number(b) - Number(a));
  return [...fixed, ...mesesAnos, ...anos];
} 