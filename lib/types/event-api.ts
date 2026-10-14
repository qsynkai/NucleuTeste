import type {
  AppointmentStatus,
  AttendanceType,
  EntryType,
  EventStatus,
  ServiceChannel,
} from "@prisma/client";
import type { PostCalendarItem } from "@/lib/types/post-api";

export type ExternalLinkItem = {
  title: string;
  url: string;
  type: string;
};

export type EventTaskItem = {
  id: string;
  customName: string | null;
  catalogName: string | null;
  price: string;
  completed: boolean;
  assignedToUserId: string | null;
};

export type EventStatusHistoryItem = {
  id: string;
  status: EventStatus;
  createdAt: string;
  notes: string | null;
  user: { id: string; name: string };
};

export type EventListItem = Omit<PostCalendarItem, "tasks"> & {
  entryType: EntryType;
  currentStatus: EventStatus;
  durationMinutes: number | null;
  attendanceType: AttendanceType | null;
  clientName: string | null;
  clientPhone: string | null;
  serviceChannel: ServiceChannel | null;
  meetingUrl: string | null;
  meetingNotes: string | null;
  internalResponsible: string | null;
  assignedProfessional: string | null;
  appointmentStatus: AppointmentStatus | null;
  externalLinks: ExternalLinkItem[];
  tasks: EventTaskItem[];
  statusHistory: EventStatusHistoryItem[];
};

export type EventsListResponse = {
  events: EventListItem[];
};
