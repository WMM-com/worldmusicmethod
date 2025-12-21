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

export function ImportCourseData() {
  const [courseTitle, setCourseTitle] = useState("Argentinian Fingerstyle Guitar");
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
      
      // Parse the landing page JSONL
      const lines = landingPageText.split('\n').filter(l => l.trim());
      let landingData: any = null;
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const title = data.wp_post?.post_title || '';
          
          // Match the course by title
          if (title.toLowerCase().includes(courseTitle.toLowerCase().split(' ')[0])) {
            landingData = data;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!landingData) {
        addLog('No matching landing page found in data');
        toast.error('No matching landing page found');
        setImporting(false);
        return;
      }
      
      addLog(`Found landing page: ${landingData.wp_post?.post_title}`);
      
      const content = landingData.wp_post?.post_content || '';
      
      // Extract images and map to R2
      const imageUrls: string[] = [];
      const imgPattern = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi;
      let match;
      while ((match = imgPattern.exec(content)) !== null) {
        imageUrls.push(match[0]);
      }
      
      addLog(`Found ${imageUrls.length} images in content`);
      
      // Extract sections
      const sections: { title: string; content: string }[] = [];
      
      // Look for headings and their content
      const headingPattern = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
      const matches = [...content.matchAll(headingPattern)];
      
      for (const m of matches) {
        sections.push({ title: m[1], content: '' });
      }
      
      addLog(`Found ${sections.length} sections`);
      
      // Log extracted data for review
      addLog('--- EXTRACTED DATA ---');
      addLog(`Title: ${landingData.wp_post?.post_title}`);
      addLog(`Images: ${imageUrls.slice(0, 5).join(', ')}${imageUrls.length > 5 ? '...' : ''}`);
      addLog(`Sections: ${sections.map(s => s.title).join(', ')}`);
      
      // Convert image URLs to R2 format if they match our domain
      const r2Images = imageUrls.map(url => {
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
      });
      
      addLog(`R2 image URLs: ${r2Images.slice(0, 3).join(', ')}${r2Images.length > 3 ? '...' : ''}`);
      
      toast.success('Landing page data parsed! Check logs for details. Manual configuration in CourseLanding.tsx required.');
      
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
                This will extract images and sections. Images are auto-mapped to R2 URLs.
              </p>
            </div>
            
            <Button onClick={handleLandingPageImport} disabled={importing}>
              {importing ? "Parsing..." : "Parse Landing Page Data"}
            </Button>
          </TabsContent>
        </Tabs>
        
        {logs.length > 0 && (
          <ScrollArea className="h-48 border rounded-md p-2 bg-muted/50">
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
