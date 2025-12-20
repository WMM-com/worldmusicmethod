const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LessonData {
  title: string;
  url: string;
  soundsliceId: string | null;
  orderIndex: number;
}

interface ModuleData {
  title: string;
  description?: string;
  lessons: LessonData[];
}

interface CourseData {
  title: string;
  description: string;
  modules: ModuleData[];
  tutorName: string;
  tutorBio: string[];
  courseOverview: string[];
  learningOutcomes: string[];
}

// Extract Soundslice ID from HTML content
function extractSoundsliceId(html: string): string | null {
  // Pattern: src="https://www.soundslice.com/slices/XXXX/embed/
  const match = html.match(/soundslice\.com\/slices\/([^\/]+)\/embed/);
  return match ? match[1] : null;
}

// Extract lesson title from HTML
function extractLessonTitle(html: string): string {
  // Look for h1 tag in the lesson content
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return h1Match ? h1Match[1].trim() : 'Untitled Lesson';
}

// Fetch a single lesson page and extract data
async function fetchLesson(url: string, orderIndex: number): Promise<LessonData> {
  try {
    console.log(`Fetching lesson: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WMM-Scraper/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return {
        title: url.split('/').filter(Boolean).pop() || 'Unknown',
        url,
        soundsliceId: null,
        orderIndex,
      };
    }
    
    const html = await response.text();
    const soundsliceId = extractSoundsliceId(html);
    const title = extractLessonTitle(html);
    
    console.log(`Extracted: ${title} -> ${soundsliceId}`);
    
    return {
      title,
      url,
      soundsliceId,
      orderIndex,
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return {
      title: url.split('/').filter(Boolean).pop() || 'Unknown',
      url,
      soundsliceId: null,
      orderIndex,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseUrl, lessonUrls } = await req.json();

    if (!lessonUrls || !Array.isArray(lessonUrls)) {
      return new Response(
        JSON.stringify({ success: false, error: 'lessonUrls array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping ${lessonUrls.length} lessons...`);

    // Fetch all lessons in parallel (with concurrency limit)
    const BATCH_SIZE = 5;
    const results: LessonData[] = [];
    
    for (let i = 0; i < lessonUrls.length; i += BATCH_SIZE) {
      const batch = lessonUrls.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((url: string, idx: number) => fetchLesson(url, i + idx))
      );
      results.push(...batchResults);
      
      // Small delay between batches to be respectful
      if (i + BATCH_SIZE < lessonUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        lessons: results,
        totalScraped: results.length,
        withSoundslice: results.filter(r => r.soundsliceId).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in scrape-wordpress-course:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
