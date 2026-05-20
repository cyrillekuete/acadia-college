'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  buildLearningMaterialStorageKey,
  resolveAllocationStatus,
} from '@/lib/acadia/resources';
import type {
  LearningMaterialFormValues,
  ResourceAllocationFormValues,
  ResourceRequestFormValues,
  ResourceRequestReviewValues,
  ResourceUsageLogFormValues,
  RoomMaintenanceFormValues,
  SchoolResourceFormValues,
} from '@/lib/acadia/resources-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { LEARNING_MATERIALS_BUCKET } from '@/lib/supabase/storage';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateResourceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
  void queryClient.invalidateQueries({ queryKey: ['school-resources'] });
  void queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
  void queryClient.invalidateQueries({ queryKey: ['resource-usage'] });
  void queryClient.invalidateQueries({ queryKey: ['resource-requests'] });
  void queryClient.invalidateQueries({ queryKey: ['room-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['room-usage'] });
  void queryClient.invalidateQueries({ queryKey: ['room-maintenance'] });
}

export function useResourceMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;

  const uploadLearningMaterial = useMutation({
    mutationFn: async (input: {
      values: LearningMaterialFormValues;
      file?: File | null;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('lm');
      let storageKey: string | null = null;
      let fileSizeBytes: number | null = null;
      let mimeType: string | null = null;

      if (input.file) {
        storageKey = buildLearningMaterialStorageKey(
          tenantId,
          id,
          input.file.name,
        );
        const { error: uploadError } = await supabase.storage
          .from(LEARNING_MATERIALS_BUCKET)
          .upload(storageKey, input.file, {
            upsert: true,
            contentType: input.file.type,
          });
        if (uploadError) {
          throw uploadError;
        }
        fileSizeBytes = input.file.size;
        mimeType = input.file.type || null;
      }

      const { error } = await supabase.from('LearningMaterial').insert({
        id,
        tenantId,
        titleEn: input.values.titleEn,
        titleFr: input.values.titleFr,
        descriptionEn: input.values.descriptionEn || null,
        descriptionFr: input.values.descriptionFr || null,
        kind: input.values.kind,
        subjectId: input.values.subjectId || null,
        storageKey,
        externalUrl: input.values.externalUrl || null,
        fileSizeBytes,
        mimeType,
        isPublished: input.values.isPublished,
        uploadedByUserId: userId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'learning_material.uploaded',
        entityType: 'LearningMaterial',
        entityId: id,
        description: `Uploaded learning material ${input.values.titleEn}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Learning material saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createSchoolResource = useMutation({
    mutationFn: async (values: SchoolResourceFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('res');
      const { error } = await supabase.from('SchoolResource').insert({
        id,
        tenantId,
        code: values.code,
        nameEn: values.nameEn,
        nameFr: values.nameFr,
        resourceType: values.resourceType,
        totalQuantity: values.totalQuantity,
        location: values.location || null,
        isActive: values.isActive,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'school_resource.created',
        entityType: 'SchoolResource',
        entityId: id,
        description: `Created resource ${values.code}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Resource added to inventory.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveAllocation = useMutation({
    mutationFn: async (values: ResourceAllocationFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('alloc');
      const status = resolveAllocationStatus({
        status: 'ACTIVE',
        quantity: values.quantity,
        expectedReturnOn: values.expectedReturnOn || null,
      });
      const { error } = await supabase.from('ResourceAllocation').insert({
        id,
        tenantId,
        resourceId: values.resourceId,
        allocatedToUserId: values.allocatedToUserId,
        quantity: values.quantity,
        allocatedOn: values.allocatedOn,
        expectedReturnOn: values.expectedReturnOn || null,
        status,
        notes: values.notes || null,
        createdByUserId: userId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'resource.allocation_saved',
        entityType: 'ResourceAllocation',
        entityId: id,
        description: `Allocated resource ${values.resourceId}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Allocation recorded.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const returnAllocation = useMutation({
    mutationFn: async (allocationId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('ResourceAllocation')
        .update({
          status: 'RETURNED',
          returnedAt: nowIso,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', allocationId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Resource marked as returned.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const logResourceUsage = useMutation({
    mutationFn: async (values: ResourceUsageLogFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const id = generateAcadiaId('usg');
      const { error } = await supabase.from('ResourceUsageLog').insert({
        id,
        tenantId,
        resourceId: values.resourceId,
        userId: values.userId,
        usedOn: values.usedOn,
        quantity: values.quantity,
        purpose: values.purpose || null,
        createdAt: new Date().toISOString(),
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'resource.usage_logged',
        entityType: 'ResourceUsageLog',
        entityId: id,
        description: `Logged usage for resource ${values.resourceId}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Usage logged.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const submitResourceRequest = useMutation({
    mutationFn: async (values: ResourceRequestFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('req');
      const { error } = await supabase.from('ResourceRequest').insert({
        id,
        tenantId,
        resourceId: values.resourceId,
        requestedByUserId: userId,
        quantity: values.quantity,
        purpose: values.purpose,
        status: 'PENDING',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'resource.request_submitted',
        entityType: 'ResourceRequest',
        entityId: id,
        description: `Submitted resource request ${id}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Request submitted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const reviewResourceRequest = useMutation({
    mutationFn: async (input: {
      requestId: string;
      values: ResourceRequestReviewValues;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('ResourceRequest')
        .update({
          status: input.values.status,
          reviewNotes: input.values.reviewNotes || null,
          reviewedByUserId: userId,
          reviewedAt: nowIso,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', input.requestId);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'resource.request_reviewed',
        entityType: 'ResourceRequest',
        entityId: input.requestId,
        description: `Resource request ${input.values.status}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Request updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const scheduleRoomMaintenance = useMutation({
    mutationFn: async (values: RoomMaintenanceFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('maint');
      const { error } = await supabase.from('RoomMaintenanceSchedule').insert({
        id,
        tenantId,
        roomId: values.roomId,
        title: values.title,
        description: values.description || null,
        scheduledOn: values.scheduledOn,
        status: values.status,
        completedAt: values.status === 'COMPLETED' ? nowIso : null,
        createdByUserId: userId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'room.maintenance_scheduled',
        entityType: 'RoomMaintenanceSchedule',
        entityId: id,
        description: `Scheduled maintenance: ${values.title}`,
      });
    },
    onSuccess: () => {
      invalidateResourceQueries(queryClient);
      toast.success('Maintenance scheduled.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    uploadLearningMaterial,
    createSchoolResource,
    saveAllocation,
    returnAllocation,
    logResourceUsage,
    submitResourceRequest,
    reviewResourceRequest,
    scheduleRoomMaintenance,
  };
}
