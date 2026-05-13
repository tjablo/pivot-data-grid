import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { usePortalContainer } from './portalContext';

export interface DatePickerLabels {
  calendar: string;
  openCalendar: string;
  previousMonth: string;
  nextMonth: string;
  selectDate: (date: string) => string;
  selectedDate: (date: string) => string;
}

interface DatePickerProps {
  ariaLabel: string;
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  labels: DatePickerLabels;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEK_STARTS_ON = 1;

function parseDateValue(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function formatDateValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date): Date[] {
  const firstDay = startOfMonth(month);
  const leadingDays = (firstDay.getDay() - WEEK_STARTS_ON + 7) % 7;
  const firstVisibleDay = addDays(firstDay, -leadingDays);

  return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDay, index));
}

function getLocale(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.language;
}

function isSameDate(left: Date | null, right: Date): boolean {
  return (
    Boolean(left) &&
    left?.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function DatePicker({ ariaLabel, value, placeholder, onValueChange, labels }: DatePickerProps) {
  const selectedDate = parseDateValue(value);
  const selectedTimestamp = selectedDate?.getTime();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const portalContainer = usePortalContainer();
  const locale = getLocale();

  useEffect(() => {
    if (selectedTimestamp != null) setVisibleMonth(startOfMonth(new Date(selectedTimestamp)));
  }, [selectedTimestamp]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(visibleMonth),
    [locale, visibleMonth],
  );
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }), [locale]);
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => addDays(new Date(2026, 0, 5), index)).map((date) =>
        new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
      ),
    [locale],
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const today = new Date();

  return (
    <div className="pg-date-picker">
      <input
        aria-label={ariaLabel}
        className="pg-date-picker-input"
        inputMode="numeric"
        pattern="\\d{4}-\\d{2}-\\d{2}"
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className="pg-date-picker-trigger" type="button" aria-label={labels.openCalendar}>
            <CalendarDays className="pg-action-icon" aria-hidden />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={portalContainer ?? undefined}>
          <Popover.Content className="pg-date-picker-content" align="end" sideOffset={8} role="dialog" aria-label={labels.calendar}>
            <div className="pg-date-picker-header">
              <button
                className="pg-date-picker-nav"
                type="button"
                aria-label={labels.previousMonth}
                onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="pg-action-icon" aria-hidden />
              </button>
              <span className="pg-date-picker-month">{monthLabel}</span>
              <button
                className="pg-date-picker-nav"
                type="button"
                aria-label={labels.nextMonth}
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="pg-action-icon" aria-hidden />
              </button>
            </div>

            <div className="pg-date-picker-weekdays" aria-hidden="true">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="pg-date-picker-days">
              {calendarDays.map((date) => {
                const dateValue = formatDateValue(date);
                const readableDate = dayFormatter.format(date);
                const selected = isSameDate(selectedDate, date);
                return (
                  <button
                    key={dateValue}
                    className="pg-date-picker-day"
                    type="button"
                    aria-label={selected ? labels.selectedDate(readableDate) : labels.selectDate(readableDate)}
                    aria-pressed={selected}
                    data-outside-month={date.getMonth() !== visibleMonth.getMonth() || undefined}
                    data-selected={selected || undefined}
                    data-today={isSameDate(today, date) || undefined}
                    onClick={() => {
                      onValueChange(dateValue);
                      setOpen(false);
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
