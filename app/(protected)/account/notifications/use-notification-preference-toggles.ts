'use client';

import {
  NOTIFICATION_EVENTS,
  areAllInAppNotificationsPaused,
  isNotificationChannelEnabled,
  preferenceForEvent,
  type NotificationEvent,
} from '@/lib/acadia/communication';
import { useAcadiaNotificationPreferences } from '@/hooks/use-acadia-notification-preferences';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';

export function useNotificationPreferenceToggles() {
  const { data: preferences = [], isLoading, isError, error } =
    useAcadiaNotificationPreferences();
  const { upsertNotificationPreferences } = useCommunicationMutations();
  const pending = upsertNotificationPreferences.isPending;

  const setEventInApp = (event: NotificationEvent, inApp: boolean) => {
    const current = preferenceForEvent(preferences, event);
    return upsertNotificationPreferences.mutateAsync([
      { event, inApp, email: current.email },
    ]);
  };

  const setAllInApp = (inApp: boolean) => {
    return upsertNotificationPreferences.mutateAsync(
      NOTIFICATION_EVENTS.map((event) => ({
        event,
        inApp,
        email: preferenceForEvent(preferences, event).email,
      })),
    );
  };

  const setAllEmail = (email: boolean) => {
    return upsertNotificationPreferences.mutateAsync(
      NOTIFICATION_EVENTS.map((event) => ({
        event,
        inApp: preferenceForEvent(preferences, event).inApp,
        email,
      })),
    );
  };

  const setAllChannels = (enabled: boolean) => {
    return upsertNotificationPreferences.mutateAsync(
      NOTIFICATION_EVENTS.map((event) => ({
        event,
        inApp: enabled,
        email: enabled,
      })),
    );
  };

  return {
    preferences,
    isLoading,
    isError,
    error,
    pending,
    emailEnabled: isNotificationChannelEnabled(preferences, 'email'),
    inAppEnabled: isNotificationChannelEnabled(preferences, 'inApp'),
    allChannelsEnabled:
      isNotificationChannelEnabled(preferences, 'email') &&
      isNotificationChannelEnabled(preferences, 'inApp'),
    allInAppEnabled: isNotificationChannelEnabled(preferences, 'inApp'),
    isPaused: areAllInAppNotificationsPaused(preferences),
    setEventInApp,
    setAllInApp,
    setAllEmail,
    setAllChannels,
  };
}
