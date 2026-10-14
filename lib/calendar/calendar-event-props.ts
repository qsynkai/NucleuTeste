import type { ProjectSummary } from "@/lib/types/project-api";
import type {
  AppointmentStatus,
  AttendanceType,
  EntryType,
  EventStatus,
  PostStatus,
  ServiceChannel,
  SocialChannel,
} from "@prisma/client";

export type CalendarEventExtendedProps = {
  entryType: EntryType;
  content: string;
  channels: SocialChannel[];
  status: PostStatus;
  project?: ProjectSummary;
  showProject?: boolean;
  currentStatus: EventStatus;
  productionTotalCents: number;
  attendanceType: AttendanceType | null;
  clientName: string | null;
  appointmentStatus: AppointmentStatus | null;
  serviceChannel: ServiceChannel | null;
};
