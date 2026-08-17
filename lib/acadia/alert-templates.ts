export const ALERT_TEMPLATE_IDS = [
  'meeting-reminder',
  'exam-schedule',
  'fee-reminder',
  'school-closure',
  'event-invitation',
] as const;

export type AlertTemplateId = (typeof ALERT_TEMPLATE_IDS)[number];

export type AlertTemplate = {
  id: AlertTemplateId;
  category: 'meetings' | 'academic' | 'financial' | 'general' | 'events';
  titleEn: string;
  titleFr: string;
  bodyEn: string;
  bodyFr: string;
};

export const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: 'meeting-reminder',
    category: 'meetings',
    titleEn: 'Parent-Teacher Meeting Reminder',
    titleFr: 'Rappel de réunion parents-professeurs',
    bodyEn:
      'Dear Parent,\n\nThis is a reminder that our Parent-Teacher Meeting is scheduled for [DATE] at [TIME] in [LOCATION].\n\nPlease confirm your attendance by replying to this message.\n\nBest regards,\nSchool Administration',
    bodyFr:
      'Cher parent,\n\nNous vous rappelons que la réunion parents-professeurs est prévue le [DATE] à [HEURE] à [LIEU].\n\nMerci de confirmer votre présence en répondant à ce message.\n\nCordialement,\nL’administration',
  },
  {
    id: 'exam-schedule',
    category: 'academic',
    titleEn: 'Examination Schedule',
    titleFr: 'Calendrier des examens',
    bodyEn:
      'Dear Parent,\n\nPlease note that [EXAM_NAME] examinations will commence on [START_DATE] and end on [END_DATE].\n\nStudents should arrive 30 minutes before the scheduled time.\n\nBest regards,\nSchool Administration',
    bodyFr:
      'Cher parent,\n\nVeuillez noter que les examens [EXAM_NAME] commenceront le [DATE_DEBUT] et se termineront le [DATE_FIN].\n\nLes élèves doivent arriver 30 minutes avant l’heure prévue.\n\nCordialement,\nL’administration',
  },
  {
    id: 'fee-reminder',
    category: 'financial',
    titleEn: 'Fee Payment Reminder',
    titleFr: 'Rappel de paiement des frais',
    bodyEn:
      'Dear Parent,\n\nThis is a friendly reminder that [FEE_TYPE] fees are due on [DUE_DATE].\n\nAmount: [AMOUNT]\n\nPlease ensure payment is made before the due date to avoid late fees.\n\nBest regards,\nSchool Administration',
    bodyFr:
      'Cher parent,\n\nNous vous rappelons que les frais [FEE_TYPE] sont exigibles le [DATE_ECHEANCE].\n\nMontant : [MONTANT]\n\nMerci d’effectuer le paiement avant la date limite afin d’éviter des pénalités.\n\nCordialement,\nL’administration',
  },
  {
    id: 'school-closure',
    category: 'general',
    titleEn: 'School Closure Notice',
    titleFr: 'Avis de fermeture de l’établissement',
    bodyEn:
      'Dear Parent,\n\nPlease be informed that the school will be closed on [DATE] due to [REASON].\n\nClasses will resume on [RESUME_DATE].\n\nBest regards,\nSchool Administration',
    bodyFr:
      'Cher parent,\n\nNous vous informons que l’établissement sera fermé le [DATE] en raison de [MOTIF].\n\nLes cours reprendront le [DATE_REPRISE].\n\nCordialement,\nL’administration',
  },
  {
    id: 'event-invitation',
    category: 'events',
    titleEn: 'School Event Invitation',
    titleFr: 'Invitation à un événement scolaire',
    bodyEn:
      'Dear Parent,\n\nYou are cordially invited to [EVENT_NAME] on [DATE] at [TIME] in [LOCATION].\n\n[EVENT_DESCRIPTION]\n\nPlease RSVP by [RSVP_DATE].\n\nBest regards,\nSchool Administration',
    bodyFr:
      'Cher parent,\n\nVous êtes cordialement invité(e) à [EVENT_NAME] le [DATE] à [HEURE] à [LIEU].\n\n[EVENT_DESCRIPTION]\n\nMerci de confirmer votre présence avant le [DATE_RSVP].\n\nCordialement,\nL’administration',
  },
];

export function alertTemplateById(id: string | null | undefined): AlertTemplate | null {
  return ALERT_TEMPLATES.find((template) => template.id === id) ?? null;
}
