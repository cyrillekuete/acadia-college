'use client';

import { createContext, ReactNode, useContext } from 'react';
import type { StudentDetailRecord } from '@/lib/supabase/queries/student-detail';

interface StudentContextProps {
  student: StudentDetailRecord | undefined;
  isLoading: boolean;
}

interface StudentProviderProps extends StudentContextProps {
  children: ReactNode;
}

const StudentContext = createContext<StudentContextProps | undefined>(undefined);

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};

export const StudentProvider = ({
  student,
  isLoading,
  children,
}: StudentProviderProps) => {
  return (
    <StudentContext.Provider value={{ student, isLoading }}>
      {children}
    </StudentContext.Provider>
  );
};
