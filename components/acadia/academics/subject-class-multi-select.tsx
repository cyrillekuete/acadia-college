'use client';

import { useMemo, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ClassSubjectSelection,
  formatSelectionLabel,
  getSubjectSelection,
  groupOptionsByGrouping,
  isSubjectFullySelected,
  isSubjectPartiallySelected,
  isSubBranchSelected,
  setSelectionGrouping,
  toggleFullSubject,
  toggleSubBranch,
} from '@/lib/acadia/class-subject-selections';
import type { SubjectForClassOption } from '@/hooks/use-subjects-for-class';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { Badge, BadgeButton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SUBJECT_DEFAULT_GROUPING = '__subject_default__';

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
  return `${subject.code} ${subject.nameEn} ${grouping} ${branchNames}`.trim();
}

function SubjectGroupingOverride({
  subject,
  selection,
  groupingNames,
  onChange,
  disabled,
}: {
  subject: SubjectForClassOption;
  selection: ClassSubjectSelection;
  groupingNames: Map<string, string>;
  onChange: (groupingId: string | null) => void;
  disabled?: boolean;
}) {
  const defaultLabel = subject.groupingNameEn
    ? `Subject default (${subject.groupingNameEn})`
    : 'Subject default (none)';

  return (
    <div className="flex items-center gap-2 ps-1">
      <Label className="shrink-0 text-xs text-muted-foreground">Grouping</Label>
      <Select
        value={selection.groupingId ?? SUBJECT_DEFAULT_GROUPING}
        onValueChange={(next) =>
          onChange(next === SUBJECT_DEFAULT_GROUPING ? null : next)
        }
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SUBJECT_DEFAULT_GROUPING}>{defaultLabel}</SelectItem>
          {Array.from(groupingNames.entries()).map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
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
  toggleExpanded,
}: {
  subject: SubjectForClassOption;
  value: ClassSubjectSelection[];
  onChange: (value: ClassSubjectSelection[]) => void;
  expandedSubjects: Set<string>;
  toggleExpanded: (subjectId: string) => void;
}) {
  const selection = getSubjectSelection(value, subject.id);
  const searchValue = subjectSearchValue(subject);

  if (!subject.hasSubBranches || subject.subBranches.length === 0) {
    const checked = isSubjectFullySelected(selection, 0);
    return (
      <CommandItem
        key={subject.id}
        value={searchValue}
        onSelect={() => {
          onChange(toggleFullSubject(value, subject.id, !checked));
        }}
        className="flex items-center gap-2"
      >
        <Checkbox checked={checked} className="pointer-events-none" />
        <span className="truncate">
          {subject.code} — {subject.nameEn}
        </span>
      </CommandItem>
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
      key={subject.id}
      open={expanded}
      onOpenChange={() => toggleExpanded(subject.id)}
    >
      <CommandItem
        value={searchValue}
        onSelect={() => {
          onChange(toggleFullSubject(value, subject.id, !fullySelected));
        }}
        className="flex items-center gap-2 p-0"
      >
        <div className="flex w-full items-center gap-2 px-2 py-1.5">
          <Checkbox
            checked={partiallySelected ? 'indeterminate' : fullySelected}
            className="pointer-events-none"
          />
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(subject.id);
              }}
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
      </CommandItem>
      <CollapsibleContent>
        {subject.subBranches.map((branch) => {
          const branchChecked = isSubBranchSelected(selection, branch.id);
          return (
            <CommandItem
              key={branch.id}
              value={`${searchValue} ${branch.name}`}
              onSelect={() => {
                onChange(
                  toggleSubBranch(
                    value,
                    subject.id,
                    branch.id,
                    subject.subBranches.map((item) => item.id),
                    !branchChecked,
                  ),
                );
              }}
              className="flex items-center gap-2 ps-9"
            >
              <Checkbox checked={branchChecked} className="pointer-events-none" />
              <span className="truncate">{branch.name}</span>
            </CommandItem>
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

  const toggleExpanded = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const removeSelection = (subjectId: string) => {
    onChange(value.filter((selection) => selection.subjectId !== subjectId));
  };

  const selectAll = () => {
    onChange(
      options.map((option) => ({
        subjectId: option.id,
        subBranchIds: null,
        groupingId: null,
      })),
    );
  };

  const clearAll = () => {
    onChange([]);
  };

  const triggerLabel =
    value.length === 0
      ? placeholder
      : `${value.length} subject${value.length === 1 ? '' : 's'} selected`;

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
                  <Badge variant="secondary">
                    {formatSelectionLabel(option, selection, groupingNames)}
                    <BadgeButton
                      type="button"
                      onClick={() => removeSelection(selection.subjectId)}
                      disabled={disabled}
                    >
                      <X />
                    </BadgeButton>
                  </Badge>
                </div>
                <SubjectGroupingOverride
                  subject={option}
                  selection={selection}
                  groupingNames={groupingNames}
                  onChange={(groupingId) =>
                    onChange(setSelectionGrouping(value, selection.subjectId, groupingId))
                  }
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

      <Popover open={open} onOpenChange={setOpen}>
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
        >
          <Command>
            <CommandInput placeholder="Search subjects…" />
            <CommandList>
              <ScrollArea viewportClassName="max-h-[280px] [&>div]:!block">
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                {groupedOptions.map((group) => (
                  <CommandGroup key={group.groupingId ?? 'ungrouped'} heading={group.groupingName}>
                    {group.options.map((subject) => (
                      <SubjectOptionRow
                        key={subject.id}
                        subject={subject}
                        value={value}
                        onChange={onChange}
                        expandedSubjects={expandedSubjects}
                        toggleExpanded={toggleExpanded}
                      />
                    ))}
                  </CommandGroup>
                ))}
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
