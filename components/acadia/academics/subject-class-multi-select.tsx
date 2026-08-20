'use client';

import { useMemo, useState } from 'react';
import { ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ClassSubjectSelection,
  SUBJECT_DEFAULT_GROUPING,
  UNGROUPED_GROUPING_OVERRIDE,
  formatSelectionLabel,
  getSubjectSelection,
  groupOptionsByGrouping,
  isSubjectFullySelected,
  isSubjectPartiallySelected,
  isSubBranchSelected,
  selectAllSubjectSelections,
  setSelectionGrouping,
  toggleFullSubject,
  toggleSubBranch,
} from '@/lib/acadia/class-subject-selections';
import type { SubjectForClassOption } from '@/hooks/use-subjects-for-class';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SubjectClassMultiSelectProps = {
  options: SubjectForClassOption[];
  value: ClassSubjectSelection[];
  onChange: (value: ClassSubjectSelection[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  placeholder?: string;
};

function subjectSearchValue(subject: SubjectForClassOption): string {
  const branchNames = subject.subBranches.map((branch) => branch.name).join(' ');
  const grouping = subject.groupingNameEn ?? '';
  return `${subject.code} ${subject.nameEn} ${grouping} ${branchNames}`.trim().toLowerCase();
}

function SubjectGroupingOverride({
  subject,
  selection,
  groupings,
  onChange,
  disabled,
}: {
  subject: SubjectForClassOption;
  selection: ClassSubjectSelection;
  groupings: { id: string; nameEn: string }[];
  onChange: (groupingId: string | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const defaultLabel = subject.groupingNameEn
    ? `Subject default (${subject.groupingNameEn})`
    : 'Subject default (none)';

  return (
    <div className="flex items-center gap-2 ps-1">
      <Label className="shrink-0 text-xs text-muted-foreground">Grouping</Label>
      <Select
        value={selection.groupingId ?? SUBJECT_DEFAULT_GROUPING}
        onValueChange={(next) => {
          const groupingId = next === SUBJECT_DEFAULT_GROUPING ? null : next;
          if (groupingId !== (selection.groupingId ?? null)) {
            onChange(groupingId);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SUBJECT_DEFAULT_GROUPING}>{defaultLabel}</SelectItem>
          {subject.groupingId ? (
            <SelectItem value={UNGROUPED_GROUPING_OVERRIDE}>
              {t('subjects.ungrouped')}
            </SelectItem>
          ) : null}
          {groupings.map((grouping) => (
            <SelectItem key={grouping.id} value={grouping.id}>
              {grouping.nameEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SubjectOptionRow({
  subject,
  value,
  onChange,
  expandedSubjects,
  setSubjectExpanded,
}: {
  subject: SubjectForClassOption;
  value: ClassSubjectSelection[];
  onChange: (value: ClassSubjectSelection[]) => void;
  expandedSubjects: Set<string>;
  setSubjectExpanded: (subjectId: string, open: boolean) => void;
}) {
  const selection = getSubjectSelection(value, subject.id);

  if (!subject.hasSubBranches || subject.subBranches.length === 0) {
    const checked = isSubjectFullySelected(selection, 0);
    return (
      <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
        <Checkbox
          checked={checked}
          disabled={false}
          onCheckedChange={(next) => {
            onChange(toggleFullSubject(value, subject.id, next === true));
          }}
        />
        <span className="truncate">
          {subject.code} — {subject.nameEn}
        </span>
      </label>
    );
  }

  const fullySelected = isSubjectFullySelected(selection, subject.subBranches.length);
  const partiallySelected = isSubjectPartiallySelected(
    selection,
    subject.subBranches.length,
  );
  const expanded = expandedSubjects.has(subject.id);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={(open) => setSubjectExpanded(subject.id, open)}
      className="rounded-sm"
    >
      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent">
        <Checkbox
          checked={partiallySelected ? 'indeterminate' : fullySelected}
          onCheckedChange={(next) => {
            onChange(toggleFullSubject(value, subject.id, next === true));
          }}
        />
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
          >
            <ChevronsUpDown
              className={cn(
                'size-3.5 shrink-0 opacity-60 transition-transform',
                expanded && 'rotate-180',
              )}
            />
            <span className="truncate">
              {subject.code} — {subject.nameEn}
            </span>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-0.5 pb-1">
        {subject.subBranches.map((branch) => {
          const branchChecked = isSubBranchSelected(selection, branch.id);
          return (
            <label
              key={branch.id}
              className="flex cursor-pointer items-center gap-2 rounded-sm py-1.5 ps-9 pe-2 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={branchChecked}
                onCheckedChange={(next) => {
                  onChange(
                    toggleSubBranch(
                      value,
                      subject.id,
                      branch.id,
                      subject.subBranches.map((item) => item.id),
                      next === true,
                    ),
                  );
                }}
              />
              <span className="truncate">{branch.name}</span>
            </label>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubjectClassMultiSelect({
  options,
  value,
  onChange,
  disabled,
  loading,
  error,
  emptyMessage = 'No subjects found for this level and stream.',
  placeholder = 'Select subjects…',
}: SubjectClassMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const { data: groupings = [] } = useSubjectGroupingOptions();

  const optionById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const groupingNames = useMemo(
    () => new Map(groupings.map((grouping) => [grouping.id, grouping.nameEn])),
    [groupings],
  );

  const groupedOptions = useMemo(() => groupOptionsByGrouping(options), [options]);

  const filteredGroupedOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return groupedOptions;
    }

    return groupedOptions
      .map((group) => ({
        ...group,
        options: group.options.filter((subject) => subjectSearchValue(subject).includes(query)),
      }))
      .filter((group) => group.options.length > 0);
  }, [groupedOptions, search]);

  const setSubjectExpanded = (subjectId: string, open: boolean) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(subjectId);
      } else {
        next.delete(subjectId);
      }
      return next;
    });
  };

  const removeSelection = (subjectId: string) => {
    onChange(value.filter((selection) => selection.subjectId !== subjectId));
  };

  const selectAll = () => {
    onChange(selectAllSubjectSelections(options, value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const triggerLabel =
    value.length === 0
      ? placeholder
      : `${value.length} subject${value.length === 1 ? '' : 's'} selected`;

  const hasVisibleOptions = filteredGroupedOptions.some((group) => group.options.length > 0);

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="space-y-2 rounded-md border border-input px-3 py-2">
          {value.map((selection) => {
            const option = optionById.get(selection.subjectId);
            if (!option) {
              return null;
            }
            return (
              <div key={selection.subjectId} className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="gap-1">
                    {formatSelectionLabel(option, selection, groupingNames)}
                    <button
                      type="button"
                      className="inline-flex size-3.5 items-center justify-center rounded-md opacity-60 transition-opacity hover:opacity-100"
                      onClick={() => removeSelection(selection.subjectId)}
                      disabled={disabled}
                      aria-label={`Remove ${option.code}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                </div>
                <SubjectGroupingOverride
                  subject={option}
                  selection={selection}
                  groupings={groupings}
                  onChange={(groupingId) => {
                    const next = setSelectionGrouping(
                      value,
                      selection.subjectId,
                      groupingId,
                    );
                    if (JSON.stringify(next) !== JSON.stringify(value)) {
                      onChange(next);
                    }
                  }}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {options.length > 0 ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={selectAll}
              disabled={disabled || loading}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={clearAll}
              disabled={disabled || loading || value.length === 0}
            >
              Clear
            </Button>
          </>
        ) : null}
      </div>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSearch('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className="w-full justify-between font-normal"
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {loading ? 'Loading subjects…' : triggerLabel}
            </span>
            <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="me-2 size-4 shrink-0 opacity-50" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subjects…"
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {!hasVisibleOptions ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filteredGroupedOptions.map((group) => (
                <div key={group.groupingId ?? 'ungrouped'} className="mb-2 last:mb-0">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {group.groupingName}
                  </p>
                  <div className="space-y-0.5">
                    {group.options.map((subject) => (
                      <SubjectOptionRow
                        key={subject.id}
                        subject={subject}
                        value={value}
                        onChange={onChange}
                        expandedSubjects={expandedSubjects}
                        setSubjectExpanded={setSubjectExpanded}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
