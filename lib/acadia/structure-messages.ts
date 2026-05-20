export function levelCreateConfirmCopy(): { title: string; description: string } {
  return {
    title: 'Create level?',
    description:
      'Once this level is created, you will not be able to delete it if classes, subjects, enrollments, or other records reference it. Verify the name, sub-system, and branch before continuing.',
  };
}

export function classCreateConfirmCopy(): { title: string; description: string } {
  return {
    title: 'Create class?',
    description:
      'Once this class is created, you will not be able to delete it if students, subjects, enrollments, or other records reference it. Verify the name, level, and assignments before continuing.',
  };
}
