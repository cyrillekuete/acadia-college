'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/useTranslation';

export type RegistrySection = 'directory' | 'deleted';

export function RegistrySectionTabs({
  value,
  onChange,
}: {
  value: RegistrySection;
  onChange: (value: RegistrySection) => void;
}) {
  const { t } = useTranslation();

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as RegistrySection)}
    >
      <TabsList>
        <TabsTrigger value="directory">{t('registry.directory')}</TabsTrigger>
        <TabsTrigger value="deleted">{t('registry.deleted')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
