import { useState } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TutorAvailabilityManager } from '@/components/lessons/TutorAvailabilityManager';
import { TutorLessonManager } from '@/components/lessons/TutorLessonManager';
import { TutorRequestManager } from '@/components/lessons/TutorRequestManager';
import { CalendarDays, BookOpen, Inbox } from 'lucide-react';

export default function TutorDashboard() {
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Tutor Dashboard</h1>

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
      </div>
    </>
  );
}
