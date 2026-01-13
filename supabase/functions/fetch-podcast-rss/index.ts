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

function getElementText(item: any, tagName: string): string | null {
  const element = item.querySelector(tagName) || item.getElementsByTagName?.(tagName)?.[0];
  return element ? extractCDATA(element.textContent) : null;
}

function getAttributeValue(item: any, tagName: string, attribute: string): string | null {
  const element = item.querySelector(tagName) || item.getElementsByTagName?.(tagName)?.[0];
  return element?.getAttribute(attribute) || null;
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

    // Parse XML using DOMParser
    const { DOMParser } = await import("https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts");
    const doc = new DOMParser().parseFromString(rssText, 'text/xml');
    
    if (!doc) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse RSS XML' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get channel info
    const channel = doc.querySelector('channel');
    if (!channel) {
      return new Response(
        JSON.stringify({ error: 'Invalid RSS: no channel element found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update podcast metadata from feed
    const feedTitle = getElementText(channel, 'title');
    const feedDescription = getElementText(channel, 'description');
    const feedAuthor = getElementText(channel, 'itunes\\:author') || getElementText(channel, 'author');
    const feedImage = getAttributeValue(channel, 'itunes\\:image', 'href') || 
                      getElementText(channel, 'image > url');

    console.log(`Podcast: ${feedTitle}, Author: ${feedAuthor}, Image: ${feedImage}`);

    // Update podcast record with fresh metadata
    const updateData: Record<string, any> = {
      last_fetched_at: new Date().toISOString(),
    };
    
    if (feedTitle && !podcast.title) updateData.title = feedTitle;
    if (feedDescription && !podcast.description) updateData.description = feedDescription;
    if (feedAuthor && !podcast.author) updateData.author = feedAuthor;
    if (feedImage && !podcast.cover_image_url) updateData.cover_image_url = feedImage;

    await supabase
      .from('media_podcasts')
      .update(updateData)
      .eq('id', podcastId);

    // Parse episodes
    const items = channel.querySelectorAll('item');
    console.log(`Found ${items.length} episodes`);

    const episodes: PodcastEpisode[] = [];
    let episodeNumber = items.length;

    for (const item of items) {
      const title = getElementText(item, 'title');
      const description = getElementText(item, 'description') || getElementText(item, 'itunes\\:summary');
      const audioUrl = getAttributeValue(item, 'enclosure', 'url');
      const episodeImage = getAttributeValue(item, 'itunes\\:image', 'href') || feedImage;
      const durationStr = getElementText(item, 'itunes\\:duration');
      const pubDate = getElementText(item, 'pubDate');

      if (!title || !audioUrl) {
        console.log(`Skipping episode: missing title or audio URL`);
        continue;
      }

      episodes.push({
        title,
        description,
        audio_url: audioUrl,
        cover_image_url: episodeImage || null,
        duration_seconds: parseDuration(durationStr),
        release_date: pubDate ? new Date(pubDate).toISOString() : null,
        episode_number: episodeNumber--,
      });
    }

    console.log(`Parsed ${episodes.length} valid episodes`);

    // Get existing tracks for this podcast
    const { data: existingTracks } = await supabase
      .from('media_tracks')
      .select('audio_url')
      .eq('podcast_id', podcastId);

    const existingUrls = new Set(existingTracks?.map(t => t.audio_url) || []);

    // Filter new episodes
    const newEpisodes = episodes.filter(ep => !existingUrls.has(ep.audio_url));
    console.log(`${newEpisodes.length} new episodes to insert`);

    // Insert new episodes
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
        totalEpisodes: episodes.length,
        newEpisodes: newEpisodes.length,
        podcastTitle: feedTitle,
        podcastImage: feedImage,
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
