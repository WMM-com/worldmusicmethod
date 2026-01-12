import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { courseId, newTitle } = await req.json();

    console.log(`Duplicating course ${courseId} as "${newTitle}"`);

    // Get original course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message}`);
    }

    // Create new course
    const { data: newCourse, error: newCourseError } = await supabase
      .from('courses')
      .insert({
        title: newTitle,
        description: course.description,
        country: course.country,
        region_theme: course.region_theme,
        cover_image_url: course.cover_image_url,
        is_published: false, // Start unpublished
        tutor_name: course.tutor_name,
        tags: course.tags,
        user_id: course.user_id
      })
      .select()
      .single();

    if (newCourseError || !newCourse) {
      throw new Error(`Failed to create course: ${newCourseError?.message}`);
    }

    console.log(`Created new course: ${newCourse.id}`);

    // Duplicate landing page
    const { data: landingPage } = await supabase
      .from('course_landing_pages')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (landingPage) {
      const { id, course_id, created_at, updated_at, ...landingPageData } = landingPage;
      await supabase
        .from('course_landing_pages')
        .insert({
          ...landingPageData,
          course_id: newCourse.id
        });
      console.log('Duplicated landing page');
    }

    // Get and duplicate modules
    const { data: modules } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (modules && modules.length > 0) {
      for (const module of modules) {
        const { id: oldModuleId, course_id, created_at, updated_at, ...moduleData } = module;
        
        const { data: newModule, error: moduleError } = await supabase
          .from('course_modules')
          .insert({
            ...moduleData,
            course_id: newCourse.id
          })
          .select()
          .single();

        if (moduleError || !newModule) {
          console.error(`Failed to duplicate module: ${moduleError?.message}`);
          continue;
        }

        // Get and duplicate lessons for this module
        const { data: lessons } = await supabase
          .from('module_lessons')
          .select('*')
          .eq('module_id', oldModuleId)
          .order('order_index');

        if (lessons && lessons.length > 0) {
          const newLessons = lessons.map(lesson => {
            const { id, module_id, created_at, updated_at, ...lessonData } = lesson;
            return {
              ...lessonData,
              module_id: newModule.id
            };
          });

          await supabase
            .from('module_lessons')
            .insert(newLessons);
        }
      }
      console.log(`Duplicated ${modules.length} modules with lessons`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      newCourseId: newCourse.id,
      newTitle: newCourse.title
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
