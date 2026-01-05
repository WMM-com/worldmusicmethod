import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Preset URL templates based on instrument type
const PRESET_URLS: Record<string, string> = {
  'Code 1: Guitar, bass, vocals': 'enable_waveform=0&force_side_video=1&side_video_width=60p&layout=1&narrow_video_height=50p',
  'Code 2: Flute': 'enable_waveform=0&enable_fretboard=0&enable_transposition=0&force_side_video=1&side_video_width=60p&layout=1&narrow_video_height=50p',
  'Code 3: Drums': 'enable_waveform=0&force_side_video=1&side_video_width=60p&layout=1&narrow_video_height=50p&enable_transposition=0',
  'Code 4: Backing Track': 'enable_waveform=0&enable_fretboard=0&settings=1',
};

// Normalize strings for matching
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[''""]/g, '') // Remove smart quotes
    .replace(/[\u2013\u2014]/g, '-') // Replace en/em dashes with hyphen
    .replace(/â€"/g, '-') // Handle encoding issues
    .replace(/â€™/g, "'") // Handle apostrophe encoding
    .replace(/â€œ|â€/g, '"') // Handle quote encoding
    .replace(/ã©/g, 'e') // Handle accented e
    .replace(/ã³/g, 'o') // Handle accented o
    .replace(/ã¡/g, 'a') // Handle accented a
    .replace(/ã/g, 'a') // Handle other a accents
    .replace(/é/g, 'e')
    .replace(/ó/g, 'o')
    .replace(/á/g, 'a')
    .replace(/ñ/g, 'n')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/lesson\s*\d+\s*[-–—]?\s*/gi, '') // Remove "Lesson X -"
    .replace(/^\d+[\.\)\-–—]?\s*/g, '') // Remove leading numbers like "1." or "1 -"
    .replace(/\s*[-–—]\s*\d+[:\.]?\d*\s*$/g, '') // Remove trailing timestamps like "- 4.40"
    .replace(/\s+/g, ' ')
    .trim();
}

