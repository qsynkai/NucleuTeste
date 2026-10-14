"use client";

import {
  CALENDAR_ENTRY_TYPE_LABELS,
  CALENDAR_ENTRY_TYPE_ORDER,
  defaultVisibleEntryTypes,
  isAllEntryTypesVisible,
} from "@/lib/calendar/calendar-entry-types";
import type { CalendarFilters } from "@/lib/calendar/filter-posts";
import type { EntryType } from "@prisma/client";

type CalendarCategoryFiltersProps = {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
};

export function CalendarCategoryFilters({
  filters,
  onChange,
}: CalendarCategoryFiltersProps) {
  const visible = filters.visibleEntryTypes;
  const allVisible = isAllEntryTypesVisible(visible);

  const setVisible = (next: EntryType[]) => {
    onChange({ ...filters, visibleEntryTypes: next });
  };

  const toggleType = (entryType: EntryType) => {
    const isOn = visible.includes(entryType);
    if (isOn) {
      setVisible(visible.filter((type) => type !== entryType));
      return;
    }
    setVisible([...visible, entryType]);
  };

  const showAll = () => {
    setVisible(defaultVisibleEntryTypes());
  };

  return (
    <div
      className="calendar-category-filters"
      role="group"
      aria-label="Filtrar por tipo de registro"
    >
      <button
        type="button"
        className={`calendar-category-filters__btn${allVisible ? " calendar-category-filters__btn--active" : ""}`}
        aria-pressed={allVisible}
        onClick={showAll}
      >
        Todos
      </button>
      {CALENDAR_ENTRY_TYPE_ORDER.map((entryType) => {
        const active = visible.includes(entryType);
        return (
          <button
            key={entryType}
            type="button"
            className={`calendar-category-filters__btn calendar-category-filters__btn--${entryType.toLowerCase().replace(/_/g, "-")}${active ? " calendar-category-filters__btn--active" : ""}`}
            aria-pressed={active}
            onClick={() => toggleType(entryType)}
          >
            {CALENDAR_ENTRY_TYPE_LABELS[entryType]}
          </button>
        );
      })}
    </div>
  );
}
