'use client';

import { AnnouncementsWorkspace } from '@/components/acadia/announcements/announcements-workspace';
import { GuardianAnnouncementsInbox } from '@/components/acadia/announcements/guardian-announcements-inbox';
import { Container } from '@/components/common/container';
import { Card, CardContent } from '@/components/ui/card';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageAnnouncements, isGuardian } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canManage = canManageAnnouncements(session?.roleSlug);
  const guardian = isGuardian(session?.roleSlug);

  return (
    <Container className="py-6">
      {isLoading ? null : canManage ? (
        <AnnouncementsWorkspace />
      ) : guardian ? (
        <GuardianAnnouncementsInbox />
      ) : (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            {t('communication.studentAnnouncementsNotice')}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
