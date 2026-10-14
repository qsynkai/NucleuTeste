import type {
  AppointmentStatus,
  AttendanceType,
  EntryType,
  EventStatus,
  PostStatus,
  ServiceChannel,
  SocialChannel,
} from "@prisma/client";
import type { ProjectSummary } from "@/lib/types/project-api";

export type PostCalendarTaskSummary = {
  price: string;
};

export type PostCalendarItem = {
  id: string;
  title: string;
  content: string;
  scheduledAt: string | null;
  status: PostStatus;
  channels: SocialChannel[];
  mediaUrls: string[];
  projectId: string;
  project: ProjectSummary;
  entryType: EntryType;
  durationMinutes: number | null;
  currentStatus: EventStatus;
  attendanceType: AttendanceType | null;
  clientName: string | null;
  appointmentStatus: AppointmentStatus | null;
  serviceChannel: ServiceChannel | null;
  tasks: PostCalendarTaskSummary[];
};

export type PostsListResponse = {
  posts: PostCalendarItem[];
};

export type CreatePostBody = {
  projectId: string;
  title: string;
  content: string;
  scheduledAt: string;
  channels: SocialChannel[];
  mediaUrls?: string[];
};

export type UpdatePostBody = CreatePostBody;

export type GenerateCopyBody = {
  brief: string;
  title?: string;
  channels: SocialChannel[];
};

export type GenerateCopyResponse = {
  caption: string;
};
