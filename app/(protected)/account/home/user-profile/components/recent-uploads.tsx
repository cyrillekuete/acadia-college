'use client';

import Link from 'next/link';
import { EllipsisVertical } from 'lucide-react';
import { resolveFileTypeIcon } from '@/lib/acadia/file-type-icon';
import { formatFileSize } from '@/lib/acadia/resources';
import { formatDateTime } from '@/lib/acadia/record-display';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu4 } from '@/partials/dropdown-menu/dropdown-menu-4';
import { DropdownMenu7 } from '@/partials/dropdown-menu/dropdown-menu-7';
import { useUserRecentUploads } from '@/hooks/use-user-recent-uploads';
import type { UserRecentUploadItem } from '@/lib/supabase/queries/user-uploads';

interface IRecentUploadsProps {
  title: string;
}

function formatUploadMeta(item: UserRecentUploadItem): string {
  const size = formatFileSize(item.fileSizeBytes);
  const uploadedAt = formatDateTime(item.createdAt);
  return `${size} · ${uploadedAt}`;
}

const RecentUploads = ({ title }: IRecentUploadsProps) => {
  const { data: items = [], isLoading, isError } = useUserRecentUploads(4);

  const renderItem = (item: UserRecentUploadItem) => {
    const icon = resolveFileTypeIcon(item.fileName ?? item.title, item.mimeType);
    const label = (
      <span className="text-sm font-medium text-mono mb-px">{item.title}</span>
    );

    return (
      <div key={item.id} className="flex items-center gap-3">
        <div className="flex items-center grow gap-2.5">
          <img
            src={toAbsoluteUrl(`/media/file-types/${icon}`)}
            alt=""
            className="size-8 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary truncate"
              >
                {label}
              </a>
            ) : (
              <span className="truncate">{label}</span>
            )}
            <span className="text-xs text-secondary-foreground">
              {formatUploadMeta(item)}
            </span>
          </div>
        </div>
        {item.href ? (
          <DropdownMenu7
            trigger={
              <Button variant="ghost" mode="icon" asChild>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  <EllipsisVertical />
                </a>
              </Button>
            }
          />
        ) : (
          <DropdownMenu7
            trigger={
              <Button variant="ghost" mode="icon" disabled>
                <EllipsisVertical />
              </Button>
            }
          />
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <DropdownMenu4
          trigger={
            <Button variant="ghost" mode="icon">
              <EllipsisVertical />
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-2.5 lg:gap-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Unable to load recent uploads.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files uploaded yet. Add learning materials from Resources.
          </p>
        ) : (
          <div className="grid gap-2.5 lg:gap-5">
            {items.map((item) => renderItem(item))}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button mode="link" underlined="dashed" asChild>
          <Link href="/resources/materials">All files</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export { RecentUploads, type IRecentUploadsProps };
