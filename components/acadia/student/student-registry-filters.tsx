'use client';

import type { ReactNode } from 'react';
import { Search } from '@/lib/icons';
import {
  RegistryFilterCard,
  type RegistryQuickFilter,
} from '@/components/acadia/registry/registry-filter-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';
import {
  EMPTY_STUDENT_REGISTRY_FILTERS,
  STUDENT_QUICK_FILTERS,
  studentRegistryHasActiveFilters,
  type StudentQuickFilterId,
  type StudentRegistryFilters,
  type StudentRegistrySubjectOption,
} from '@/lib/acadia/student-registry';
import { StudentEnrollmentStatusProps } from '@/components/acadia/student/student-list-status';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

const ALL = '__all__';

const QUICK_FILTER_I18N: Record<StudentQuickFilterId, string> = {
  fully_enrolled_paid: 'students.fullyEnrolledPaid',
  pending_fees: 'students.pendingFees',
  pending_enrollment: 'students.pendingEnrollment',
  overdue_fees: 'students.overdueFees',
};

export function StudentRegistryFiltersPanel({
  mode = 'admin',
  filters,
  onChange,
  classOptions,
  feesStatusOptions,
  subjectOptions = [],
}: {
  mode?: 'admin' | 'teacher';
  filters: StudentRegistryFilters;
  onChange: (filters: StudentRegistryFilters) => void;
  classOptions: string[];
  feesStatusOptions: string[];
  subjectOptions?: StudentRegistrySubjectOption[];
}) {
  const { t } = useTranslation();
  const quickFilters: RegistryQuickFilter[] = (
    mode === 'teacher'
      ? (['pending_enrollment'] as StudentQuickFilterId[])
      : STUDENT_QUICK_FILTERS.map((filter) => filter.id)
  ).map((id) => ({
    id,
    label: t(QUICK_FILTER_I18N[id]),
  }));

  const handleClearAll = () => {
    onChange({ ...EMPTY_STUDENT_REGISTRY_FILTERS });
  };

  return (
    <RegistryFilterCard
      onClearAll={handleClearAll}
      hasActiveFilters={studentRegistryHasActiveFilters(filters)}
      quickFilters={quickFilters}
      activeQuickFilter={filters.quickFilter}
      onQuickFilterChange={(id) =>
        onChange({
          ...filters,
          quickFilter: id as StudentQuickFilterId | null,
        })
      }
    >
      <div className="flex flex-wrap items-end gap-4 lg:flex-nowrap">
        <FilterField label={t('common.buttons.search')} className="min-w-[min(100%,280px)] flex-[1.4]">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center text-muted-foreground">
              <Search className="size-4 shrink-0" />
            </div>
            <Input
              placeholder={t('students.searchPlaceholder')}
              value={filters.query}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              className="w-full ps-9"
            />
          </div>
        </FilterField>

        {mode === 'teacher' ? (
          <FilterField label={t('students.subject')} className="min-w-[10rem] flex-1">
            <Select
              value={filters.subjectId ?? ALL}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  subjectId: value === ALL ? null : value,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('students.allSubjects')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('students.allSubjects')}</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        ) : (
          <>
            <FilterField label={t('catalog.subSystemLabel')} className="min-w-[10rem] flex-1">
              <Select
                value={filters.subSystem ?? ALL}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    subSystem: value === ALL ? null : value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('catalog.allSubSystems')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('catalog.allSubSystems')}</SelectItem>
                  {ACADEMIC_SUB_SYSTEMS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`catalog.subSystem.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label={t('catalog.branchLabel')} className="min-w-[10rem] flex-1">
              <Select
                value={filters.branch ?? ALL}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    branch: value === ALL ? null : value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('catalog.allBranches')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('catalog.allBranches')}</SelectItem>
                  {ACADEMIC_BRANCHES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`catalog.branch.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </>
        )}

        <FilterField label={t('students.class')} className="min-w-[10rem] flex-1">
          <Select
            value={filters.className ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                className: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('students.allClasses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('students.allClasses')}</SelectItem>
              {classOptions.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label={t('common.labels.status')} className="min-w-[10rem] flex-1">
          <Select
            value={filters.enrollmentStatus ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                enrollmentStatus: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('students.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('students.allStatuses')}</SelectItem>
              {Object.keys(StudentEnrollmentStatusProps).map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`students.enrollmentStatus.${status}`)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </FilterField>

        {mode === 'admin' ? (
          <FilterField label={t('students.feesStatus')} className="min-w-[10rem] flex-1">
            <Select
              value={filters.feesStatus ?? ALL}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  feesStatus: value === ALL ? null : value,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('students.allFeesStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('students.allFeesStatus')}</SelectItem>
                {feesStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`students.feesStatusValue.${status.toLowerCase()}`, {
                      defaultValue:
                        status.charAt(0).toUpperCase() + status.slice(1),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        ) : null}
      </div>
    </RegistryFilterCard>
  );
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
