import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PodcastEpisode {
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration_seconds: number | null;
  release_date: string | null;
  episode_number: number | null;
}

function parseDuration(durationStr: string | null): number | null {
  if (!durationStr) return null;
  
  // Handle HH:MM:SS format
  if (durationStr.includes(':')) {
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }
  
  // Handle plain seconds
  const seconds = parseInt(durationStr, 10);
  return isNaN(seconds) ? null : seconds;
}

function extractCDATA(text: string | null): string | null {
  if (!text) return null;
  // Remove CDATA wrappers
  return text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim();
}

// Simple regex-based XML parser for RSS feeds
function parseRSS(xmlText: string) {
  const getTagContent = (xml: string, tag: string): string | null => {
    // Handle namespaced tags like itunes:author
    const escapedTag = tag.replace(/:/g, '\\:');
    const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
    const match = xml.match(regex);
    if (match) {
      return extractCDATA(match[1].trim());
    }
    return null;
  };

  const getAttribute = (xml: string, tag: string, attr: string): string | null => {
    const escapedTag = tag.replace(/:/g, '\\:');
    const regex = new RegExp(`<${escapedTag}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  };

  const getEnclosureUrl = (xml: string): string | null => {
    const regex = /<enclosure[^>]*url=["']([^"']*)["'][^>]*>/i;
    const match = xml.match(regex);
    return match ? match[1] : null;
  };

  // Get channel content
  const channelMatch = xmlText.match(/<channel[^>]*>([\s\S]*)<\/channel>/i);
  if (!channelMatch) {
    return null;
  }
  const channelContent = channelMatch[1];

  // Parse channel metadata
  const feedTitle = getTagContent(channelContent, 'title');
  const feedDescription = getTagContent(channelContent, 'description');
  const feedAuthor = getTagContent(channelContent, 'itunes:author') || getTagContent(channelContent, 'author');
  const feedImage = getAttribute(channelContent, 'itunes:image', 'href') || 
                    getTagContent(channelContent, 'image')?.match(/<url>([^<]*)<\/url>/i)?.[1] ||
                    null;

  // Parse items
  const items: PodcastEpisode[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  // Collect all items first
  const allItems: string[] = [];
  while ((itemMatch = itemRegex.exec(channelContent)) !== null) {
    allItems.push(itemMatch[1]);
  }
  
  // Sort items by pubDate in ascending order (oldest first) to assign episode numbers correctly
  const itemsWithDates = allItems.map(itemContent => {
    const pubDate = getTagContent(itemContent, 'pubDate');
    return {
      content: itemContent,
      date: pubDate ? new Date(pubDate).getTime() : 0,
    };
  }).sort((a, b) => a.date - b.date);

  // Assign episode numbers in chronological order (oldest = 1)
  let episodeNumber = 1;

  for (const { content: itemContent } of itemsWithDates) {
    const title = getTagContent(itemContent, 'title');
    const description = getTagContent(itemContent, 'description') || getTagContent(itemContent, 'itunes:summary');
    const audioUrl = getEnclosureUrl(itemContent);
    const episodeImage = getAttribute(itemContent, 'itunes:image', 'href') || feedImage;
    const durationStr = getTagContent(itemContent, 'itunes:duration');
    const pubDate = getTagContent(itemContent, 'pubDate');

    if (title && audioUrl) {
      items.push({
        title,
        description,
        audio_url: audioUrl,
        cover_image_url: episodeImage,
        duration_seconds: parseDuration(durationStr),
        release_date: pubDate ? new Date(pubDate).toISOString() : null,
        episode_number: episodeNumber++,
      });
    }
  }

  return {
    title: feedTitle,
    description: feedDescription,
    author: feedAuthor,
    image: feedImage,
    episodes: items,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { podcastId } = await req.json();
    
    if (!podcastId) {
      return new Response(
        JSON.stringify({ error: 'podcastId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get podcast details
    const { data: podcast, error: podcastError } = await supabase
      .from('media_podcasts')
      .select('*')
      .eq('id', podcastId)
      .single();

    if (podcastError || !podcast) {
      console.error('Podcast not found:', podcastError);
      return new Response(
        JSON.stringify({ error: 'Podcast not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!podcast.rss_url) {
      return new Response(
        JSON.stringify({ error: 'Podcast has no RSS URL configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching RSS from: ${podcast.rss_url}`);

    // Fetch RSS feed
    const rssResponse = await fetch(podcast.rss_url, {
      headers: {
        'User-Agent': 'WorldMusicMethod/1.0 Podcast Fetcher',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!rssResponse.ok) {
      console.error('RSS fetch failed:', rssResponse.status, rssResponse.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch RSS: ${rssResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rssText = await rssResponse.text();
    console.log(`RSS response length: ${rssText.length} characters`);

    // Parse RSS using regex-based parser
    const parsed = parseRSS(rssText);
    
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse RSS XML - no channel found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Podcast: ${parsed.title}, Author: ${parsed.author}, Image: ${parsed.image}`);
    console.log(`Found ${parsed.episodes.length} episodes`);

    // Update podcast record with fresh metadata
    const updateData: Record<string, any> = {
      last_fetched_at: new Date().toISOString(),
    };
    
    if (parsed.title && !podcast.title) updateData.title = parsed.title;
    if (parsed.description && !podcast.description) updateData.description = parsed.description;
    if (parsed.author && !podcast.author) updateData.author = parsed.author;
    if (parsed.image && !podcast.cover_image_url) updateData.cover_image_url = parsed.image;

    await supabase
      .from('media_podcasts')
      .update(updateData)
      .eq('id', podcastId);

    // Get existing tracks for this podcast
    const { data: existingTracks } = await supabase
      .from('media_tracks')
      .select('audio_url')
      .eq('podcast_id', podcastId);

    const existingUrls = new Set(existingTracks?.map(t => t.audio_url) || []);

    // Filter new episodes
    const newEpisodes = parsed.episodes.filter(ep => !existingUrls.has(ep.audio_url));
    console.log(`${newEpisodes.length} new episodes to insert`);

    // Insert new episodes with podcast author as fallback for artist_name field
    if (newEpisodes.length > 0) {
      const tracksToInsert = newEpisodes.map(ep => ({
        title: ep.title,
        description: ep.description,
        audio_url: ep.audio_url,
        cover_image_url: ep.cover_image_url,
        duration_seconds: ep.duration_seconds,
        release_date: ep.release_date,
        episode_number: ep.episode_number,
        podcast_id: podcastId,
        media_type: 'audio',
        content_type: 'podcast_episode',
        is_published: true,
        // Note: artist_name is stored in podcast.author - tracks use podcast relation
      }));

      const { error: insertError } = await supabase
        .from('media_tracks')
        .insert(tracksToInsert);

      if (insertError) {
        console.error('Error inserting episodes:', insertError);
        return new Response(
          JSON.stringify({ error: `Failed to save episodes: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${newEpisodes.length} new episodes`,
        totalEpisodes: parsed.episodes.length,
        newEpisodes: newEpisodes.length,
        podcastTitle: parsed.title,
        podcastImage: parsed.image,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing podcast RSS:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});