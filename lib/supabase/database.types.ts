export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      AcademicCalendarMilestone: {
        Row: {
          academicYearId: string
          createdAt: string
          id: string
          kind: Database["public"]["Enums"]["AcademicCalendarMilestoneKind"]
          labelEn: string | null
          labelFr: string | null
          onDate: string
          tenantId: string
          termId: string | null
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          id: string
          kind: Database["public"]["Enums"]["AcademicCalendarMilestoneKind"]
          labelEn?: string | null
          labelFr?: string | null
          onDate: string
          tenantId: string
          termId?: string | null
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          id?: string
          kind?: Database["public"]["Enums"]["AcademicCalendarMilestoneKind"]
          labelEn?: string | null
          labelFr?: string | null
          onDate?: string
          tenantId?: string
          termId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "AcademicCalendarMilestone_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "AcademicCalendarMilestone_semesterId_tenantId_fkey"
            columns: ["termId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Term"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "AcademicCalendarMilestone_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      AcademicSequence: {
        Row: {
          academicYearId: string
          createdAt: string
          id: string
          number: number
          numberInTerm: number
          tenantId: string
          termId: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          id: string
          number: number
          numberInTerm: number
          tenantId: string
          termId: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          id?: string
          number?: number
          numberInTerm?: number
          tenantId?: string
          termId?: string
        }
        Relationships: [
          {
            foreignKeyName: "AcademicSequence_academicYearId_fkey"
            columns: ["academicYearId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AcademicSequence_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AcademicSequence_termId_fkey"
            columns: ["termId"]
            isOneToOne: false
            referencedRelation: "Term"
            referencedColumns: ["id"]
          },
        ]
      }
      AcademicYear: {
        Row: {
          createdAt: string
          endsOn: string
          enrollmentClosesAt: string | null
          enrollmentOpensAt: string | null
          id: string
          isActive: boolean
          isCurrent: boolean
          label: string
          sequencesPerTerm: number
          sequencesPerYear: number
          startsOn: string
          tenantId: string
          termsPerYear: number
          timetablePublishedAt: string | null
          timetablePublishedByUserId: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          endsOn: string
          enrollmentClosesAt?: string | null
          enrollmentOpensAt?: string | null
          id: string
          isActive?: boolean
          isCurrent?: boolean
          label: string
          sequencesPerTerm?: number
          sequencesPerYear?: number
          startsOn: string
          tenantId: string
          termsPerYear?: number
          timetablePublishedAt?: string | null
          timetablePublishedByUserId?: string | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          endsOn?: string
          enrollmentClosesAt?: string | null
          enrollmentOpensAt?: string | null
          id?: string
          isActive?: boolean
          isCurrent?: boolean
          label?: string
          sequencesPerTerm?: number
          sequencesPerYear?: number
          startsOn?: string
          tenantId?: string
          termsPerYear?: number
          timetablePublishedAt?: string | null
          timetablePublishedByUserId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "AcademicYear_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AcademicYear_timetablePublishedByUserId_fkey"
            columns: ["timetablePublishedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Account: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id: string
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Account_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AttendanceRecord: {
        Row: {
          attendanceSessionId: string
          createdAt: string
          id: string
          status: Database["public"]["Enums"]["AttendanceRecordStatus"]
          studentProfileId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          attendanceSessionId: string
          createdAt?: string
          id: string
          status?: Database["public"]["Enums"]["AttendanceRecordStatus"]
          studentProfileId: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          attendanceSessionId?: string
          createdAt?: string
          id?: string
          status?: Database["public"]["Enums"]["AttendanceRecordStatus"]
          studentProfileId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "AttendanceRecord_attendanceSessionId_tenantId_fkey"
            columns: ["attendanceSessionId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AttendanceSession"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "AttendanceRecord_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "AttendanceRecord_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      AttendanceSession: {
        Row: {
          academicYearId: string
          createdAt: string
          createdByUserId: string | null
          id: string
          label: string | null
          sessionDate: string
          subjectId: string
          tenantId: string
          timetableSlotId: string | null
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          createdByUserId?: string | null
          id: string
          label?: string | null
          sessionDate: string
          subjectId: string
          tenantId: string
          timetableSlotId?: string | null
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          createdByUserId?: string | null
          id?: string
          label?: string | null
          sessionDate?: string
          subjectId?: string
          tenantId?: string
          timetableSlotId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "AttendanceSession_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "AttendanceSession_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AttendanceSession_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "AttendanceSession_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AttendanceSession_timetableSlotId_tenantId_fkey"
            columns: ["timetableSlotId", "tenantId"]
            isOneToOne: false
            referencedRelation: "TimetableSlot"
            referencedColumns: ["id", "tenantId"]
          },
        ]
      }
      Class: {
        Row: {
          branch: Database["public"]["Enums"]["AcademicBranch"]
          createdAt: string
          id: string
          levelId: string
          name: string
          specialtyId: string | null
          staffProfileId: string | null
          status: Database["public"]["Enums"]["ClassStatus"]
          subSystem: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId: string
          updatedAt: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["AcademicBranch"]
          createdAt?: string
          id: string
          levelId: string
          name: string
          specialtyId?: string | null
          staffProfileId?: string | null
          status?: Database["public"]["Enums"]["ClassStatus"]
          subSystem: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId: string
          updatedAt?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["AcademicBranch"]
          createdAt?: string
          id?: string
          levelId?: string
          name?: string
          specialtyId?: string | null
          staffProfileId?: string | null
          status?: Database["public"]["Enums"]["ClassStatus"]
          subSystem?: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Class_levelId_tenantId_fkey"
            columns: ["tenantId", "levelId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "Class_specialtyId_tenantId_fkey"
            columns: ["tenantId", "specialtyId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "Class_staffProfileId_tenantId_fkey"
            columns: ["tenantId", "staffProfileId"]
            isOneToOne: false
            referencedRelation: "StaffProfile"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "Class_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          student_id: string
        }
        Insert: {
          class_id: string
          student_id: string
        }
        Update: {
          class_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          capacity: number | null
          class_level: string | null
          class_name: string | null
          class_teacher_id: string | null
          created_at: string
          current_enrollment: number | null
          id: string
          level: string | null
          name: string
          schedule: string | null
          section: string | null
          status: string | null
          stream: string | null
          student_count: number | null
          subject: string | null
          subsystem: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          capacity?: number | null
          class_level?: string | null
          class_name?: string | null
          class_teacher_id?: string | null
          created_at?: string
          current_enrollment?: number | null
          id?: string
          level?: string | null
          name: string
          schedule?: string | null
          section?: string | null
          status?: string | null
          stream?: string | null
          student_count?: number | null
          subject?: string | null
          subsystem?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          capacity?: number | null
          class_level?: string | null
          class_name?: string | null
          class_teacher_id?: string | null
          created_at?: string
          current_enrollment?: number | null
          id?: string
          level?: string | null
          name?: string
          schedule?: string | null
          section?: string | null
          status?: string | null
          stream?: string | null
          student_count?: number | null
          subject?: string | null
          subsystem?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      ClassSubject: {
        Row: {
          classId: string
          createdAt: string
          id: string
          subjectId: string
          tenantId: string
        }
        Insert: {
          classId: string
          createdAt?: string
          id: string
          subjectId: string
          tenantId: string
        }
        Update: {
          classId?: string
          createdAt?: string
          id?: string
          subjectId?: string
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ClassSubject_classId_tenantId_fkey"
            columns: ["tenantId", "classId"]
            isOneToOne: false
            referencedRelation: "Class"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "ClassSubject_subjectId_tenantId_fkey"
            columns: ["tenantId", "subjectId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "ClassSubject_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      CourseworkSubmission: {
        Row: {
          confirmedAt: string | null
          confirmedByUserId: string | null
          confirmedScore: number | null
          createdAt: string
          fileSize: number | null
          fileStorageKey: string | null
          id: string
          mimeType: string | null
          originalFileName: string | null
          status: Database["public"]["Enums"]["CourseworkSubmissionStatus"]
          studentProfileId: string
          submittedAt: string | null
          taskId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          confirmedAt?: string | null
          confirmedByUserId?: string | null
          confirmedScore?: number | null
          createdAt?: string
          fileSize?: number | null
          fileStorageKey?: string | null
          id: string
          mimeType?: string | null
          originalFileName?: string | null
          status?: Database["public"]["Enums"]["CourseworkSubmissionStatus"]
          studentProfileId: string
          submittedAt?: string | null
          taskId: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          confirmedAt?: string | null
          confirmedByUserId?: string | null
          confirmedScore?: number | null
          createdAt?: string
          fileSize?: number | null
          fileStorageKey?: string | null
          id?: string
          mimeType?: string | null
          originalFileName?: string | null
          status?: Database["public"]["Enums"]["CourseworkSubmissionStatus"]
          studentProfileId?: string
          submittedAt?: string | null
          taskId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CourseworkSubmission_confirmedByUserId_fkey"
            columns: ["confirmedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CourseworkSubmission_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "CourseworkSubmission_taskId_tenantId_fkey"
            columns: ["taskId", "tenantId"]
            isOneToOne: false
            referencedRelation: "CourseworkTask"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "CourseworkSubmission_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      CourseworkTask: {
        Row: {
          academicYearId: string
          createdAt: string
          descriptionEn: string | null
          descriptionFr: string | null
          dueAt: string
          id: string
          isPublished: boolean
          maxScore: number
          subjectId: string
          tenantId: string
          titleEn: string
          titleFr: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          descriptionEn?: string | null
          descriptionFr?: string | null
          dueAt: string
          id: string
          isPublished?: boolean
          maxScore: number
          subjectId: string
          tenantId: string
          titleEn: string
          titleFr: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          descriptionEn?: string | null
          descriptionFr?: string | null
          dueAt?: string
          id?: string
          isPublished?: boolean
          maxScore?: number
          subjectId?: string
          tenantId?: string
          titleEn?: string
          titleFr?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CourseworkTask_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "CourseworkTask_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "CourseworkTask_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      DataExportJob: {
        Row: {
          artifactStorageKey: string | null
          completedAt: string | null
          createdAt: string
          createdByUserId: string
          errorMessage: string | null
          format: string
          id: string
          status: Database["public"]["Enums"]["DataExportJobStatus"]
          tenantId: string
        }
        Insert: {
          artifactStorageKey?: string | null
          completedAt?: string | null
          createdAt?: string
          createdByUserId: string
          errorMessage?: string | null
          format?: string
          id: string
          status?: Database["public"]["Enums"]["DataExportJobStatus"]
          tenantId: string
        }
        Update: {
          artifactStorageKey?: string | null
          completedAt?: string | null
          createdAt?: string
          createdByUserId?: string
          errorMessage?: string | null
          format?: string
          id?: string
          status?: Database["public"]["Enums"]["DataExportJobStatus"]
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DataExportJob_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DataExportJob_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Department: {
        Row: {
          code: string
          createdAt: string
          id: string
          isPublished: boolean
          nameEn: string
          nameFr: string
          publishedAt: string | null
          tenantId: string
          updatedAt: string
        }
        Insert: {
          code: string
          createdAt?: string
          id: string
          isPublished?: boolean
          nameEn: string
          nameFr: string
          publishedAt?: string | null
          tenantId: string
          updatedAt: string
        }
        Update: {
          code?: string
          createdAt?: string
          id?: string
          isPublished?: boolean
          nameEn?: string
          nameFr?: string
          publishedAt?: string | null
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Department_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      EnrollmentApplication: {
        Row: {
          academicYearId: string
          branch: Database["public"]["Enums"]["AcademicBranch"] | null
          createdAt: string
          dateOfBirth: string | null
          documentStorageKeys: string[] | null
          email: string
          firstNameEn: string
          firstNameFr: string | null
          id: string
          kind: Database["public"]["Enums"]["EnrollmentApplicationKind"]
          lastNameEn: string
          lastNameFr: string | null
          levelId: string
          phone: string | null
          preferredLocale: string
          rejectionReason: string | null
          reviewedAt: string | null
          reviewedByUserId: string | null
          specialtyId: string
          status: Database["public"]["Enums"]["EnrollmentApplicationStatus"]
          studentProfileId: string | null
          subSystem: Database["public"]["Enums"]["AcademicSubSystem"] | null
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          branch?: Database["public"]["Enums"]["AcademicBranch"] | null
          createdAt?: string
          dateOfBirth?: string | null
          documentStorageKeys?: string[] | null
          email: string
          firstNameEn: string
          firstNameFr?: string | null
          id: string
          kind?: Database["public"]["Enums"]["EnrollmentApplicationKind"]
          lastNameEn: string
          lastNameFr?: string | null
          levelId: string
          phone?: string | null
          preferredLocale?: string
          rejectionReason?: string | null
          reviewedAt?: string | null
          reviewedByUserId?: string | null
          specialtyId: string
          status?: Database["public"]["Enums"]["EnrollmentApplicationStatus"]
          studentProfileId?: string | null
          subSystem?: Database["public"]["Enums"]["AcademicSubSystem"] | null
          tenantId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          branch?: Database["public"]["Enums"]["AcademicBranch"] | null
          createdAt?: string
          dateOfBirth?: string | null
          documentStorageKeys?: string[] | null
          email?: string
          firstNameEn?: string
          firstNameFr?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["EnrollmentApplicationKind"]
          lastNameEn?: string
          lastNameFr?: string | null
          levelId?: string
          phone?: string | null
          preferredLocale?: string
          rejectionReason?: string | null
          reviewedAt?: string | null
          reviewedByUserId?: string | null
          specialtyId?: string
          status?: Database["public"]["Enums"]["EnrollmentApplicationStatus"]
          studentProfileId?: string | null
          subSystem?: Database["public"]["Enums"]["AcademicSubSystem"] | null
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "EnrollmentApplication_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "EnrollmentApplication_levelId_tenantId_fkey"
            columns: ["levelId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "EnrollmentApplication_reviewedByUserId_fkey"
            columns: ["reviewedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EnrollmentApplication_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "EnrollmentApplication_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "EnrollmentApplication_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      ExamSession: {
        Row: {
          academicYearId: string
          createdAt: string
          endsOn: string
          finalizedAt: string | null
          id: string
          sequenceId: string | null
          startsOn: string
          subjectId: string
          tenantId: string
          termId: string
          type: Database["public"]["Enums"]["ExamSessionType"]
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          endsOn: string
          finalizedAt?: string | null
          id: string
          sequenceId?: string | null
          startsOn: string
          subjectId: string
          tenantId: string
          termId: string
          type?: Database["public"]["Enums"]["ExamSessionType"]
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          endsOn?: string
          finalizedAt?: string | null
          id?: string
          sequenceId?: string | null
          startsOn?: string
          subjectId?: string
          tenantId?: string
          termId?: string
          type?: Database["public"]["Enums"]["ExamSessionType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ExamSession_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "ExamSession_semesterId_tenantId_fkey"
            columns: ["termId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Term"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "ExamSession_sequenceId_fkey"
            columns: ["sequenceId"]
            isOneToOne: false
            referencedRelation: "AcademicSequence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ExamSession_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "ExamSession_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      FinanceBudgetLine: {
        Row: {
          academicYearId: string
          budgetedMinor: number
          category: string
          createdAt: string
          currency: string
          id: string
          notes: string | null
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          budgetedMinor: number
          category: string
          createdAt?: string
          currency?: string
          id: string
          notes?: string | null
          tenantId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          budgetedMinor?: number
          category?: string
          createdAt?: string
          currency?: string
          id?: string
          notes?: string | null
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "FinanceBudgetLine_academicYearId_tenantId_fkey"
            columns: ["tenantId", "academicYearId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "FinanceBudgetLine_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      FinanceLedgerEntry: {
        Row: {
          academicYearId: string
          amountMinor: number
          category: string
          createdAt: string
          createdByUserId: string | null
          currency: string
          description: string | null
          entryType: Database["public"]["Enums"]["FinanceLedgerEntryType"]
          id: string
          occurredOn: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          amountMinor: number
          category: string
          createdAt?: string
          createdByUserId?: string | null
          currency?: string
          description?: string | null
          entryType: Database["public"]["Enums"]["FinanceLedgerEntryType"]
          id: string
          occurredOn: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          amountMinor?: number
          category?: string
          createdAt?: string
          createdByUserId?: string | null
          currency?: string
          description?: string | null
          entryType?: Database["public"]["Enums"]["FinanceLedgerEntryType"]
          id?: string
          occurredOn?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "FinanceLedgerEntry_academicYearId_tenantId_fkey"
            columns: ["tenantId", "academicYearId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "FinanceLedgerEntry_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FinanceLedgerEntry_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      GuardianStudentLink: {
        Row: {
          consentGrantedAt: string | null
          consentRevokedAt: string | null
          createdAt: string
          guardianUserId: string
          id: string
          relationshipLabel: string | null
          studentProfileId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          consentGrantedAt?: string | null
          consentRevokedAt?: string | null
          createdAt?: string
          guardianUserId: string
          id: string
          relationshipLabel?: string | null
          studentProfileId: string
          tenantId: string
          updatedAt?: string
        }
        Update: {
          consentGrantedAt?: string | null
          consentRevokedAt?: string | null
          createdAt?: string
          guardianUserId?: string
          id?: string
          relationshipLabel?: string | null
          studentProfileId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "GuardianStudentLink_guardianUserId_fkey"
            columns: ["guardianUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "GuardianStudentLink_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "GuardianStudentLink_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      LearningMaterial: {
        Row: {
          createdAt: string
          descriptionEn: string | null
          descriptionFr: string | null
          externalUrl: string | null
          fileSizeBytes: number | null
          id: string
          isPublished: boolean
          kind: Database["public"]["Enums"]["LearningMaterialKind"]
          mimeType: string | null
          storageKey: string | null
          subjectId: string | null
          tenantId: string
          titleEn: string
          titleFr: string
          updatedAt: string
          uploadedByUserId: string
        }
        Insert: {
          createdAt?: string
          descriptionEn?: string | null
          descriptionFr?: string | null
          externalUrl?: string | null
          fileSizeBytes?: number | null
          id: string
          isPublished?: boolean
          kind?: Database["public"]["Enums"]["LearningMaterialKind"]
          mimeType?: string | null
          storageKey?: string | null
          subjectId?: string | null
          tenantId: string
          titleEn: string
          titleFr: string
          updatedAt: string
          uploadedByUserId: string
        }
        Update: {
          createdAt?: string
          descriptionEn?: string | null
          descriptionFr?: string | null
          externalUrl?: string | null
          fileSizeBytes?: number | null
          id?: string
          isPublished?: boolean
          kind?: Database["public"]["Enums"]["LearningMaterialKind"]
          mimeType?: string | null
          storageKey?: string | null
          subjectId?: string | null
          tenantId?: string
          titleEn?: string
          titleFr?: string
          updatedAt?: string
          uploadedByUserId?: string
        }
        Relationships: [
          {
            foreignKeyName: "LearningMaterial_subjectId_fkey"
            columns: ["subjectId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LearningMaterial_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LearningMaterial_uploadedByUserId_fkey"
            columns: ["uploadedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Level: {
        Row: {
          branch: Database["public"]["Enums"]["AcademicBranch"]
          createdAt: string
          id: string
          labelEn: string | null
          labelFr: string | null
          name: string
          number: number
          sortOrder: number | null
          subSystem: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["AcademicBranch"]
          createdAt?: string
          id: string
          labelEn?: string | null
          labelFr?: string | null
          name: string
          number: number
          sortOrder?: number | null
          subSystem: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["AcademicBranch"]
          createdAt?: string
          id?: string
          labelEn?: string | null
          labelFr?: string | null
          name?: string
          number?: number
          sortOrder?: number | null
          subSystem?: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Level_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_info: {
        Row: {
          allergies: string | null
          blood_group: string | null
          created_at: string
          id: string
          medical_conditions: string | null
          student_id: string
        }
        Insert: {
          allergies?: string | null
          blood_group?: string | null
          created_at?: string
          id?: string
          medical_conditions?: string | null
          student_id: string
        }
        Update: {
          allergies?: string | null
          blood_group?: string | null
          created_at?: string
          id?: string
          medical_conditions?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_info_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          body: string
          createdAt: string
          id: string
          senderUserId: string
          tenantId: string
          threadId: string
        }
        Insert: {
          body: string
          createdAt?: string
          id: string
          senderUserId: string
          tenantId: string
          threadId: string
        }
        Update: {
          body?: string
          createdAt?: string
          id?: string
          senderUserId?: string
          tenantId?: string
          threadId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_senderUserId_fkey"
            columns: ["senderUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_threadId_tenantId_fkey"
            columns: ["threadId", "tenantId"]
            isOneToOne: false
            referencedRelation: "MessageThread"
            referencedColumns: ["id", "tenantId"]
          },
        ]
      }
      MessageThread: {
        Row: {
          createdAt: string
          createdByUserId: string
          groupScope: Database["public"]["Enums"]["MessageGroupScope"] | null
          groupScopeId: string | null
          id: string
          kind: Database["public"]["Enums"]["MessageThreadKind"]
          subjectEn: string | null
          subjectFr: string | null
          tenantId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          createdByUserId: string
          groupScope?: Database["public"]["Enums"]["MessageGroupScope"] | null
          groupScopeId?: string | null
          id: string
          kind: Database["public"]["Enums"]["MessageThreadKind"]
          subjectEn?: string | null
          subjectFr?: string | null
          tenantId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          createdByUserId?: string
          groupScope?: Database["public"]["Enums"]["MessageGroupScope"] | null
          groupScopeId?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["MessageThreadKind"]
          subjectEn?: string | null
          subjectFr?: string | null
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "MessageThread_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MessageThread_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      MessageThreadMember: {
        Row: {
          id: string
          joinedAt: string
          lastReadAt: string | null
          tenantId: string
          threadId: string
          userId: string
        }
        Insert: {
          id: string
          joinedAt?: string
          lastReadAt?: string | null
          tenantId: string
          threadId: string
          userId: string
        }
        Update: {
          id?: string
          joinedAt?: string
          lastReadAt?: string | null
          tenantId?: string
          threadId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MessageThreadMember_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MessageThreadMember_threadId_tenantId_fkey"
            columns: ["threadId", "tenantId"]
            isOneToOne: false
            referencedRelation: "MessageThread"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "MessageThreadMember_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Notification: {
        Row: {
          bodyEn: string | null
          bodyFr: string | null
          createdAt: string
          data: Json | null
          event: string
          id: string
          readAt: string | null
          tenantId: string
          titleEn: string
          titleFr: string
          userId: string
        }
        Insert: {
          bodyEn?: string | null
          bodyFr?: string | null
          createdAt?: string
          data?: Json | null
          event: string
          id: string
          readAt?: string | null
          tenantId: string
          titleEn: string
          titleFr: string
          userId: string
        }
        Update: {
          bodyEn?: string | null
          bodyFr?: string | null
          createdAt?: string
          data?: Json | null
          event?: string
          id?: string
          readAt?: string | null
          tenantId?: string
          titleEn?: string
          titleFr?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      NotificationPreference: {
        Row: {
          createdAt: string
          email: boolean
          event: string
          id: string
          inApp: boolean
          tenantId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          email?: boolean
          event: string
          id: string
          inApp?: boolean
          tenantId: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          email?: boolean
          event?: string
          id?: string
          inApp?: boolean
          tenantId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "NotificationPreference_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "NotificationPreference_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          occupation: string | null
          parent_code: string
          phone: string | null
          relationship: string | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          occupation?: string | null
          parent_code: string
          phone?: string | null
          relationship?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          occupation?: string | null
          parent_code?: string
          phone?: string | null
          relationship?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      ResourceAllocation: {
        Row: {
          allocatedOn: string
          allocatedToUserId: string
          createdAt: string
          createdByUserId: string
          expectedReturnOn: string | null
          id: string
          notes: string | null
          quantity: number
          resourceId: string
          returnedAt: string | null
          status: Database["public"]["Enums"]["ResourceAllocationStatus"]
          tenantId: string
          updatedAt: string
        }
        Insert: {
          allocatedOn: string
          allocatedToUserId: string
          createdAt?: string
          createdByUserId: string
          expectedReturnOn?: string | null
          id: string
          notes?: string | null
          quantity?: number
          resourceId: string
          returnedAt?: string | null
          status?: Database["public"]["Enums"]["ResourceAllocationStatus"]
          tenantId: string
          updatedAt: string
        }
        Update: {
          allocatedOn?: string
          allocatedToUserId?: string
          createdAt?: string
          createdByUserId?: string
          expectedReturnOn?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          resourceId?: string
          returnedAt?: string | null
          status?: Database["public"]["Enums"]["ResourceAllocationStatus"]
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ResourceAllocation_allocatedToUserId_fkey"
            columns: ["allocatedToUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceAllocation_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceAllocation_resourceId_fkey"
            columns: ["resourceId"]
            isOneToOne: false
            referencedRelation: "SchoolResource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceAllocation_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      ResourceRequest: {
        Row: {
          createdAt: string
          id: string
          purpose: string | null
          quantity: number
          requestedByUserId: string
          resourceId: string
          reviewedAt: string | null
          reviewedByUserId: string | null
          reviewNotes: string | null
          status: Database["public"]["Enums"]["ResourceRequestStatus"]
          tenantId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          purpose?: string | null
          quantity?: number
          requestedByUserId: string
          resourceId: string
          reviewedAt?: string | null
          reviewedByUserId?: string | null
          reviewNotes?: string | null
          status?: Database["public"]["Enums"]["ResourceRequestStatus"]
          tenantId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          purpose?: string | null
          quantity?: number
          requestedByUserId?: string
          resourceId?: string
          reviewedAt?: string | null
          reviewedByUserId?: string | null
          reviewNotes?: string | null
          status?: Database["public"]["Enums"]["ResourceRequestStatus"]
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ResourceRequest_requestedByUserId_fkey"
            columns: ["requestedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceRequest_resourceId_fkey"
            columns: ["resourceId"]
            isOneToOne: false
            referencedRelation: "SchoolResource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceRequest_reviewedByUserId_fkey"
            columns: ["reviewedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceRequest_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      ResourceUsageLog: {
        Row: {
          createdAt: string
          id: string
          purpose: string | null
          quantity: number
          resourceId: string
          tenantId: string
          usedOn: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          purpose?: string | null
          quantity?: number
          resourceId: string
          tenantId: string
          usedOn: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          purpose?: string | null
          quantity?: number
          resourceId?: string
          tenantId?: string
          usedOn?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ResourceUsageLog_resourceId_fkey"
            columns: ["resourceId"]
            isOneToOne: false
            referencedRelation: "SchoolResource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceUsageLog_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResourceUsageLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Room: {
        Row: {
          building: string | null
          capacity: number | null
          code: string
          createdAt: string
          id: string
          isActive: boolean
          nameEn: string
          nameFr: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          building?: string | null
          capacity?: number | null
          code: string
          createdAt?: string
          id: string
          isActive?: boolean
          nameEn: string
          nameFr: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          building?: string | null
          capacity?: number | null
          code?: string
          createdAt?: string
          id?: string
          isActive?: boolean
          nameEn?: string
          nameFr?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Room_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      RoomMaintenanceSchedule: {
        Row: {
          completedAt: string | null
          createdAt: string
          createdByUserId: string
          description: string | null
          id: string
          roomId: string
          scheduledOn: string
          status: Database["public"]["Enums"]["RoomMaintenanceStatus"]
          tenantId: string
          title: string
          updatedAt: string
        }
        Insert: {
          completedAt?: string | null
          createdAt?: string
          createdByUserId: string
          description?: string | null
          id: string
          roomId: string
          scheduledOn: string
          status?: Database["public"]["Enums"]["RoomMaintenanceStatus"]
          tenantId: string
          title: string
          updatedAt: string
        }
        Update: {
          completedAt?: string | null
          createdAt?: string
          createdByUserId?: string
          description?: string | null
          id?: string
          roomId?: string
          scheduledOn?: string
          status?: Database["public"]["Enums"]["RoomMaintenanceStatus"]
          tenantId?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "RoomMaintenanceSchedule_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RoomMaintenanceSchedule_roomId_fkey"
            columns: ["roomId"]
            isOneToOne: false
            referencedRelation: "Room"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RoomMaintenanceSchedule_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      ScholarshipType: {
        Row: {
          createdAt: string
          discountKind: Database["public"]["Enums"]["ScholarshipDiscountKind"]
          fixedAmountMinor: number | null
          id: string
          isActive: boolean
          nameEn: string
          nameFr: string
          percentBps: number | null
          tenantId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          discountKind: Database["public"]["Enums"]["ScholarshipDiscountKind"]
          fixedAmountMinor?: number | null
          id: string
          isActive?: boolean
          nameEn: string
          nameFr: string
          percentBps?: number | null
          tenantId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          discountKind?: Database["public"]["Enums"]["ScholarshipDiscountKind"]
          fixedAmountMinor?: number | null
          id?: string
          isActive?: boolean
          nameEn?: string
          nameFr?: string
          percentBps?: number | null
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ScholarshipType_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SchoolAnnouncement: {
        Row: {
          audience: Database["public"]["Enums"]["AnnouncementAudience"]
          bodyEn: string | null
          bodyFr: string | null
          createdAt: string
          createdByUserId: string
          eventEndsAt: string | null
          eventLocation: string | null
          eventStartsAt: string | null
          id: string
          kind: Database["public"]["Enums"]["SchoolAnnouncementKind"]
          publishAt: string | null
          publishedAt: string | null
          status: Database["public"]["Enums"]["SchoolAnnouncementStatus"]
          tenantId: string
          titleEn: string
          titleFr: string
          updatedAt: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["AnnouncementAudience"]
          bodyEn?: string | null
          bodyFr?: string | null
          createdAt?: string
          createdByUserId: string
          eventEndsAt?: string | null
          eventLocation?: string | null
          eventStartsAt?: string | null
          id: string
          kind?: Database["public"]["Enums"]["SchoolAnnouncementKind"]
          publishAt?: string | null
          publishedAt?: string | null
          status?: Database["public"]["Enums"]["SchoolAnnouncementStatus"]
          tenantId: string
          titleEn: string
          titleFr: string
          updatedAt: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["AnnouncementAudience"]
          bodyEn?: string | null
          bodyFr?: string | null
          createdAt?: string
          createdByUserId?: string
          eventEndsAt?: string | null
          eventLocation?: string | null
          eventStartsAt?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["SchoolAnnouncementKind"]
          publishAt?: string | null
          publishedAt?: string | null
          status?: Database["public"]["Enums"]["SchoolAnnouncementStatus"]
          tenantId?: string
          titleEn?: string
          titleFr?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SchoolAnnouncement_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SchoolAnnouncement_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SchoolResource: {
        Row: {
          code: string
          createdAt: string
          id: string
          isActive: boolean
          location: string | null
          nameEn: string
          nameFr: string
          resourceType: Database["public"]["Enums"]["SchoolResourceType"]
          tenantId: string
          totalQuantity: number
          updatedAt: string
        }
        Insert: {
          code: string
          createdAt?: string
          id: string
          isActive?: boolean
          location?: string | null
          nameEn: string
          nameFr: string
          resourceType?: Database["public"]["Enums"]["SchoolResourceType"]
          tenantId: string
          totalQuantity?: number
          updatedAt: string
        }
        Update: {
          code?: string
          createdAt?: string
          id?: string
          isActive?: boolean
          location?: string | null
          nameEn?: string
          nameFr?: string
          resourceType?: Database["public"]["Enums"]["SchoolResourceType"]
          tenantId?: string
          totalQuantity?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SchoolResource_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Session: {
        Row: {
          expires: string
          id: string
          sessionToken: string
          userId: string
        }
        Insert: {
          expires: string
          id: string
          sessionToken: string
          userId: string
        }
        Update: {
          expires?: string
          id?: string
          sessionToken?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Session_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Specialty: {
        Row: {
          branch: Database["public"]["Enums"]["AcademicBranch"]
          code: string
          createdAt: string
          customGradingBands: Json | null
          departmentId: string
          durationYears: number
          feeAmountMinor: number
          feeCurrency: string
          gradingLockedAt: string | null
          gradingSystem: Database["public"]["Enums"]["SpecialtyGradingSystem"]
          id: string
          isPublished: boolean
          minimumCreditsToGraduate: number | null
          nameEn: string
          nameFr: string
          publishedAt: string | null
          subSystem: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId: string
          updatedAt: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["AcademicBranch"]
          code: string
          createdAt?: string
          customGradingBands?: Json | null
          departmentId: string
          durationYears: number
          feeAmountMinor?: number
          feeCurrency?: string
          gradingLockedAt?: string | null
          gradingSystem: Database["public"]["Enums"]["SpecialtyGradingSystem"]
          id: string
          isPublished?: boolean
          minimumCreditsToGraduate?: number | null
          nameEn: string
          nameFr: string
          publishedAt?: string | null
          subSystem?: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId: string
          updatedAt: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["AcademicBranch"]
          code?: string
          createdAt?: string
          customGradingBands?: Json | null
          departmentId?: string
          durationYears?: number
          feeAmountMinor?: number
          feeCurrency?: string
          gradingLockedAt?: string | null
          gradingSystem?: Database["public"]["Enums"]["SpecialtyGradingSystem"]
          id?: string
          isPublished?: boolean
          minimumCreditsToGraduate?: number | null
          nameEn?: string
          nameFr?: string
          publishedAt?: string | null
          subSystem?: Database["public"]["Enums"]["AcademicSubSystem"]
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Specialty_departmentId_tenantId_fkey"
            columns: ["departmentId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Department"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Specialty_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SpecialtyFeePlan: {
        Row: {
          createdAt: string
          id: string
          installments: Json
          specialtyId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          installments: Json
          specialtyId: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          installments?: Json
          specialtyId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SpecialtyFeePlan_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SpecialtyFeePlan_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      StaffProfile: {
        Row: {
          bio: string | null
          createdAt: string
          departmentId: string | null
          employmentType: Database["public"]["Enums"]["StaffEmploymentType"]
          hireDate: string | null
          id: string
          isActive: boolean
          officePhone: string | null
          officeRoom: string | null
          staffCode: string | null
          tenantId: string
          title: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          bio?: string | null
          createdAt?: string
          departmentId?: string | null
          employmentType?: Database["public"]["Enums"]["StaffEmploymentType"]
          hireDate?: string | null
          id: string
          isActive?: boolean
          officePhone?: string | null
          officeRoom?: string | null
          staffCode?: string | null
          tenantId: string
          title?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          bio?: string | null
          createdAt?: string
          departmentId?: string | null
          employmentType?: Database["public"]["Enums"]["StaffEmploymentType"]
          hireDate?: string | null
          id?: string
          isActive?: boolean
          officePhone?: string | null
          officeRoom?: string | null
          staffCode?: string | null
          tenantId?: string
          title?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StaffProfile_departmentId_tenantId_fkey"
            columns: ["departmentId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Department"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StaffProfile_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StaffProfile_userId_tenantId_fkey"
            columns: ["userId", "tenantId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id", "tenantId"]
          },
        ]
      }
      StudentEnrollment: {
        Row: {
          academicYearId: string
          applicationId: string | null
          classId: string | null
          createdAt: string
          id: string
          levelId: string
          specialtyId: string
          status: Database["public"]["Enums"]["StudentEnrollmentStatus"]
          studentProfileId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          applicationId?: string | null
          classId?: string | null
          createdAt?: string
          id: string
          levelId: string
          specialtyId: string
          status?: Database["public"]["Enums"]["StudentEnrollmentStatus"]
          studentProfileId: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          applicationId?: string | null
          classId?: string | null
          createdAt?: string
          id?: string
          levelId?: string
          specialtyId?: string
          status?: Database["public"]["Enums"]["StudentEnrollmentStatus"]
          studentProfileId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudentEnrollment_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentEnrollment_applicationId_fkey"
            columns: ["applicationId"]
            isOneToOne: false
            referencedRelation: "EnrollmentApplication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StudentEnrollment_classId_tenantId_fkey"
            columns: ["tenantId", "classId"]
            isOneToOne: false
            referencedRelation: "Class"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "StudentEnrollment_levelId_tenantId_fkey"
            columns: ["levelId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentEnrollment_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentEnrollment_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentEnrollment_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      StudentFeeAccount: {
        Row: {
          academicYearId: string
          createdAt: string
          feeCurrency: string
          id: string
          specialtyId: string
          studentEnrollmentId: string | null
          studentProfileId: string
          tenantId: string
          totalAmountMinor: number
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          feeCurrency: string
          id: string
          specialtyId: string
          studentEnrollmentId?: string | null
          studentProfileId: string
          tenantId: string
          totalAmountMinor: number
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          feeCurrency?: string
          id?: string
          specialtyId?: string
          studentEnrollmentId?: string | null
          studentProfileId?: string
          tenantId?: string
          totalAmountMinor?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudentFeeAccount_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentFeeAccount_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentFeeAccount_studentEnrollmentId_fkey"
            columns: ["studentEnrollmentId"]
            isOneToOne: false
            referencedRelation: "StudentEnrollment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StudentFeeAccount_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentFeeAccount_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      StudentFeeInstallment: {
        Row: {
          amountMinor: number
          createdAt: string
          dueOn: string
          id: string
          installmentNumber: number
          labelEn: string
          labelFr: string
          notes: string | null
          paidAmountMinor: number | null
          paidAt: string | null
          status: Database["public"]["Enums"]["FeeInstallmentStatus"]
          studentFeeAccountId: string
          tenantId: string
          updatedAt: string
          updatedByUserId: string | null
        }
        Insert: {
          amountMinor: number
          createdAt?: string
          dueOn: string
          id: string
          installmentNumber: number
          labelEn: string
          labelFr: string
          notes?: string | null
          paidAmountMinor?: number | null
          paidAt?: string | null
          status?: Database["public"]["Enums"]["FeeInstallmentStatus"]
          studentFeeAccountId: string
          tenantId: string
          updatedAt: string
          updatedByUserId?: string | null
        }
        Update: {
          amountMinor?: number
          createdAt?: string
          dueOn?: string
          id?: string
          installmentNumber?: number
          labelEn?: string
          labelFr?: string
          notes?: string | null
          paidAmountMinor?: number | null
          paidAt?: string | null
          status?: Database["public"]["Enums"]["FeeInstallmentStatus"]
          studentFeeAccountId?: string
          tenantId?: string
          updatedAt?: string
          updatedByUserId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "StudentFeeInstallment_studentFeeAccountId_tenantId_fkey"
            columns: ["studentFeeAccountId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentFeeAccount"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentFeeInstallment_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StudentFeeInstallment_updatedByUserId_fkey"
            columns: ["updatedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StudentProfile: {
        Row: {
          alumniDirectoryOptIn: boolean
          alumniSince: string | null
          createdAt: string
          currentLevelId: string
          id: string
          isActive: boolean
          registrationNumber: string
          specialtyId: string
          tenantId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          alumniDirectoryOptIn?: boolean
          alumniSince?: string | null
          createdAt?: string
          currentLevelId: string
          id: string
          isActive?: boolean
          registrationNumber: string
          specialtyId: string
          tenantId: string
          updatedAt: string
          userId: string
        }
        Update: {
          alumniDirectoryOptIn?: boolean
          alumniSince?: string | null
          createdAt?: string
          currentLevelId?: string
          id?: string
          isActive?: boolean
          registrationNumber?: string
          specialtyId?: string
          tenantId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudentProfile_currentLevelId_tenantId_fkey"
            columns: ["currentLevelId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentProfile_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentProfile_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StudentProfile_userId_tenantId_fkey"
            columns: ["userId", "tenantId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id", "tenantId"]
          },
        ]
      }
      StudentPromotionDecision: {
        Row: {
          academicYearId: string
          appliedAt: string | null
          createdAt: string
          decidedByUserId: string | null
          finalAction: Database["public"]["Enums"]["PromotionAction"]
          fromLevelId: string
          id: string
          notes: string | null
          recommendedAction: Database["public"]["Enums"]["PromotionAction"]
          source: Database["public"]["Enums"]["PromotionDecisionSource"]
          specialtyId: string
          studentProfileId: string
          targetLevelId: string | null
          tenantId: string
          updatedAt: string
          yearAverage: number | null
        }
        Insert: {
          academicYearId: string
          appliedAt?: string | null
          createdAt?: string
          decidedByUserId?: string | null
          finalAction: Database["public"]["Enums"]["PromotionAction"]
          fromLevelId: string
          id: string
          notes?: string | null
          recommendedAction: Database["public"]["Enums"]["PromotionAction"]
          source?: Database["public"]["Enums"]["PromotionDecisionSource"]
          specialtyId: string
          studentProfileId: string
          targetLevelId?: string | null
          tenantId: string
          updatedAt: string
          yearAverage?: number | null
        }
        Update: {
          academicYearId?: string
          appliedAt?: string | null
          createdAt?: string
          decidedByUserId?: string | null
          finalAction?: Database["public"]["Enums"]["PromotionAction"]
          fromLevelId?: string
          id?: string
          notes?: string | null
          recommendedAction?: Database["public"]["Enums"]["PromotionAction"]
          source?: Database["public"]["Enums"]["PromotionDecisionSource"]
          specialtyId?: string
          studentProfileId?: string
          targetLevelId?: string | null
          tenantId?: string
          updatedAt?: string
          yearAverage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "StudentPromotionDecision_academicYearId_tenantId_fkey"
            columns: ["tenantId", "academicYearId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "StudentPromotionDecision_decidedByUserId_fkey"
            columns: ["decidedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StudentPromotionDecision_fromLevelId_tenantId_fkey"
            columns: ["tenantId", "fromLevelId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "StudentPromotionDecision_specialtyId_tenantId_fkey"
            columns: ["tenantId", "specialtyId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "StudentPromotionDecision_studentProfileId_tenantId_fkey"
            columns: ["tenantId", "studentProfileId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "StudentPromotionDecision_targetLevelId_tenantId_fkey"
            columns: ["tenantId", "targetLevelId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["tenantId", "id"]
          },
          {
            foreignKeyName: "StudentPromotionDecision_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year: string | null
          address: string | null
          branch: string | null
          city: string | null
          class: string | null
          class_id: string | null
          class_name: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          enrollment_status: string | null
          fees_status: string | null
          first_name: string
          gender: string | null
          id: string
          is_new_student: boolean | null
          last_name: string
          matricule_number: string | null
          middle_name: string | null
          nationality: string | null
          paid_fees: number | null
          phone: string | null
          place_of_birth: string | null
          previous_class: string | null
          previous_school: string | null
          region: string | null
          religion: string | null
          status: string | null
          student_id: string
          subsystem: string | null
          tenant_id: string
          total_fees: number | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          branch?: string | null
          city?: string | null
          class?: string | null
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          enrollment_status?: string | null
          fees_status?: string | null
          first_name: string
          gender?: string | null
          id?: string
          is_new_student?: boolean | null
          last_name: string
          matricule_number?: string | null
          middle_name?: string | null
          nationality?: string | null
          paid_fees?: number | null
          phone?: string | null
          place_of_birth?: string | null
          previous_class?: string | null
          previous_school?: string | null
          region?: string | null
          religion?: string | null
          status?: string | null
          student_id: string
          subsystem?: string | null
          tenant_id: string
          total_fees?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          branch?: string | null
          city?: string | null
          class?: string | null
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          enrollment_status?: string | null
          fees_status?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_new_student?: boolean | null
          last_name?: string
          matricule_number?: string | null
          middle_name?: string | null
          nationality?: string | null
          paid_fees?: number | null
          phone?: string | null
          place_of_birth?: string | null
          previous_class?: string | null
          previous_school?: string | null
          region?: string | null
          religion?: string | null
          status?: string | null
          student_id?: string
          subsystem?: string | null
          tenant_id?: string
          total_fees?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      StudentScholarship: {
        Row: {
          createdAt: string
          discountMinor: number
          grantedByUserId: string | null
          id: string
          scholarshipTypeId: string
          studentFeeAccountId: string
          tenantId: string
        }
        Insert: {
          createdAt?: string
          discountMinor: number
          grantedByUserId?: string | null
          id: string
          scholarshipTypeId: string
          studentFeeAccountId: string
          tenantId: string
        }
        Update: {
          createdAt?: string
          discountMinor?: number
          grantedByUserId?: string | null
          id?: string
          scholarshipTypeId?: string
          studentFeeAccountId?: string
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudentScholarship_grantedByUserId_fkey"
            columns: ["grantedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StudentScholarship_scholarshipTypeId_tenantId_fkey"
            columns: ["scholarshipTypeId", "tenantId"]
            isOneToOne: false
            referencedRelation: "ScholarshipType"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentScholarship_studentFeeAccountId_tenantId_fkey"
            columns: ["studentFeeAccountId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentFeeAccount"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "StudentScholarship_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Subject: {
        Row: {
          code: string
          coefficient: number
          createdAt: string
          credits: number
          deactivatedAt: string | null
          groupingId: string | null
          hasSubBranches: boolean
          hours: number
          id: string
          levelId: string
          nameEn: string
          nameFr: string
          specialtyId: string
          subjectType: Database["public"]["Enums"]["subject_type"]
          tenantId: string
          termId: string
          updatedAt: string
        }
        Insert: {
          code: string
          coefficient?: number
          createdAt?: string
          credits: number
          deactivatedAt?: string | null
          groupingId?: string | null
          hasSubBranches?: boolean
          hours: number
          id: string
          levelId: string
          nameEn: string
          nameFr: string
          specialtyId: string
          subjectType?: Database["public"]["Enums"]["subject_type"]
          tenantId: string
          termId: string
          updatedAt: string
        }
        Update: {
          code?: string
          coefficient?: number
          createdAt?: string
          credits?: number
          deactivatedAt?: string | null
          groupingId?: string | null
          hasSubBranches?: boolean
          hours?: number
          id?: string
          levelId?: string
          nameEn?: string
          nameFr?: string
          specialtyId?: string
          subjectType?: Database["public"]["Enums"]["subject_type"]
          tenantId?: string
          termId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Subject_groupingId_tenantId_fkey"
            columns: ["groupingId", "tenantId"]
            isOneToOne: false
            referencedRelation: "SubjectGrouping"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Subject_levelId_tenantId_fkey"
            columns: ["levelId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Subject_semesterId_tenantId_fkey"
            columns: ["termId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Term"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Subject_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Subject_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectGrouping: {
        Row: {
          code: string | null
          createdAt: string
          id: string
          nameEn: string
          nameFr: string
          sortOrder: number
          tenantId: string
          updatedAt: string
        }
        Insert: {
          code?: string | null
          createdAt?: string
          id: string
          nameEn: string
          nameFr: string
          sortOrder?: number
          tenantId: string
          updatedAt: string
        }
        Update: {
          code?: string | null
          createdAt?: string
          id?: string
          nameEn?: string
          nameFr?: string
          sortOrder?: number
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectGrouping_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectSubBranch: {
        Row: {
          coefficient: number
          createdAt: string
          id: string
          name: string
          nameFr: string | null
          sortOrder: number
          subjectId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          coefficient?: number
          createdAt?: string
          id: string
          name: string
          nameFr?: string | null
          sortOrder?: number
          subjectId: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          coefficient?: number
          createdAt?: string
          id?: string
          name?: string
          nameFr?: string | null
          sortOrder?: number
          subjectId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectSubBranch_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectSubBranch_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectAssignment: {
        Row: {
          academicYearId: string
          createdAt: string
          id: string
          isLead: boolean
          notes: string | null
          staffProfileId: string
          subjectId: string
          teachesPrimaryHome: boolean
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          id: string
          isLead?: boolean
          notes?: string | null
          staffProfileId: string
          subjectId: string
          teachesPrimaryHome?: boolean
          tenantId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          id?: string
          isLead?: boolean
          notes?: string | null
          staffProfileId?: string
          subjectId?: string
          teachesPrimaryHome?: boolean
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectAssignment_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectAssignment_staffProfileId_tenantId_fkey"
            columns: ["staffProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StaffProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectAssignment_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectAssignment_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectAssignmentOffering: {
        Row: {
          createdAt: string
          id: string
          offeringId: string
          subjectAssignmentId: string
          tenantId: string
        }
        Insert: {
          createdAt?: string
          id: string
          offeringId: string
          subjectAssignmentId: string
          tenantId: string
        }
        Update: {
          createdAt?: string
          id?: string
          offeringId?: string
          subjectAssignmentId?: string
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectAssignmentOffering_offeringId_tenantId_fkey"
            columns: ["offeringId", "tenantId"]
            isOneToOne: false
            referencedRelation: "SubjectSpecialtyOffering"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectAssignmentOffering_subjectAssignmentId_tenantId_fkey"
            columns: ["subjectAssignmentId", "tenantId"]
            isOneToOne: false
            referencedRelation: "SubjectAssignment"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectAssignmentOffering_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectDiscussionPost: {
        Row: {
          authorUserId: string
          body: string
          createdAt: string
          hiddenAt: string | null
          hiddenByUserId: string | null
          id: string
          tenantId: string
          threadId: string
          updatedAt: string
        }
        Insert: {
          authorUserId: string
          body: string
          createdAt?: string
          hiddenAt?: string | null
          hiddenByUserId?: string | null
          id: string
          tenantId: string
          threadId: string
          updatedAt?: string
        }
        Update: {
          authorUserId?: string
          body?: string
          createdAt?: string
          hiddenAt?: string | null
          hiddenByUserId?: string | null
          id?: string
          tenantId?: string
          threadId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectDiscussionPost_authorUserId_fkey"
            columns: ["authorUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SubjectDiscussionPost_hiddenByUserId_fkey"
            columns: ["hiddenByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SubjectDiscussionPost_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SubjectDiscussionPost_threadId_tenantId_fkey"
            columns: ["threadId", "tenantId"]
            isOneToOne: false
            referencedRelation: "SubjectDiscussionThread"
            referencedColumns: ["id", "tenantId"]
          },
        ]
      }
      SubjectDiscussionThread: {
        Row: {
          academicYearId: string
          createdAt: string
          id: string
          locked: boolean
          subjectId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          id: string
          locked?: boolean
          subjectId: string
          tenantId: string
          updatedAt?: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          id?: string
          locked?: boolean
          subjectId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectDiscussionThread_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectDiscussionThread_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectDiscussionThread_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectMark: {
        Row: {
          caScore: number | null
          createdAt: string
          enteredByUserId: string | null
          examScore: number | null
          examSessionId: string
          id: string
          isResitEligible: boolean
          studentProfileId: string
          subjectId: string
          tenantId: string
          totalScore: number | null
          updatedAt: string
        }
        Insert: {
          caScore?: number | null
          createdAt?: string
          enteredByUserId?: string | null
          examScore?: number | null
          examSessionId: string
          id: string
          isResitEligible?: boolean
          studentProfileId: string
          subjectId: string
          tenantId: string
          totalScore?: number | null
          updatedAt: string
        }
        Update: {
          caScore?: number | null
          createdAt?: string
          enteredByUserId?: string | null
          examScore?: number | null
          examSessionId?: string
          id?: string
          isResitEligible?: boolean
          studentProfileId?: string
          subjectId?: string
          tenantId?: string
          totalScore?: number | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectMark_enteredByUserId_fkey"
            columns: ["enteredByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SubjectMark_examSessionId_tenantId_fkey"
            columns: ["examSessionId", "tenantId"]
            isOneToOne: false
            referencedRelation: "ExamSession"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectMark_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectMark_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectMark_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SubjectSpecialtyOffering: {
        Row: {
          createdAt: string
          id: string
          levelId: string
          specialtyId: string
          subjectId: string
          tenantId: string
          termId: string
        }
        Insert: {
          createdAt?: string
          id: string
          levelId: string
          specialtyId: string
          subjectId: string
          tenantId: string
          termId: string
        }
        Update: {
          createdAt?: string
          id?: string
          levelId?: string
          specialtyId?: string
          subjectId?: string
          tenantId?: string
          termId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SubjectSpecialtyOffering_levelId_tenantId_fkey"
            columns: ["levelId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectSpecialtyOffering_semesterId_tenantId_fkey"
            columns: ["termId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Term"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectSpecialtyOffering_specialtyId_tenantId_fkey"
            columns: ["specialtyId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectSpecialtyOffering_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "SubjectSpecialtyOffering_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      SystemLog: {
        Row: {
          createdAt: string
          description: string | null
          entityId: string | null
          entityType: string | null
          event: string | null
          id: string
          ipAddress: string | null
          meta: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          entityId?: string | null
          entityType?: string | null
          event?: string | null
          id: string
          ipAddress?: string | null
          meta?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          entityId?: string | null
          entityType?: string | null
          event?: string | null
          id?: string
          ipAddress?: string | null
          meta?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SystemLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SystemSetting: {
        Row: {
          active: boolean
          address: string | null
          currency: string
          currencyFormat: string
          id: string
          language: string
          logo: string | null
          name: string
          notifyNewOrderEmail: boolean
          notifyNewOrderRoleIds: string[] | null
          notifyNewOrderWeb: boolean
          notifyOrderStatusUpdateEmail: boolean
          notifyOrderStatusUpdateRoleIds: string[] | null
          notifyOrderStatusUpdateWeb: boolean
          notifyPaymentFailureEmail: boolean
          notifyPaymentFailureRoleIds: string[] | null
          notifyPaymentFailureWeb: boolean
          notifyStockEmail: boolean
          notifyStockRoleIds: string[] | null
          notifyStockThreshold: number
          notifyStockWeb: boolean
          notifySystemErrorFailureEmail: boolean
          notifySystemErrorRoleIds: string[] | null
          notifySystemErrorWeb: boolean
          socialFacebook: string | null
          socialInstagram: string | null
          socialLinkedIn: string | null
          socialPinterest: string | null
          socialTwitter: string | null
          socialYoutube: string | null
          supportEmail: string | null
          supportPhone: string | null
          timezone: string
          websiteURL: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          currency?: string
          currencyFormat?: string
          id: string
          language?: string
          logo?: string | null
          name?: string
          notifyNewOrderEmail?: boolean
          notifyNewOrderRoleIds?: string[] | null
          notifyNewOrderWeb?: boolean
          notifyOrderStatusUpdateEmail?: boolean
          notifyOrderStatusUpdateRoleIds?: string[] | null
          notifyOrderStatusUpdateWeb?: boolean
          notifyPaymentFailureEmail?: boolean
          notifyPaymentFailureRoleIds?: string[] | null
          notifyPaymentFailureWeb?: boolean
          notifyStockEmail?: boolean
          notifyStockRoleIds?: string[] | null
          notifyStockThreshold?: number
          notifyStockWeb?: boolean
          notifySystemErrorFailureEmail?: boolean
          notifySystemErrorRoleIds?: string[] | null
          notifySystemErrorWeb?: boolean
          socialFacebook?: string | null
          socialInstagram?: string | null
          socialLinkedIn?: string | null
          socialPinterest?: string | null
          socialTwitter?: string | null
          socialYoutube?: string | null
          supportEmail?: string | null
          supportPhone?: string | null
          timezone?: string
          websiteURL?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          currency?: string
          currencyFormat?: string
          id?: string
          language?: string
          logo?: string | null
          name?: string
          notifyNewOrderEmail?: boolean
          notifyNewOrderRoleIds?: string[] | null
          notifyNewOrderWeb?: boolean
          notifyOrderStatusUpdateEmail?: boolean
          notifyOrderStatusUpdateRoleIds?: string[] | null
          notifyOrderStatusUpdateWeb?: boolean
          notifyPaymentFailureEmail?: boolean
          notifyPaymentFailureRoleIds?: string[] | null
          notifyPaymentFailureWeb?: boolean
          notifyStockEmail?: boolean
          notifyStockRoleIds?: string[] | null
          notifyStockThreshold?: number
          notifyStockWeb?: boolean
          notifySystemErrorFailureEmail?: boolean
          notifySystemErrorRoleIds?: string[] | null
          notifySystemErrorWeb?: boolean
          socialFacebook?: string | null
          socialInstagram?: string | null
          socialLinkedIn?: string | null
          socialPinterest?: string | null
          socialTwitter?: string | null
          socialYoutube?: string | null
          supportEmail?: string | null
          supportPhone?: string | null
          timezone?: string
          websiteURL?: string | null
        }
        Relationships: []
      }
      Tenant: {
        Row: {
          academicYearStartMonth: number | null
          accentColor: string | null
          addressLine1: string | null
          addressLine2: string | null
          archivedAt: string | null
          city: string | null
          country: string | null
          createdAt: string
          customDomain: string | null
          customDomainVerificationToken: string | null
          customDomainVerifiedAt: string | null
          defaultGradingMode: Database["public"]["Enums"]["GradingMode"] | null
          deploymentMode: Database["public"]["Enums"]["DeploymentMode"]
          displayNameEn: string
          displayNameFr: string
          enabledModules: string[]
          id: string
          institutionEmail: string | null
          institutionPhone: string | null
          locale: string
          logoStorageKey: string | null
          markEntryCalendarPolicy: Database["public"]["Enums"]["MarkEntryCalendarPolicy"]
          minimumAttendancePercent: number
          onboardingCompletedAt: string | null
          pdfIssuerDisplayNameEn: string | null
          pdfIssuerDisplayNameFr: string | null
          planSlug: string | null
          primaryColor: string | null
          region: string | null
          secondaryContactEmail: string | null
          secondaryContactName: string | null
          sessionTimeoutMinutes: number
          sessionWarningMinutes: number
          showAttendanceOnTranscript: boolean
          slug: string
          smtpFromEmail: string | null
          smtpHost: string | null
          smtpPassEncrypted: string | null
          smtpPort: number | null
          smtpUser: string | null
          status: Database["public"]["Enums"]["TenantStatus"]
          suspendedAt: string | null
          timezone: string
          updatedAt: string
          usePlatformEmailRelay: boolean
          websiteUrl: string | null
        }
        Insert: {
          academicYearStartMonth?: number | null
          accentColor?: string | null
          addressLine1?: string | null
          addressLine2?: string | null
          archivedAt?: string | null
          city?: string | null
          country?: string | null
          createdAt?: string
          customDomain?: string | null
          customDomainVerificationToken?: string | null
          customDomainVerifiedAt?: string | null
          defaultGradingMode?: Database["public"]["Enums"]["GradingMode"] | null
          deploymentMode?: Database["public"]["Enums"]["DeploymentMode"]
          displayNameEn: string
          displayNameFr: string
          enabledModules?: string[]
          id: string
          institutionEmail?: string | null
          institutionPhone?: string | null
          locale?: string
          logoStorageKey?: string | null
          markEntryCalendarPolicy?: Database["public"]["Enums"]["MarkEntryCalendarPolicy"]
          minimumAttendancePercent?: number
          onboardingCompletedAt?: string | null
          pdfIssuerDisplayNameEn?: string | null
          pdfIssuerDisplayNameFr?: string | null
          planSlug?: string | null
          primaryColor?: string | null
          region?: string | null
          secondaryContactEmail?: string | null
          secondaryContactName?: string | null
          sessionTimeoutMinutes?: number
          sessionWarningMinutes?: number
          showAttendanceOnTranscript?: boolean
          slug: string
          smtpFromEmail?: string | null
          smtpHost?: string | null
          smtpPassEncrypted?: string | null
          smtpPort?: number | null
          smtpUser?: string | null
          status?: Database["public"]["Enums"]["TenantStatus"]
          suspendedAt?: string | null
          timezone?: string
          updatedAt: string
          usePlatformEmailRelay?: boolean
          websiteUrl?: string | null
        }
        Update: {
          academicYearStartMonth?: number | null
          accentColor?: string | null
          addressLine1?: string | null
          addressLine2?: string | null
          archivedAt?: string | null
          city?: string | null
          country?: string | null
          createdAt?: string
          customDomain?: string | null
          customDomainVerificationToken?: string | null
          customDomainVerifiedAt?: string | null
          defaultGradingMode?: Database["public"]["Enums"]["GradingMode"] | null
          deploymentMode?: Database["public"]["Enums"]["DeploymentMode"]
          displayNameEn?: string
          displayNameFr?: string
          enabledModules?: string[]
          id?: string
          institutionEmail?: string | null
          institutionPhone?: string | null
          locale?: string
          logoStorageKey?: string | null
          markEntryCalendarPolicy?: Database["public"]["Enums"]["MarkEntryCalendarPolicy"]
          minimumAttendancePercent?: number
          onboardingCompletedAt?: string | null
          pdfIssuerDisplayNameEn?: string | null
          pdfIssuerDisplayNameFr?: string | null
          planSlug?: string | null
          primaryColor?: string | null
          region?: string | null
          secondaryContactEmail?: string | null
          secondaryContactName?: string | null
          sessionTimeoutMinutes?: number
          sessionWarningMinutes?: number
          showAttendanceOnTranscript?: boolean
          slug?: string
          smtpFromEmail?: string | null
          smtpHost?: string | null
          smtpPassEncrypted?: string | null
          smtpPort?: number | null
          smtpUser?: string | null
          status?: Database["public"]["Enums"]["TenantStatus"]
          suspendedAt?: string | null
          timezone?: string
          updatedAt?: string
          usePlatformEmailRelay?: boolean
          websiteUrl?: string | null
        }
        Relationships: []
      }
      TenantApiKey: {
        Row: {
          createdAt: string
          createdByUserId: string
          expiresAt: string | null
          id: string
          keyHash: string
          keyPrefix: string
          lastUsedAt: string | null
          name: string
          revokedAt: string | null
          scopes: string[]
          tenantId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          createdByUserId: string
          expiresAt?: string | null
          id: string
          keyHash: string
          keyPrefix: string
          lastUsedAt?: string | null
          name: string
          revokedAt?: string | null
          scopes: string[]
          tenantId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          createdByUserId?: string
          expiresAt?: string | null
          id?: string
          keyHash?: string
          keyPrefix?: string
          lastUsedAt?: string | null
          name?: string
          revokedAt?: string | null
          scopes?: string[]
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TenantApiKey_createdByUserId_fkey"
            columns: ["createdByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TenantApiKey_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      TenantDataRetentionPolicy: {
        Row: {
          archiveInactiveAfterYears: number
          enrollmentRetentionYears: number
          lastArchivalRunAt: string | null
          marksRetentionYears: number
          tenantId: string
          updatedAt: string
        }
        Insert: {
          archiveInactiveAfterYears?: number
          enrollmentRetentionYears?: number
          lastArchivalRunAt?: string | null
          marksRetentionYears?: number
          tenantId: string
          updatedAt: string
        }
        Update: {
          archiveInactiveAfterYears?: number
          enrollmentRetentionYears?: number
          lastArchivalRunAt?: string | null
          marksRetentionYears?: number
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TenantDataRetentionPolicy_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: true
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Term: {
        Row: {
          academicYearId: string | null
          createdAt: string
          id: string
          levelId: string | null
          number: number
          tenantId: string
        }
        Insert: {
          academicYearId?: string | null
          createdAt?: string
          id: string
          levelId?: string | null
          number: number
          tenantId: string
        }
        Update: {
          academicYearId?: string | null
          createdAt?: string
          id?: string
          levelId?: string | null
          number?: number
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Semester_levelId_tenantId_fkey"
            columns: ["levelId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Level"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Semester_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Term_academicYearId_fkey"
            columns: ["academicYearId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id"]
          },
        ]
      }
      TimetableSlot: {
        Row: {
          academicYearId: string
          createdAt: string
          dayOfWeek: number
          endMinutes: number
          id: string
          roomId: string
          staffProfileId: string
          startMinutes: number
          subjectId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          dayOfWeek: number
          endMinutes: number
          id: string
          roomId: string
          staffProfileId: string
          startMinutes: number
          subjectId: string
          tenantId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          dayOfWeek?: number
          endMinutes?: number
          id?: string
          roomId?: string
          staffProfileId?: string
          startMinutes?: number
          subjectId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TimetableSlot_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "TimetableSlot_roomId_tenantId_fkey"
            columns: ["roomId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Room"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "TimetableSlot_staffProfileId_tenantId_fkey"
            columns: ["staffProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StaffProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "TimetableSlot_subjectId_tenantId_fkey"
            columns: ["subjectId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Subject"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "TimetableSlot_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Transcript: {
        Row: {
          academicYearId: string
          createdAt: string
          currentVersionId: string | null
          id: string
          studentProfileId: string
          tenantId: string
          termId: string
          updatedAt: string
        }
        Insert: {
          academicYearId: string
          createdAt?: string
          currentVersionId?: string | null
          id: string
          studentProfileId: string
          tenantId: string
          termId: string
          updatedAt: string
        }
        Update: {
          academicYearId?: string
          createdAt?: string
          currentVersionId?: string | null
          id?: string
          studentProfileId?: string
          tenantId?: string
          termId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Transcript_academicYearId_tenantId_fkey"
            columns: ["academicYearId", "tenantId"]
            isOneToOne: false
            referencedRelation: "AcademicYear"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Transcript_currentVersionId_fkey"
            columns: ["currentVersionId"]
            isOneToOne: false
            referencedRelation: "TranscriptVersion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Transcript_semesterId_tenantId_fkey"
            columns: ["termId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Term"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Transcript_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "Transcript_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptCopyRequest: {
        Row: {
          createdAt: string
          id: string
          note: string | null
          requestedByUserId: string
          resolvedAt: string | null
          resolvedByUserId: string | null
          status: Database["public"]["Enums"]["TranscriptCopyRequestStatus"]
          studentProfileId: string
          tenantId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          note?: string | null
          requestedByUserId: string
          resolvedAt?: string | null
          resolvedByUserId?: string | null
          status?: Database["public"]["Enums"]["TranscriptCopyRequestStatus"]
          studentProfileId: string
          tenantId: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          id?: string
          note?: string | null
          requestedByUserId?: string
          resolvedAt?: string | null
          resolvedByUserId?: string | null
          status?: Database["public"]["Enums"]["TranscriptCopyRequestStatus"]
          studentProfileId?: string
          tenantId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptCopyRequest_requestedByUserId_fkey"
            columns: ["requestedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptCopyRequest_resolvedByUserId_fkey"
            columns: ["resolvedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptCopyRequest_studentProfileId_tenantId_fkey"
            columns: ["studentProfileId", "tenantId"]
            isOneToOne: false
            referencedRelation: "StudentProfile"
            referencedColumns: ["id", "tenantId"]
          },
          {
            foreignKeyName: "TranscriptCopyRequest_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptVersion: {
        Row: {
          createdAt: string
          id: string
          issuedAt: string
          issuedByUserId: string | null
          pdfStorageKey: string | null
          qrToken: string
          reissueReason: string | null
          status: Database["public"]["Enums"]["TranscriptVersionStatus"]
          tenantId: string
          transcriptId: string
          versionNumber: number
        }
        Insert: {
          createdAt?: string
          id: string
          issuedAt?: string
          issuedByUserId?: string | null
          pdfStorageKey?: string | null
          qrToken: string
          reissueReason?: string | null
          status?: Database["public"]["Enums"]["TranscriptVersionStatus"]
          tenantId: string
          transcriptId: string
          versionNumber: number
        }
        Update: {
          createdAt?: string
          id?: string
          issuedAt?: string
          issuedByUserId?: string | null
          pdfStorageKey?: string | null
          qrToken?: string
          reissueReason?: string | null
          status?: Database["public"]["Enums"]["TranscriptVersionStatus"]
          tenantId?: string
          transcriptId?: string
          versionNumber?: number
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptVersion_issuedByUserId_fkey"
            columns: ["issuedByUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptVersion_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptVersion_transcriptId_tenantId_fkey"
            columns: ["transcriptId", "tenantId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id", "tenantId"]
          },
        ]
      }
      User: {
        Row: {
          avatar: string | null
          country: string | null
          createdAt: string
          email: string
          emailVerifiedAt: string | null
          id: string
          invitedByUserId: string | null
          isProtected: boolean
          isTrashed: boolean
          lastSignInAt: string | null
          name: string | null
          password: string | null
          roleId: string
          status: Database["public"]["Enums"]["UserStatus"]
          tenantId: string | null
          timezone: string | null
          totpEnabledAt: string | null
          totpLastVerifiedAt: string | null
          totpSecretEncrypted: string | null
          updatedAt: string
        }
        Insert: {
          avatar?: string | null
          country?: string | null
          createdAt?: string
          email: string
          emailVerifiedAt?: string | null
          id: string
          invitedByUserId?: string | null
          isProtected?: boolean
          isTrashed?: boolean
          lastSignInAt?: string | null
          name?: string | null
          password?: string | null
          roleId: string
          status?: Database["public"]["Enums"]["UserStatus"]
          tenantId?: string | null
          timezone?: string | null
          totpEnabledAt?: string | null
          totpLastVerifiedAt?: string | null
          totpSecretEncrypted?: string | null
          updatedAt: string
        }
        Update: {
          avatar?: string | null
          country?: string | null
          createdAt?: string
          email?: string
          emailVerifiedAt?: string | null
          id?: string
          invitedByUserId?: string | null
          isProtected?: boolean
          isTrashed?: boolean
          lastSignInAt?: string | null
          name?: string | null
          password?: string | null
          roleId?: string
          status?: Database["public"]["Enums"]["UserStatus"]
          tenantId?: string | null
          timezone?: string | null
          totpEnabledAt?: string | null
          totpLastVerifiedAt?: string | null
          totpSecretEncrypted?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_roleId_fkey"
            columns: ["roleId"]
            isOneToOne: false
            referencedRelation: "UserRole"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "User_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          allergies: string | null
          blood_group: string | null
          branch: string | null
          class_name: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          medical_conditions: string | null
          occupation: string | null
          relationship: string | null
          role_specific_id: string | null
          subsystem: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          blood_group?: string | null
          branch?: string | null
          class_name?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          medical_conditions?: string | null
          occupation?: string | null
          relationship?: string | null
          role_specific_id?: string | null
          subsystem?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          blood_group?: string | null
          branch?: string | null
          class_name?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          medical_conditions?: string | null
          occupation?: string | null
          relationship?: string | null
          role_specific_id?: string | null
          subsystem?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      UserPermission: {
        Row: {
          createdAt: string
          createdByUserId: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          createdAt?: string
          createdByUserId?: string | null
          description?: string | null
          id: string
          name: string
          slug: string
        }
        Update: {
          createdAt?: string
          createdByUserId?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      UserRole: {
        Row: {
          createdAt: string
          createdByUserId: string | null
          description: string | null
          id: string
          isDefault: boolean
          isProtected: boolean
          isTrashed: boolean
          name: string
          slug: string
        }
        Insert: {
          createdAt?: string
          createdByUserId?: string | null
          description?: string | null
          id: string
          isDefault?: boolean
          isProtected?: boolean
          isTrashed?: boolean
          name: string
          slug: string
        }
        Update: {
          createdAt?: string
          createdByUserId?: string | null
          description?: string | null
          id?: string
          isDefault?: boolean
          isProtected?: boolean
          isTrashed?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      UserRolePermission: {
        Row: {
          assignedAt: string
          id: string
          permissionId: string
          roleId: string
        }
        Insert: {
          assignedAt?: string
          id: string
          permissionId: string
          roleId: string
        }
        Update: {
          assignedAt?: string
          id?: string
          permissionId?: string
          roleId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserRolePermission_permissionId_fkey"
            columns: ["permissionId"]
            isOneToOne: false
            referencedRelation: "UserPermission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UserRolePermission_roleId_fkey"
            columns: ["roleId"]
            isOneToOne: false
            referencedRelation: "UserRole"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string
          gender: string | null
          has_default_password: boolean
          id: string
          last_login: string | null
          name: string
          password_expiry_date: string | null
          password_hash: string | null
          password_last_changed: string
          permissions: string[] | null
          phone: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email: string
          gender?: string | null
          has_default_password?: boolean
          id: string
          last_login?: string | null
          name: string
          password_expiry_date?: string | null
          password_hash?: string | null
          password_last_changed?: string
          permissions?: string[] | null
          phone?: string | null
          role: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string
          gender?: string | null
          has_default_password?: boolean
          id?: string
          last_login?: string | null
          name?: string
          password_expiry_date?: string | null
          password_hash?: string | null
          password_last_changed?: string
          permissions?: string[] | null
          phone?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      VerificationToken: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acadia_can_manage_users: { Args: never; Returns: boolean }
      acadia_current_role_slug: { Args: never; Returns: string }
      acadia_current_student_profile_id: { Args: never; Returns: string }
      acadia_current_tenant_id: { Args: never; Returns: string }
      acadia_is_admin: { Args: never; Returns: boolean }
      acadia_is_admin_or_registrar: { Args: never; Returns: boolean }
      acadia_is_staff_or_teacher: { Args: never; Returns: boolean }
      acadia_is_student: { Args: never; Returns: boolean }
    }
    Enums: {
      AcademicBranch: "GRAMMAR" | "TECHNICAL" | "COMMERCIAL"
      AcademicCalendarMilestoneKind:
        | "ENROLLMENT_OPEN"
        | "ENROLLMENT_CLOSE"
        | "MARK_ENTRY_OPEN"
        | "MARK_ENTRY_CLOSE"
        | "INSTRUCTION_START"
        | "INSTRUCTION_END"
        | "EXAM_PERIOD_START"
        | "EXAM_PERIOD_END"
      AcademicSubSystem: "ENGLISH" | "FRENCH"
      AnnouncementAudience: "ALL" | "STAFF" | "STUDENTS" | "GUARDIANS"
      AttendanceRecordStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
      ClassStatus: "ACTIVE" | "INACTIVE"
      CourseworkSubmissionStatus: "DRAFT" | "SUBMITTED"
      DataExportJobStatus: "PENDING" | "READY" | "FAILED"
      DeploymentMode: "CLOUD" | "LAN"
      EnrollmentApplicationKind: "NEW" | "RE_ENROLL"
      EnrollmentApplicationStatus: "PENDING" | "APPROVED" | "REJECTED"
      ExamSessionType:
        | "NORMAL"
        | "RESIT"
        | "GCE"
        | "BEPC"
        | "PROBATOIRE"
        | "BACCALAUREAT"
      FeeInstallmentStatus: "PENDING" | "PAID" | "OVERDUE" | "WAIVED"
      FinanceLedgerEntryType: "INCOME" | "EXPENSE"
      GradingMode: "FRANCOPHONE" | "ANGLOPHONE" | "PER_SPECIALTY"
      LearningMaterialKind: "DOCUMENT" | "VIDEO" | "LINK" | "OTHER"
      MarkEntryCalendarPolicy: "SESSION_DATES_ONLY" | "CALENDAR_AND_SESSION"
      MessageGroupScope: "DEPARTMENT" | "SPECIALTY" | "LEVEL"
      MessageThreadKind: "DIRECT" | "GROUP"
      PromotionAction: "PROMOTE" | "REPEAT" | "GRADUATE" | "WITHDRAW" | "DEFER"
      PromotionDecisionSource: "AUTO" | "MANUAL"
      ResourceAllocationStatus: "ACTIVE" | "RETURNED" | "OVERDUE"
      ResourceRequestStatus:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "FULFILLED"
        | "CANCELLED"
      RoomMaintenanceStatus:
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
      ScholarshipDiscountKind: "PERCENT_BPS" | "FIXED_MINOR"
      SchoolAnnouncementKind: "BROADCAST" | "EVENT"
      SchoolAnnouncementStatus:
        | "DRAFT"
        | "SCHEDULED"
        | "PUBLISHED"
        | "CANCELLED"
      SchoolResourceType: "EQUIPMENT" | "BOOK" | "LAB" | "IT" | "OTHER"
      SpecialtyGradingSystem: "FRANCOPHONE" | "ANGLOPHONE"
      subject_type:
        | "LANGUAGES"
        | "RELATED_TRADE_SUBJECTS"
        | "TRADE_SUBJECTS"
        | "OTHERS"
      StaffEmploymentType: "FULL_TIME" | "PART_TIME" | "ADJUNCT" | "VISITING"
      StudentEnrollmentStatus: "ENROLLED" | "WITHDRAWN"
      TenantStatus: "ONBOARDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED"
      TranscriptCopyRequestStatus: "PENDING" | "FULFILLED" | "REJECTED"
      TranscriptVersionStatus: "PENDING" | "READY" | "FAILED"
      UserStatus: "INACTIVE" | "ACTIVE" | "BLOCKED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      AcademicBranch: ["GRAMMAR", "TECHNICAL", "COMMERCIAL"],
      AcademicCalendarMilestoneKind: [
        "ENROLLMENT_OPEN",
        "ENROLLMENT_CLOSE",
        "MARK_ENTRY_OPEN",
        "MARK_ENTRY_CLOSE",
        "INSTRUCTION_START",
        "INSTRUCTION_END",
        "EXAM_PERIOD_START",
        "EXAM_PERIOD_END",
      ],
      AcademicSubSystem: ["ENGLISH", "FRENCH"],
      AnnouncementAudience: ["ALL", "STAFF", "STUDENTS", "GUARDIANS"],
      AttendanceRecordStatus: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
      ClassStatus: ["ACTIVE", "INACTIVE"],
      CourseworkSubmissionStatus: ["DRAFT", "SUBMITTED"],
      DataExportJobStatus: ["PENDING", "READY", "FAILED"],
      DeploymentMode: ["CLOUD", "LAN"],
      EnrollmentApplicationKind: ["NEW", "RE_ENROLL"],
      EnrollmentApplicationStatus: ["PENDING", "APPROVED", "REJECTED"],
      ExamSessionType: [
        "NORMAL",
        "RESIT",
        "GCE",
        "BEPC",
        "PROBATOIRE",
        "BACCALAUREAT",
      ],
      FeeInstallmentStatus: ["PENDING", "PAID", "OVERDUE", "WAIVED"],
      FinanceLedgerEntryType: ["INCOME", "EXPENSE"],
      GradingMode: ["FRANCOPHONE", "ANGLOPHONE", "PER_SPECIALTY"],
      LearningMaterialKind: ["DOCUMENT", "VIDEO", "LINK", "OTHER"],
      MarkEntryCalendarPolicy: ["SESSION_DATES_ONLY", "CALENDAR_AND_SESSION"],
      MessageGroupScope: ["DEPARTMENT", "SPECIALTY", "LEVEL"],
      MessageThreadKind: ["DIRECT", "GROUP"],
      PromotionAction: ["PROMOTE", "REPEAT", "GRADUATE", "WITHDRAW", "DEFER"],
      PromotionDecisionSource: ["AUTO", "MANUAL"],
      ResourceAllocationStatus: ["ACTIVE", "RETURNED", "OVERDUE"],
      ResourceRequestStatus: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "FULFILLED",
        "CANCELLED",
      ],
      RoomMaintenanceStatus: [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      ScholarshipDiscountKind: ["PERCENT_BPS", "FIXED_MINOR"],
      SchoolAnnouncementKind: ["BROADCAST", "EVENT"],
      SchoolAnnouncementStatus: [
        "DRAFT",
        "SCHEDULED",
        "PUBLISHED",
        "CANCELLED",
      ],
      SchoolResourceType: ["EQUIPMENT", "BOOK", "LAB", "IT", "OTHER"],
      SpecialtyGradingSystem: ["FRANCOPHONE", "ANGLOPHONE"],
      StaffEmploymentType: ["FULL_TIME", "PART_TIME", "ADJUNCT", "VISITING"],
      StudentEnrollmentStatus: ["ENROLLED", "WITHDRAWN"],
      TenantStatus: ["ONBOARDING", "ACTIVE", "SUSPENDED", "ARCHIVED"],
      TranscriptCopyRequestStatus: ["PENDING", "FULFILLED", "REJECTED"],
      TranscriptVersionStatus: ["PENDING", "READY", "FAILED"],
      UserStatus: ["INACTIVE", "ACTIVE", "BLOCKED"],
    },
  },
} as const
