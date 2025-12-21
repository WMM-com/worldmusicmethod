import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Course title patterns to exclude
const EXCLUDED_PATTERNS = [
  /^Platform Overview$/i,
  /Day \d+/i,
  /Final Day/i,
  /Part \d+$/i,
  /Sample Videos?/i,
];

function shouldExclude(title: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(title));
}

function extractSoundsliceId(content: string): string | null {
  const patterns = [
    /\[drum url='https:\/\/www\.soundslice\.com\/slices\/([^']+)'\]/,
    /\[guitar url='https:\/\/www\.soundslice\.com\/slices\/([^']+)'\]/,
    /\[bass url='https:\/\/www\.soundslice\.com\/slices\/([^']+)'\]/,
    /soundslice\.com\/slices\/([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractYoutubeId(content: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<!-- wp:[^>]+-->/g, '')
    .replace(/<!-- \/wp:[^>]+-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\n+/g, '\n\n')
    .trim();
}

interface ModuleData {
  wp_post: {
    ID: number;
    post_title: string;
    post_content: string;
  };
  wp_post_permalink: string;
}

interface LessonData {
  wp_post: {
    ID: number;
    post_title: string;
    post_content: string;
  };
  wp_post_permalink: string;
}

// Parse JSONL string into array of objects
function parseJsonl(jsonlText: string): unknown[] {
  const lines = jsonlText.split('\n').filter(line => line.trim());
  const results: unknown[] = [];
  for (const line of lines) {
    try {
      results.push(JSON.parse(line));
    } catch (e) {
      console.error('Failed to parse line:', e);
    }
  }
  return results;
}

export function ImportCourseData() {
  const [courseTitle, setCourseTitle] = useState("Argentinian Fingerstyle Guitar");
  const [importing, setImporting] = useState(false);
  const [modulesText, setModulesText] = useState("");
  const [lessonsText, setLessonsText] = useState("");
  const [results, setResults] = useState<{
    modulesCreated: number;
    lessonsCreated: number;
    errors: string[];
  } | null>(null);

  const handleImport = async () => {
    if (!modulesText || !lessonsText) {
      toast.error("Please paste both modules and lessons data");
      return;
    }
    
    setImporting(true);
    setResults(null);
    
    try {
      // Find the course in our database by title
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .ilike('title', `%${courseTitle}%`)
        .single();
      
      if (courseError || !course) {
        toast.error(`Course not found: ${courseTitle}`);
        setImporting(false);
        return;
      }
      
      console.log('Found course:', course.title, 'ID:', course.id);
      toast.info(`Found course: ${course.title}`);
      
      const importResults = {
        modulesCreated: 0,
        lessonsCreated: 0,
        errors: [] as string[],
      };
      
      // Parse the JSONL data
      const modulesData = parseJsonl(modulesText) as ModuleData[];
      const lessonsData = parseJsonl(lessonsText) as LessonData[];
      
      console.log(`Parsed ${modulesData.length} modules and ${lessonsData.length} lessons`);
      
      // Filter modules for this course
      const courseSlug = courseTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      console.log('Looking for modules with course slug:', courseSlug);
      
      const filteredModules: { title: string; description: string; permalink: string }[] = [];
      
      for (const mod of modulesData) {
        const permalink = mod.wp_post_permalink || '';
        
        // Only include modules that belong to this course
        if (!permalink.toLowerCase().includes(courseSlug)) {
          continue;
        }
        
        const title = mod.wp_post?.post_title;
        if (!title || shouldExclude(title)) {
          console.log(`Skipping module: ${title}`);
          continue;
        }
        
        const content = mod.wp_post?.post_content || '';
        
        filteredModules.push({
          title,
          description: cleanHtml(content),
          permalink,
        });
      }
      
      console.log(`Found ${filteredModules.length} modules for this course`);
      toast.info(`Found ${filteredModules.length} modules`);
      
      // Create modules
      for (let i = 0; i < filteredModules.length; i++) {
        const mod = filteredModules[i];
        
        const { data: existingModule } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', course.id)
          .eq('title', mod.title)
          .single();
        
        if (existingModule) {
          console.log(`Module already exists: ${mod.title}`);
          continue;
        }
        
        const { error } = await supabase
          .from('course_modules')
          .insert({
            course_id: course.id,
            title: mod.title,
            description: mod.description,
            order_index: i,
          });
        
        if (error) {
          console.error('Module insert error:', error);
          importResults.errors.push(`Module: ${mod.title} - ${error.message}`);
        } else {
          importResults.modulesCreated++;
          console.log(`Created module: ${mod.title}`);
        }
      }
      
      toast.info(`Created ${importResults.modulesCreated} modules, now importing lessons...`);
      
      // Get all modules for this course
      const { data: dbModules } = await supabase
        .from('course_modules')
        .select('id, title')
        .eq('course_id', course.id)
        .order('order_index');
      
      console.log(`DB has ${dbModules?.length || 0} modules for this course`);
      
      // Create a map of module permalinks to module IDs
      const modulePermalinkMap = new Map<string, string>();
      for (const mod of filteredModules) {
        const lessonMatch = mod.permalink.match(/\/lessons\/([^\/]+)/);
        if (lessonMatch) {
          const moduleRecord = dbModules?.find(m => m.title === mod.title);
          if (moduleRecord) {
            modulePermalinkMap.set(lessonMatch[1], moduleRecord.id);
          }
        }
      }
      
      console.log('Module permalink map:', Object.fromEntries(modulePermalinkMap));
      
      // Filter and create lessons
      for (const lesson of lessonsData) {
        const permalink = lesson.wp_post_permalink || '';
        
        // Only include lessons that belong to this course
        if (!permalink.toLowerCase().includes(courseSlug)) {
          continue;
        }
        
        const title = lesson.wp_post?.post_title;
        if (!title || shouldExclude(title)) {
          console.log(`Skipping lesson: ${title}`);
          continue;
        }
        
        const content = lesson.wp_post?.post_content || '';
        
        // Find which module this lesson belongs to from the permalink
        const lessonMatch = permalink.match(/\/lessons\/([^\/]+)\//);
        let moduleId: string | null = null;
        
        if (lessonMatch) {
          moduleId = modulePermalinkMap.get(lessonMatch[1]) || null;
        }
        
        // Fallback to first module if can't match
        if (!moduleId && dbModules?.length) {
          moduleId = dbModules[0].id;
        }
        
        if (!moduleId) {
          importResults.errors.push(`No module found for lesson: ${title}`);
          continue;
        }
        
        // Check if lesson exists
        const { data: existingLesson } = await supabase
          .from('module_lessons')
          .select('id')
          .eq('module_id', moduleId)
          .eq('title', title)
          .single();
        
        if (existingLesson) {
          console.log(`Lesson already exists: ${title}`);
          continue;
        }
        
        // Determine video URL
        let videoUrl = null;
        const soundsliceId = extractSoundsliceId(content);
        const youtubeId = extractYoutubeId(content);
        
        if (soundsliceId) {
          videoUrl = `https://www.soundslice.com/slices/${soundsliceId}/`;
        } else if (youtubeId) {
          videoUrl = `https://www.youtube.com/embed/${youtubeId}`;
        }
        
        // Get current count for order
        const { count } = await supabase
          .from('module_lessons')
          .select('*', { count: 'exact', head: true })
          .eq('module_id', moduleId);
        
        const { error } = await supabase
          .from('module_lessons')
          .insert({
            module_id: moduleId,
            title,
            content: cleanHtml(content),
            video_url: videoUrl,
            lesson_type: soundsliceId ? 'video' : (youtubeId ? 'video' : 'reading'),
            order_index: count || 0,
          });
        
        if (error) {
          console.error('Lesson insert error:', error);
          importResults.errors.push(`Lesson: ${title} - ${error.message}`);
        } else {
          importResults.lessonsCreated++;
          console.log(`Created lesson: ${title}`);
        }
      }
      
      setResults(importResults);
      toast.success(`Import complete! ${importResults.modulesCreated} modules, ${importResults.lessonsCreated} lessons`);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed: ' + (error as Error).message);
    }
    
    setImporting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Course Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Course Title</label>
          <Input
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder="e.g. Argentinian Fingerstyle Guitar"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Modules JSONL Data</label>
          <Textarea
            value={modulesText}
            onChange={(e) => setModulesText(e.target.value)}
            placeholder="Paste modules JSONL here..."
            rows={4}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Lessons JSONL Data</label>
          <Textarea
            value={lessonsText}
            onChange={(e) => setLessonsText(e.target.value)}
            placeholder="Paste lessons JSONL here..."
            rows={4}
          />
        </div>
        
        <Button onClick={handleImport} disabled={importing}>
          {importing ? "Importing..." : "Import Modules & Lessons"}
        </Button>
        
        {results && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p>Modules created: {results.modulesCreated}</p>
            <p>Lessons created: {results.lessonsCreated}</p>
            {results.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-destructive font-medium">Errors:</p>
                <ul className="text-sm text-destructive">
                  {results.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {results.errors.length > 10 && (
                    <li>... and {results.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
