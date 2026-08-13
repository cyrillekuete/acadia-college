import type { TFunction } from 'i18next';
import type { AcadiaMenuItem } from '@/config/types';

export function menuItemLabel(
  item: Pick<AcadiaMenuItem, 'title' | 'titleKey' | 'heading' | 'headingKey'>,
  t: TFunction,
): string {
  if (item.titleKey) {
    return t(item.titleKey, { defaultValue: item.title ?? item.titleKey });
  }
  if (item.headingKey) {
    return t(item.headingKey, { defaultValue: item.heading ?? item.headingKey });
  }
  return item.title || item.heading || '';
}