// Clean the 5-character code from the spreadsheet
function cleanCode(code: string): string {
  if (!code) return '';
  // Remove surrounding quotes that Excel added
  return code.replace(/^['"]|['"]$/g, '').trim();
}

// Map course names from spreadsheet to database
function mapCourseName(spreadsheetName: string): string {
  const mappings: Record<string, string> = {
    'Backing Track Directory': 'The Backing Track Directory',
    'Argentinian Fingerstyle Guitar': 'Argentinian Fingerstyle Guitar',
    'African Bass Masterclass (Extended)': 'African Bass Masterclass (Extended)',
    'African Bass Masterclass: Egypt & Zimbabwe': 'African Bass Masterclass: Egypt & Zimbabwe',
    'Colombian Gaita Mastery (Extended)': 'Colombian Gaita Mastery (Extended)',
    'Congolese Drum Kit Rhythms (Extended)': 'Congolese Drum Kit Rhythms (Extended)',
    'Brazilian Drum Kit Rhythms (Extended)': 'Brazilian Drum Kit Rhythms (Extended)',
    'Ultimate Flamenco Guitar (Extended)': 'Ultimate Flamenco Guitar (Extended)',
    'Flamenco Cajon Rhythms': 'Flamenco Cajón Rhythms',
  };
  return mappings[spreadsheetName] || spreadsheetName;
}

interface SpreadsheetEntry {
  courseName: string;
  lessonName: string;
  preset: string;
  code: string;
}

interface DbLesson {
  id: string;
  title: string;
  video_url: string | null;
  course_title: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { spreadsheetData, dryRun = true } = await req.json();

    if (!spreadsheetData || !Array.isArray(spreadsheetData)) {
      return new Response(
        JSON.stringify({ error: 'spreadsheetData array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse spreadsheet entries
    const entries: SpreadsheetEntry[] = spreadsheetData.map((row: any) => ({
      courseName: mapCourseName(row.courseName?.trim() || ''),
      lessonName: row.lessonName?.trim() || '',
      preset: row.preset?.trim() || '',
      code: cleanCode(row.code || ''),
    })).filter((e: SpreadsheetEntry) => e.code && e.lessonName);

    console.log(`Parsed ${entries.length} valid entries from spreadsheet`);

    // Fetch all lessons from database
    const { data: lessons, error: lessonsError } = await supabase
      .from('module_lessons')
      .select(`
        id,
        title,
        video_url,
        course_modules!inner (
          courses!inner (
            title
          )
        )
      `);

    if (lessonsError) {
      throw new Error(`Failed to fetch lessons: ${lessonsError.message}`);
    }

    // Flatten lesson data
    const dbLessons: DbLesson[] = lessons.map((l: any) => ({
      id: l.id,
      title: l.title,
      video_url: l.video_url,
      course_title: l.course_modules.courses.title,
    }));

    console.log(`Found ${dbLessons.length} lessons in database`);

    // Build lookup by normalized course + lesson
    const dbLookup = new Map<string, DbLesson[]>();
    for (const lesson of dbLessons) {
      const key = normalize(lesson.course_title);
      if (!dbLookup.has(key)) {
        dbLookup.set(key, []);
      }
      dbLookup.get(key)!.push(lesson);
    }

    const updates: { id: string; video_url: string; matchInfo: string }[] = [];
    const notFound: { courseName: string; lessonName: string }[] = [];
    const alreadyCorrect: { lessonName: string; code: string }[] = [];

    for (const entry of entries) {
      const normalizedCourse = normalize(entry.courseName);
      const normalizedLesson = normalize(entry.lessonName);
      
      // Try exact course match first
      let courseLessons = dbLookup.get(normalizedCourse);
      
      // If not found, try partial match
      if (!courseLessons) {
        for (const [key, value] of dbLookup.entries()) {
          if (key.includes(normalizedCourse) || normalizedCourse.includes(key)) {
            courseLessons = value;
            break;
          }
        }
      }

      if (!courseLessons) {
        notFound.push({ courseName: entry.courseName, lessonName: entry.lessonName });
        continue;
      }

      // Find matching lesson
      let matchedLesson: DbLesson | null = null;
      let matchScore = 0;

      for (const lesson of courseLessons) {
        const normalizedDbTitle = normalize(lesson.title);
        
        // Exact match
        if (normalizedDbTitle === normalizedLesson) {
          matchedLesson = lesson;
          matchScore = 100;
          break;
        }

        // Contains match - lesson title contains spreadsheet name or vice versa
        if (normalizedDbTitle.includes(normalizedLesson) || normalizedLesson.includes(normalizedDbTitle)) {
          const score = Math.min(normalizedDbTitle.length, normalizedLesson.length) / 
                        Math.max(normalizedDbTitle.length, normalizedLesson.length) * 90;
          if (score > matchScore) {
            matchedLesson = lesson;
            matchScore = score;
          }
        }

        // Word overlap match
        const dbWords = new Set(normalizedDbTitle.split(/\s+/).filter(w => w.length > 2));
        const entryWords = normalizedLesson.split(/\s+/).filter(w => w.length > 2);
        const overlap = entryWords.filter(w => dbWords.has(w)).length;
        const overlapScore = (overlap / Math.max(dbWords.size, entryWords.length)) * 80;
        
        if (overlapScore > matchScore && overlapScore > 50) {
          matchedLesson = lesson;
          matchScore = overlapScore;
        }
      }

      if (!matchedLesson) {
        notFound.push({ courseName: entry.courseName, lessonName: entry.lessonName });
        continue;
      }

      // Build the Soundslice URL
      const params = PRESET_URLS[entry.preset] || PRESET_URLS['Code 1: Guitar, bass, vocals'];
      const newUrl = `https://www.soundslice.com/slices/${entry.code}/?${params}`;

      // Check if already correct
      if (matchedLesson.video_url === newUrl) {
        alreadyCorrect.push({ lessonName: matchedLesson.title, code: entry.code });
        continue;
      }

      updates.push({
        id: matchedLesson.id,
        video_url: newUrl,
        matchInfo: `"${entry.lessonName}" → "${matchedLesson.title}" (score: ${matchScore.toFixed(0)})`
      });
    }

    console.log(`Found ${updates.length} lessons to update, ${alreadyCorrect.length} already correct, ${notFound.length} not found`);

    // Perform updates if not dry run
    let updated = 0;
    if (!dryRun && updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from('module_lessons')
          .update({ video_url: update.video_url })
          .eq('id', update.id);
        
        if (error) {
          console.error(`Failed to update ${update.id}: ${error.message}`);
        } else {
          updated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: {
          totalEntries: entries.length,
          toUpdate: updates.length,
          alreadyCorrect: alreadyCorrect.length,
          notFound: notFound.length,
          updated: dryRun ? 0 : updated,
        },
        updates: updates.slice(0, 50), // Limit output
        notFound: notFound.slice(0, 50),
        alreadyCorrect: alreadyCorrect.slice(0, 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
