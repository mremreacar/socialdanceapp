import { schoolEventAttendeesService } from './schoolEventAttendees';
import { instructorLessonsService, type PublishedInstructorLessonListItem } from './instructorLessons';

export const instructorLessonReservationsService = {
  async isJoined(lessonId: string): Promise<boolean> {
    return await schoolEventAttendeesService.isJoined(lessonId);
  },

  async listJoinedLessonIds(lessonIds: string[]): Promise<string[]> {
    return await schoolEventAttendeesService.listJoinedEventIds(lessonIds);
  },

  async join(lessonId: string): Promise<void> {
    await schoolEventAttendeesService.join(lessonId);
  },

  async leave(lessonId: string): Promise<void> {
    await schoolEventAttendeesService.leave(lessonId);
  },

  async listMine(): Promise<PublishedInstructorLessonListItem[]> {
    const joinedEvents = await schoolEventAttendeesService.listMine();
    const lessonIds = joinedEvents
      .filter((row) => (row.event_type ?? '').trim().toLowerCase() === 'lesson')
      .map((row) => row.id)
      .filter(Boolean);
    if (lessonIds.length === 0) return [];
    return await instructorLessonsService.listPublishedByIds(lessonIds);
  },
};
