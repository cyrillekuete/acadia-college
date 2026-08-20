'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Copy, LoaderCircleIcon, SquarePen } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import {
  parseTenantProfileField,
  type TenantProfileField,
} from '@/lib/acadia/tenant-profile';
import { toast } from 'sonner';

export type EditableSettingInputType = 'text' | 'email' | 'url' | 'tel' | 'color';

export type EditableSettingRow = {
  key: string;
  label: string;
  display: ReactNode;
  rawValue?: string | null;
  field?: TenantProfileField;
  inputType?: EditableSettingInputType;
  copyable?: boolean;
  helperText?: string;
};

export function EditableSettingsCard({
  title,
  rows,
  canEdit,
  onSave,
  pending = false,
}: {
  title: string;
  rows: EditableSettingRow[];
  canEdit: boolean;
  onSave: (field: TenantProfileField, value: string) => void | Promise<void>;
  pending?: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditableSettingRow | null>(null);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setFieldError(null);
      return;
    }
    setDraft(editing.rawValue ?? '');
    setFieldError(null);
  }, [editing]);

  async function submitEdit() {
    if (!editing?.field) {
      return;
    }
    const parsed = parseTenantProfileField(editing.field, draft);
    if ('error' in parsed) {
      setFieldError(parsed.error);
      return;
    }
    try {
      await onSave(editing.field, draft);
      setEditing(null);
    } catch {
      // Parent mutation already toasts the failure.
    }
  }

  const toBeSet = t('account.toBeSet', { defaultValue: 'To be set' });

  return (
    <>
      <Card className="min-w-full h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="kt-scrollable-x-auto p-0 pb-3">
          <Table className="align-middle text-sm text-muted-foreground">
            <TableBody>
              {rows.map((row) => {
                const isEmpty =
                  row.rawValue == null || String(row.rawValue).trim().length === 0;
                const editable = Boolean(canEdit && row.field);
                return (
                  <TableRow key={row.key}>
                    <TableCell className="min-w-36 py-2.5 font-normal text-secondary-foreground">
                      {row.label}
                    </TableCell>
                    <TableCell className="w-full py-2.5 font-normal text-foreground">
                      {isEmpty && row.field ? (
                        <span className="text-muted-foreground">{toBeSet}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {row.inputType === 'color' && row.rawValue ? (
                            <span
                              className="size-4 shrink-0 rounded-full border border-border"
                              style={{ backgroundColor: row.rawValue }}
                              aria-hidden
                            />
                          ) : null}
                          <span>{row.display}</span>
                          {row.copyable && row.rawValue ? (
                            <Button
                              type="button"
                              variant="ghost"
                              mode="icon"
                              aria-label={t('common.buttons.copy', { defaultValue: 'Copy' })}
                              onClick={() => {
                                void navigator.clipboard.writeText(row.rawValue ?? '');
                                toast.success(
                                  t('account.copied', { defaultValue: 'Copied to clipboard.' }),
                                );
                              }}
                            >
                              <Copy size={16} />
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-16 py-2.5 text-center">
                      {editable ? (
                        isEmpty ? (
                          <Button
                            type="button"
                            mode="link"
                            underlined="dashed"
                            onClick={() => setEditing(row)}
                          >
                            {t('common.buttons.add')}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            mode="icon"
                            aria-label={t('account.editField', {
                              label: row.label,
                              defaultValue: `Edit ${row.label}`,
                            })}
                            onClick={() => setEditing(row)}
                          >
                            <SquarePen size={16} className="text-blue-500" />
                          </Button>
                        )
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('account.editField', {
                    label: editing.label,
                    defaultValue: `Edit ${editing.label}`,
                  })
                : t('common.buttons.edit')}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editing?.inputType === 'color' ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="size-10 cursor-pointer rounded-md border border-input bg-background p-1"
                  value={HEX_COLOR_PATTERN.test(draft) ? expandHex(draft) : '#000000'}
                  onChange={(event) => {
                    setDraft(event.target.value.toUpperCase());
                    setFieldError(null);
                  }}
                  aria-label={editing.label}
                />
                <Input
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setFieldError(null);
                  }}
                  placeholder="#C59434"
                  autoFocus
                />
              </div>
            ) : (
              <Input
                type={editing?.inputType === 'url' ? 'url' : editing?.inputType ?? 'text'}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setFieldError(null);
                }}
                placeholder={editing?.label}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitEdit();
                  }
                }}
              />
            )}
            {editing?.helperText && !fieldError ? (
              <p className="mt-2 text-sm text-muted-foreground">{editing.helperText}</p>
            ) : null}
            {fieldError ? (
              <p className="mt-2 text-sm text-destructive">{fieldError}</p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button type="button" disabled={pending || !editing?.field} onClick={submitEdit}>
              {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
              {t('common.buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function expandHex(value: string): string {
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}
