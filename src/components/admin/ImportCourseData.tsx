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

type ParsedEmbedItem = {
  title: string;
  kind: 'module' | 'lesson' | 'unknown';
  youtubeIds: string[];
  spotifyPaths: string[];
};

const normalizeTitleForMatch = (title: string): string => {
  const stripped = title
    .replace(/\s*\(\d{1,2}:\d{2}\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return stripped;
};

const looksLikeModuleTitle = (title: string): boolean => {
  const t = title.trim().toLowerCase();
  return /^module\s*\d+/.test(t) || t.startsWith('module ');
};

const extractYouTubeIdsFromText = (text: string): string[] => {
  const ids: string[] = [];
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!ids.includes(match[1])) ids.push(match[1]);
    }
  }
  return ids;
};

const extractSpotifyPathsFromText = (text: string): string[] => {
  const paths: string[] = [];
  const pattern = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(?:embed\/)?(track|album|playlist|artist)\/([a-zA-Z0-9]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const p = `${match[1]}/${match[2]}`;
    if (!paths.includes(p)) paths.push(p);
  }
  return paths;
};

const parseWordpressXmlForEmbeds = (xmlContent: string) => {
  const doc = new DOMParser().parseFromString(xmlContent, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));

  const parsed: ParsedEmbedItem[] = [];
  let youtubeEmbeds = 0;
  let spotifyEmbeds = 0;

  for (const item of items) {
    const title = (item.querySelector('title')?.textContent || '').trim();
    const postType = (item.querySelector('wp\\:post_type')?.textContent || '').trim();

    const contentNode = item.querySelector('content\\:encoded');
    const contentAlt = item.getElementsByTagName('content:encoded')?.[0];
    const content = (contentNode?.textContent || contentAlt?.textContent || '').toString();

    const youtubeIds = extractYouTubeIdsFromText(content);
    const spotifyPaths = extractSpotifyPathsFromText(content);

    if (youtubeIds.length) youtubeEmbeds += youtubeIds.length;
    if (spotifyPaths.length) spotifyEmbeds += spotifyPaths.length;

    if (!youtubeIds.length && !spotifyPaths.length) continue;

    let kind: ParsedEmbedItem['kind'] = 'unknown';
    if (postType === 'sfwd-lessons' || postType === 'sfwd-topic' || postType === 'sfwd-lesson') kind = 'lesson';
    if (looksLikeModuleTitle(title) || postType === 'sfwd-course') kind = 'module';

    parsed.push({ title, kind, youtubeIds, spotifyPaths });
  }

  return {
    items: parsed,
    summary: {
      totalItems: items.length,
      totalItemsWithEmbeds: parsed.length,
      youtubeEmbeds,
      spotifyEmbeds,
      vimeoEmbeds: 0,
      modulesWithEmbeds: parsed.filter((p) => p.kind === 'module').length,
      lessonsWithEmbeds: parsed.filter((p) => p.kind === 'lesson').length,
    },
  };
};

