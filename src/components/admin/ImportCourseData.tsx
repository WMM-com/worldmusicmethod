import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// R2 base URL for matching images
const R2_BASE = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev';

// Helper to convert WordPress image URLs to R2 URLs
const convertToR2Url = (url: string): string => {
  if (!url) return '';
  // Extract the path after the domain
  const pathMatch = url.match(/worldmusicmethod\.com\/wp-content\/uploads\/(.+)/);
  if (pathMatch) {
    return `${R2_BASE}/${pathMatch[1]}`;
  }
  // If already R2, keep as is
  if (url.includes('r2.dev')) {
    return url;
  }
  return url;
};

// Helper to extract text content from HTML
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

// Helper to extract paragraphs from HTML
const extractParagraphs = (html: string): string[] => {
  const paragraphs: string[] = [];
  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pPattern.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
};

// Helper to extract images from HTML
const extractImages = (html: string): string[] => {
  const images: string[] = [];
  const imgPattern = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi;
  let match;
  while ((match = imgPattern.exec(html)) !== null) {
    images.push(convertToR2Url(match[0]));
  }
  return [...new Set(images)]; // Remove duplicates
};

export function ImportCourseData() {
  const [courseTitle, setCourseTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [modulesText, setModulesText] = useState("");
  const [lessonsText, setLessonsText] = useState("");
  const [landingPageText, setLandingPageText] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{
    modulesCreated: number;
    lessonsCreated: number;
    errors: string[];
  } | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(msg);
  };

  const handleImport = async () => {
    if (!modulesText || !lessonsText) {
      toast.error("Please paste both modules and lessons data");
      return;
    }
    
    setImporting(true);
    setResults(null);
    setLogs([]);
    
    try {
      addLog(`Calling edge function for course: ${courseTitle}`);
      
      const { data, error } = await supabase.functions.invoke('import-learndash-data', {
        body: {
          action: 'import-course',
          courseTitle,
          modulesData: modulesText,
          lessonsData: lessonsText,
        }
      });
      
      if (error) {
        addLog(`Error: ${error.message}`);
        toast.error('Import failed: ' + error.message);
        return;
      }
      
      if (!data.success) {
        addLog(`Failed: ${data.error}`);
        toast.error(data.error);
        return;
      }
      
      addLog(`Import complete for ${data.courseTitle}`);
      addLog(`Modules created: ${data.results.modulesCreated}`);
      addLog(`Lessons created: ${data.results.lessonsCreated}`);
      
      if (data.results.errors?.length > 0) {
        data.results.errors.forEach((e: string) => addLog(`Error: ${e}`));
      }
      
      setResults(data.results);
      toast.success(`Import complete! ${data.results.modulesCreated} modules, ${data.results.lessonsCreated} lessons`);
      
    } catch (error) {
      console.error('Import error:', error);
      addLog(`Exception: ${(error as Error).message}`);
      toast.error('Import failed: ' + (error as Error).message);
    }
    
    setImporting(false);
  };

  const handleLandingPageImport = async () => {
    if (!landingPageText) {
      toast.error("Please paste landing page data");
      return;
    }
    
    setImporting(true);
    setLogs([]);
    
    try {
      addLog(`Parsing landing page data for: ${courseTitle}`);
      
      // Find the matching course in the database
      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .ilike('title', `%${courseTitle.split(' ')[0]}%`);
      
      if (courseError) {
        addLog(`Error finding course: ${courseError.message}`);
        toast.error('Error finding course');
        setImporting(false);
        return;
      }
      
      if (!courses || courses.length === 0) {
        addLog('No matching course found in database');
        toast.error('No matching course found in database');
        setImporting(false);
        return;
      }
      
      const course = courses[0];
      addLog(`Found course: ${course.title} (${course.id})`);
      
      // Parse the landing page JSONL
      const lines = landingPageText.split('\n').filter(l => l.trim());
      let landingData: any = null;
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const title = data.wp_post?.post_title || '';
          
          // Match the course by title (flexible matching)
          if (title.toLowerCase().includes(courseTitle.toLowerCase().split(' ')[0])) {
            landingData = data;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!landingData) {
        addLog('No matching landing page found in JSONL data');
        toast.error('No matching landing page found');
        setImporting(false);
        return;
      }
      
      addLog(`Found landing page: ${landingData.wp_post?.post_title}`);
      
      const content = landingData.wp_post?.post_content || '';
      
      // Extract all images
      const allImages = extractImages(content);
      addLog(`Found ${allImages.length} images`);
      
      // Extract paragraphs for overview
      const paragraphs = extractParagraphs(content);
      addLog(`Found ${paragraphs.length} paragraphs`);
      
      // Try to identify sections by headings
      const sections: { heading: string; content: string }[] = [];
      const headingPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
      const headings = [...content.matchAll(headingPattern)];
      
      for (let i = 0; i < headings.length; i++) {
        const heading = stripHtml(headings[i][1]);
        const startIdx = headings[i].index! + headings[i][0].length;
        const endIdx = i < headings.length - 1 ? headings[i + 1].index! : content.length;
        const sectionContent = content.substring(startIdx, endIdx);
        sections.push({ heading, content: sectionContent });
      }
      
      addLog(`Found ${sections.length} sections: ${sections.map(s => s.heading).join(', ')}`);
      
      // Extract expert info
      let expertName = '';
      let expertImage = '';
      let expertBio: string[] = [];
      
      const expertSection = sections.find(s => 
        s.heading.toLowerCase().includes('meet') || 
        s.heading.toLowerCase().includes('expert') ||
        s.heading.toLowerCase().includes('tutor') ||
        s.heading.toLowerCase().includes('instructor')
      );
      
      if (expertSection) {
        // Try to extract name from heading or first strong/b tag
        const nameMatch = expertSection.content.match(/<strong[^>]*>([^<]+)<\/strong>/i) ||
                          expertSection.content.match(/<b[^>]*>([^<]+)<\/b>/i);
        if (nameMatch) {
          expertName = stripHtml(nameMatch[1]);
        }
        
        // Get expert image
        const expertImages = extractImages(expertSection.content);
        if (expertImages.length > 0) {
          expertImage = expertImages[0];
        }
        
        // Get expert bio paragraphs
        expertBio = extractParagraphs(expertSection.content);
        addLog(`Found expert: ${expertName}, bio paragraphs: ${expertBio.length}`);
      }
      
      // Extract overview section
      let overviewHeading = '';
      let courseOverview: string[] = [];
      
      const overviewSection = sections.find(s => 
        s.heading.toLowerCase().includes('overview') ||
        s.heading.toLowerCase().includes('about') ||
        s.heading.toLowerCase().includes('description')
      );
      
      if (overviewSection) {
        overviewHeading = overviewSection.heading;
        courseOverview = extractParagraphs(overviewSection.content);
      } else if (paragraphs.length > 0) {
        // Use first few paragraphs as overview
        courseOverview = paragraphs.slice(0, 4);
      }
      
      addLog(`Overview: ${courseOverview.length} paragraphs`);
      
      // Extract resources section
      const resources: any[] = [];
      const resourcesSection = sections.find(s => 
        s.heading.toLowerCase().includes('resource') ||
        s.heading.toLowerCase().includes('include') ||
        s.heading.toLowerCase().includes('feature')
      );
      
      if (resourcesSection) {
        const resourceImages = extractImages(resourcesSection.content);
        const resourceParas = extractParagraphs(resourcesSection.content);
        
        // Try to pair images with text
        for (let i = 0; i < Math.min(resourceImages.length, 4); i++) {
          resources.push({
            image: resourceImages[i],
            title: resourceParas[i * 2] || `Resource ${i + 1}`,
            description: resourceParas[i * 2 + 1] || ''
          });
        }
        addLog(`Found ${resources.length} resources`);
      }
      
      // Extract FAQs
      const faqs: any[] = [];
      const faqSection = sections.find(s => 
        s.heading.toLowerCase().includes('faq') ||
        s.heading.toLowerCase().includes('question')
      );
      
      if (faqSection) {
        // Look for Q&A patterns
        const qaPattern = /<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
        let qaMatch;
        while ((qaMatch = qaPattern.exec(faqSection.content)) !== null) {
          faqs.push({
            question: stripHtml(qaMatch[1]),
            answer: stripHtml(qaMatch[2])
          });
        }
        addLog(`Found ${faqs.length} FAQs`);
      }
      
      // Get hero image (usually first large image)
      const heroBackground = allImages[0] || '';
      const courseImage = allImages[1] || allImages[0] || '';
      
      // Build the landing page data object
      const landingPageData = {
        course_id: course.id,
        hero_background_url: heroBackground,
        course_image_url: courseImage,
        trailer_video_url: '', // Need to extract from content if present
        styles_image_desktop: allImages[2] || '',
        styles_image_mobile: allImages[3] || '',
        overview_heading: overviewHeading,
        course_overview: courseOverview,
        instrument_tag: 'Guitar', // Default, could be extracted
        course_includes: ['Synced Notation & Tab', 'Downloadable PDF Notation'],
        expert_name: expertName,
        expert_image_url: expertImage,
        expert_bio: expertBio,
        resources: resources,
        faqs: faqs.length > 0 ? faqs : [
          { question: 'Is there PDF notation and tab?', answer: 'Yes, each course includes notation and tab synchronised to the video lessons, which can also be downloaded as PDFs.' },
          { question: 'How long do I have to complete the course?', answer: 'Once enrolled, you have lifetime access, so you can complete the course at your own pace.' }
        ],
        learning_outcomes: []
      };
      
      addLog('--- EXTRACTED DATA ---');
      addLog(`Hero: ${heroBackground}`);
      addLog(`Course Image: ${courseImage}`);
      addLog(`Expert: ${expertName}`);
      addLog(`Overview paragraphs: ${courseOverview.length}`);
      addLog(`Resources: ${resources.length}`);
      addLog(`FAQs: ${faqs.length}`);
      
      // Save to database - upsert to handle existing records
      const { error: upsertError } = await supabase
        .from('course_landing_pages')
        .upsert(landingPageData, { onConflict: 'course_id' });
      
      if (upsertError) {
        addLog(`Error saving to database: ${upsertError.message}`);
        toast.error('Error saving landing page data');
        setImporting(false);
        return;
      }
      
      addLog('Landing page data saved to database successfully!');
      toast.success('Landing page imported and saved!');
      
    } catch (error) {
      console.error('Import error:', error);
      addLog(`Exception: ${(error as Error).message}`);
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
        
        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
            <TabsTrigger value="landing">Landing Page</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" className="space-y-4">
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
          </TabsContent>
          
          <TabsContent value="landing" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Landing Page JSONL Data</label>
              <Textarea
                value={landingPageText}
                onChange={(e) => setLandingPageText(e.target.value)}
                placeholder="Paste landing page JSONL here..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will extract hero images, course overview, expert info, resources, and FAQs. Images are auto-mapped to R2 URLs and saved to the database.
              </p>
            </div>
            
            <Button onClick={handleLandingPageImport} disabled={importing}>
              {importing ? "Importing..." : "Import Landing Page"}
            </Button>
          </TabsContent>
        </Tabs>
        
        {logs.length > 0 && (
          <ScrollArea className="h-64 border rounded-md p-2 bg-muted/50">
            <div className="text-xs font-mono space-y-1">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </ScrollArea>
        )}
        
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
