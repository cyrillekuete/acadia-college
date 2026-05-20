'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ClassPromotionPolicyFormValues } from '@/lib/acadia/class-promotion-policy-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  copyClassPromotionPolicies,
  deleteAutoPromotionDecisionsForClass,
  markAutoDecisionsPolicyStale,
} from '@/lib/supabase/queries/promotion';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

export function useClassPromotionPolicyMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;

  const saveClassPromotionPolicy = useMutation({
    mutationFn: async (values: ClassPromotionPolicyFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from('ClassPromotionPolicy')
        .select('id, autoPromotionEnabled, minPromotionAverage')
        .eq('tenantId', tenantId)
        .eq('classId', values.classId)
        .eq('academicYearId', values.academicYearId)
        .maybeSingle();

      const row = {
        id: (existing?.id as string | undefined) ?? generateAcadiaId('cppol'),
        tenantId,
        classId: values.classId,
        academicYearId: values.academicYearId,
        autoPromotionEnabled: values.autoPromotionEnabled,
        minPromotionAverage: values.minPromotionAverage,
        notes: values.notes?.trim() || null,
        updatedAt: now,
        createdAt: now,
      };

      const { error } = await supabase.from('ClassPromotionPolicy').upsert(row, {
        onConflict: 'tenantId,classId,academicYearId',
      });
      if (error) {
        throw error;
      }

      if (existing) {
        if (existing.autoPromotionEnabled && !values.autoPromotionEnabled) {
          await deleteAutoPromotionDecisionsForClass(
            supabase,
            tenantId,
            values.classId,
            values.academicYearId,
          );
        } else if (
          Number(existing.minPromotionAverage) !== values.minPromotionAverage
        ) {
          await markAutoDecisionsPolicyStale(
            supabase,
            tenantId,
            values.classId,
            values.academicYearId,
            now,
          );
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'promotion.policy_saved',
        description: `Promotion policy saved for class.`,
        entityId: values.classId,
        entityType: 'Class',
        meta: {
          academicYearId: values.academicYearId,
          minPromotionAverage: values.minPromotionAverage,
          autoPromotionEnabled: values.autoPromotionEnabled,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['class-promotion-policies'] });
      void queryClient.invalidateQueries({ queryKey: ['promotion-decisions'] });
      toast.success('Promotion policy saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const copyPoliciesFromPriorYear = useMutation({
    mutationFn: async (input: { fromYearId: string; toYearId: string }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const result = await copyClassPromotionPolicies(
        supabase,
        tenantId,
        input.fromYearId,
        input.toYearId,
        userId,
      );

      await appendSystemLog(supabase, {
        userId,
        event: 'promotion.policies_copied',
        description: `Copied ${result.copied} promotion policies (${result.skipped} skipped).`,
        entityId: input.toYearId,
        entityType: 'AcademicYear',
        meta: result,
      });

      return result;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['class-promotion-policies'] });
      toast.success(
        `Copied ${result.copied} policies. ${result.skipped} already existed.`,
      );
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return { saveClassPromotionPolicy, copyPoliciesFromPriorYear };
}