export function ImportCourseData() {
  const [courseTitle, setCourseTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [modulesText, setModulesText] = useState("");
  const [lessonsText, setLessonsText] = useState("");
  const [landingPageText, setLandingPageText] = useState("");
  const [wordpressXml, setWordpressXml] = useState("");
  const [xmlResults, setXmlResults] = useState<any>(null);
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

  const handleFileUpload = (setter: (text: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    setter(text);
    addLog(`Loaded file: ${file.name} (${(text.length / 1024).toFixed(1)} KB)`);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
            <TabsTrigger value="landing">Landing Page</TabsTrigger>
            <TabsTrigger value="wordpress">WordPress XML</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Modules JSONL Data</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="file"
                  accept=".jsonl,.ld,.json,.txt"
                  onChange={handleFileUpload(setModulesText)}
                  className="max-w-xs"
                />
                {modulesText && <span className="text-xs text-muted-foreground self-center">{(modulesText.length / 1024).toFixed(1)} KB loaded</span>}
              </div>
              <Textarea
                value={modulesText}
                onChange={(e) => setModulesText(e.target.value)}
                placeholder="Or paste modules JSONL here..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Lessons JSONL Data</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="file"
                  accept=".jsonl,.ld,.json,.txt"
                  onChange={handleFileUpload(setLessonsText)}
                  className="max-w-xs"
                />
                {lessonsText && <span className="text-xs text-muted-foreground self-center">{(lessonsText.length / 1024).toFixed(1)} KB loaded</span>}
              </div>
              <Textarea
                value={lessonsText}
                onChange={(e) => setLessonsText(e.target.value)}
                placeholder="Or paste lessons JSONL here..."
                rows={3}
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
          
          <TabsContent value="wordpress" className="space-y-4">
            <div>
              <label className="text-sm font-medium">WordPress XML Export</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload(setWordpressXml)}
                  className="max-w-xs"
                />
                {wordpressXml && <span className="text-xs text-muted-foreground self-center">{(wordpressXml.length / 1024 / 1024).toFixed(2)} MB loaded</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a WordPress XML export to extract YouTube and Spotify embeds from module and lesson pages.
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={async () => {
                  if (!wordpressXml) {
                    toast.error("Please upload an XML file first");
                    return;
                  }
                  setImporting(true);
                  setLogs([]);
                  addLog("Parsing WordPress XML (client-side)...");

                  try {
                    const parsed = parseWordpressXmlForEmbeds(wordpressXml);
                    const modulesWithEmbeds = parsed.items
                      .filter((p) => p.kind === 'module')
                      .slice(0, 50)
                      .map((p) => ({
                        title: p.title,
                        embeds: [
                          ...p.youtubeIds.map((id) => ({ type: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` })),
                          ...p.spotifyPaths.map((path) => ({ type: 'spotify', embedUrl: `https://open.spotify.com/embed/${path}` })),
                        ],
                      }));

                    setXmlResults({ summary: parsed.summary, modulesWithEmbeds });
                    addLog(`Found ${parsed.summary.totalItemsWithEmbeds} items with embeds`);
                    addLog(`YouTube embeds: ${parsed.summary.youtubeEmbeds}`);
                    addLog(`Spotify embeds: ${parsed.summary.spotifyEmbeds}`);
                    addLog(`Modules with embeds: ${parsed.summary.modulesWithEmbeds}`);
                    addLog(`Lessons with embeds: ${parsed.summary.lessonsWithEmbeds}`);
                    toast.success(`Found ${parsed.summary.youtubeEmbeds + parsed.summary.spotifyEmbeds} embeds`);
                  } catch (err) {
                    addLog(`Exception: ${(err as Error).message}`);
                    toast.error((err as Error).message);
                  }

                  setImporting(false);
                }}
                disabled={importing || !wordpressXml}
              >
                {importing ? "Processing..." : "Parse XML for Embeds"}
              </Button>

              <Button
                variant="default"
                onClick={async () => {
                  if (!wordpressXml) {
                    toast.error("Please upload an XML file first");
                    return;
                  }

                  setImporting(true);
                  setLogs([]);
                  addLog("Applying embeds to all modules/lessons from XML (client-side)...");

                  try {
                    const parsed = parseWordpressXmlForEmbeds(wordpressXml);

                    const [{ data: modules, error: modulesError }, { data: lessons, error: lessonsError }] = await Promise.all([
                      supabase.from('course_modules').select('id, title, description').limit(1000),
                      supabase.from('module_lessons').select('id, title, content').limit(1000),
                    ]);

                    if (modulesError) throw new Error(modulesError.message);
                    if (lessonsError) throw new Error(lessonsError.message);

                    const moduleMap = new Map<string, any>();
                    (modules || []).forEach((m: any) => moduleMap.set(normalizeTitleForMatch(m.title), m));

                    const lessonMap = new Map<string, any>();
                    (lessons || []).forEach((l: any) => lessonMap.set(normalizeTitleForMatch(l.title), l));

                    let modulesUpdated = 0;
                    let lessonsUpdated = 0;
                    let linksAddedToModules = 0;
                    let linksAddedToLessons = 0;
                    const notFoundSample: Array<{ kind: string; title: string }> = [];

                    for (const item of parsed.items) {
                      const key = normalizeTitleForMatch(item.title);
                      const urlLines = [
                        ...item.youtubeIds.map((id) => `https://www.youtube.com/watch?v=${id}`),
                        ...item.spotifyPaths.map((p) => `https://open.spotify.com/${p}`),
                      ];
                      if (!urlLines.length) continue;

                      const targetIsModule = item.kind === 'module' || (item.kind === 'unknown' && looksLikeModuleTitle(item.title));

                      if (targetIsModule && moduleMap.has(key)) {
                        const mod = moduleMap.get(key);
                        const existing = (mod.description || '').toString();
                        const toAdd = urlLines.filter((u) => !existing.includes(u));
                        if (!toAdd.length) continue;
                        const updated = (existing.trimEnd() + `\n${toAdd.join('\n')}`).trim();
                        const { error } = await supabase.from('course_modules').update({ description: updated }).eq('id', mod.id);
                        if (error) throw new Error(error.message);
                        modulesUpdated += 1;
                        linksAddedToModules += toAdd.length;
                        mod.description = updated;
                        continue;
                      }

                      if (lessonMap.has(key)) {
                        const les = lessonMap.get(key);
                        const existing = (les.content || '').toString();
                        const toAdd = urlLines.filter((u) => !existing.includes(u));
                        if (!toAdd.length) continue;
                        const updated = (existing.trimEnd() + `\n${toAdd.join('\n')}`).trim();
                        const { error } = await supabase.from('module_lessons').update({ content: updated }).eq('id', les.id);
                        if (error) throw new Error(error.message);
                        lessonsUpdated += 1;
                        linksAddedToLessons += toAdd.length;
                        les.content = updated;
                        continue;
                      }

                      if (moduleMap.has(key)) {
                        const mod = moduleMap.get(key);
                        const existing = (mod.description || '').toString();
                        const toAdd = urlLines.filter((u) => !existing.includes(u));
                        if (!toAdd.length) continue;
                        const updated = (existing.trimEnd() + `\n${toAdd.join('\n')}`).trim();
                        const { error } = await supabase.from('course_modules').update({ description: updated }).eq('id', mod.id);
                        if (error) throw new Error(error.message);
                        modulesUpdated += 1;
                        linksAddedToModules += toAdd.length;
                        mod.description = updated;
                        continue;
                      }

                      if (notFoundSample.length < 50) notFoundSample.push({ kind: item.kind, title: item.title });
                    }

                    addLog(`Items with embeds: ${parsed.summary.totalItemsWithEmbeds}`);
                    addLog(`Modules updated: ${modulesUpdated} (links added: ${linksAddedToModules})`);
                    addLog(`Lessons updated: ${lessonsUpdated} (links added: ${linksAddedToLessons})`);
                    if (notFoundSample.length > 0) {
                      addLog(`Not matched: ${notFoundSample.length} (showing up to 50)`);
                      notFoundSample.forEach((nf) => addLog(`  - ${nf.kind}: ${nf.title}`));
                    }

                    toast.success(`Applied embeds: ${modulesUpdated} modules, ${lessonsUpdated} lessons`);
                  } catch (err) {
                    addLog(`Exception: ${(err as Error).message}`);
                    toast.error((err as Error).message);
                  }

                  setImporting(false);
                }}
                disabled={importing || !wordpressXml}
              >
                {importing ? "Applying..." : "Apply Embeds to Modules/Lessons"}
              </Button>
              
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!wordpressXml) {
                    toast.error("Please upload an XML file first");
                    return;
                  }

                  const confirmed = window.confirm(
                    "⚠️ FULL REBUILD\n\nThis will DELETE all existing modules and lessons for matched courses, then recreate them from the XML.\n\nThis action cannot be undone.\n\nContinue?"
                  );
                  
                  if (!confirmed) return;

                  setImporting(true);
                  setLogs([]);
                  addLog("Starting full content rebuild from XML...");
                  addLog("Calling edge function with dryRun=false...");

                  try {
                    const { data, error } = await supabase.functions.invoke('full-content-sync', {
                      body: {
                        action: 'rebuild',
                        xmlContent: wordpressXml,
                        dryRun: false
                      }
                    });

                    if (error) {
                      addLog(`Error: ${error.message}`);
                      toast.error('Rebuild failed: ' + error.message);
                      setImporting(false);
                      return;
                    }

                    if (!data.success) {
                      addLog(`Failed: ${data.error}`);
                      toast.error(data.error || 'Rebuild failed');
                      setImporting(false);
                      return;
                    }

                    addLog(`=== REBUILD COMPLETE ===`);
                    addLog(`Courses processed: ${data.coursesProcessed}`);
                    addLog(`Modules deleted: ${data.modulesDeleted}`);
                    addLog(`Lessons deleted: ${data.lessonsDeleted}`);
                    addLog(`Modules created: ${data.modulesCreated}`);
                    addLog(`Lessons created: ${data.lessonsCreated}`);
                    
                    if (data.courseDetails?.length > 0) {
                      addLog(`\n--- Course Details ---`);
                      data.courseDetails.forEach((cd: any) => {
                        addLog(`${cd.course}: ${cd.modules} modules, ${cd.lessons} lessons`);
                      });
                    }
                    
                    if (data.errors?.length > 0) {
                      addLog(`\n--- Errors (${data.errors.length}) ---`);
                      data.errors.slice(0, 20).forEach((e: string) => addLog(`ERROR: ${e}`));
                      if (data.errors.length > 20) addLog(`... and ${data.errors.length - 20} more`);
                    }

                    toast.success(`Rebuild complete! ${data.modulesCreated} modules, ${data.lessonsCreated} lessons created`);
                  } catch (err) {
                    addLog(`Exception: ${(err as Error).message}`);
                    toast.error((err as Error).message);
                  }

                  setImporting(false);
                }}
                disabled={importing || !wordpressXml}
              >
                {importing ? "Rebuilding..." : "🔄 Full Rebuild (Delete & Recreate All)"}
              </Button>
              
              <Button
                variant="outline"
                onClick={async () => {
                  if (!wordpressXml) {
                    toast.error("Please upload an XML file first");
                    return;
                  }

                  setImporting(true);
                  setLogs([]);
                  addLog("Running DRY RUN rebuild preview...");

                  try {
                    const { data, error } = await supabase.functions.invoke('full-content-sync', {
                      body: {
                        action: 'rebuild',
                        xmlContent: wordpressXml,
                        dryRun: true
                      }
                    });

                    if (error) {
                      addLog(`Error: ${error.message}`);
                      toast.error('Preview failed: ' + error.message);
                      setImporting(false);
                      return;
                    }

                    if (!data.success) {
                      addLog(`Failed: ${data.error}`);
                      toast.error(data.error || 'Preview failed');
                      setImporting(false);
                      return;
                    }

                    addLog(`=== DRY RUN PREVIEW ===`);
                    addLog(`Courses to process: ${data.coursesProcessed}`);
                    addLog(`Total modules: ${data.courseDetails?.reduce((s: number, c: any) => s + c.modules, 0) || 0}`);
                    addLog(`Total lessons: ${data.courseDetails?.reduce((s: number, c: any) => s + c.lessons, 0) || 0}`);
                    
                    if (data.courseDetails?.length > 0) {
                      addLog(`\n--- Course Details ---`);
                      data.courseDetails.forEach((cd: any) => {
                        addLog(`${cd.course}: ${cd.modules} modules, ${cd.lessons} lessons`);
                      });
                    }

                    toast.success(`Preview: Would create ${data.courseDetails?.reduce((s: number, c: any) => s + c.modules, 0) || 0} modules, ${data.courseDetails?.reduce((s: number, c: any) => s + c.lessons, 0) || 0} lessons`);
                  } catch (err) {
                    addLog(`Exception: ${(err as Error).message}`);
                    toast.error((err as Error).message);
                  }

                  setImporting(false);
                }}
                disabled={importing || !wordpressXml}
              >
                {importing ? "Checking..." : "👁️ Preview Rebuild (Dry Run)"}
              </Button>
            </div>
            
            {xmlResults && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Extraction Results</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total items: {xmlResults.summary?.totalItems}</div>
                  <div>YouTube: {xmlResults.summary?.youtubeEmbeds}</div>
                  <div>Spotify: {xmlResults.summary?.spotifyEmbeds}</div>
                  <div>Vimeo: {xmlResults.summary?.vimeoEmbeds}</div>
                </div>
                {xmlResults.modulesWithEmbeds?.length > 0 && (
                  <div className="mt-2">
                    <h5 className="text-sm font-medium">Modules with Embeds:</h5>
                    <ScrollArea className="h-32 mt-1">
                      <div className="text-xs space-y-1">
                        {xmlResults.modulesWithEmbeds.map((m: any, i: number) => (
                          <div key={i} className="p-1 bg-background rounded">
                            <span className="font-medium">{m.title}</span>
                            <span className="text-muted-foreground ml-2">
                              {m.embeds.map((e: any) => `${e.type}: ${e.embedUrl.substring(0, 40)}...`).join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
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
