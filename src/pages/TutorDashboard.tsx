import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TutorAvailabilityManager } from '@/components/lessons/TutorAvailabilityManager';
import { TutorLessonManager } from '@/components/lessons/TutorLessonManager';
import { TutorRequestManager } from '@/components/lessons/TutorRequestManager';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarDays, BookOpen, Inbox } from 'lucide-react';

export default function TutorDashboard() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tutor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your lessons, availability, and booking requests</p>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests" className="gap-1.5">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">My Lessons</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Availability</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <TutorRequestManager />
          </TabsContent>

          <TabsContent value="lessons">
            <TutorLessonManager />
          </TabsContent>

          <TabsContent value="availability">
            <TutorAvailabilityManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
