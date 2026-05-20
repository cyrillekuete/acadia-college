export type KeeniconsStyle = 'duotone' | 'filled' | 'solid' | 'outline';

/** Default icon variant used across the app. */
export const DEFAULT_KEENICONS_STYLE: KeeniconsStyle = 'filled';

export interface KeeniconsProps {
  icon: string;
  style?: KeeniconsStyle;
  className?: string;
}
