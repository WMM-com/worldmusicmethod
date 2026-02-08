import { useMemo } from 'react';
import { Headphones } from 'lucide-react';
import parse, { domToReact, Element, type HTMLReactParserOptions } from 'html-react-parser';
import DOMPurify from 'dompurify';

interface SuggestedListeningBlockProps {
  content: string;
}

/**
 * Renders cleaned suggested-listening HTML with site-themed styling,
 * responsive Spotify / YouTube embeds, and music-note track lists.
 */
export function SuggestedListeningBlock({ content }: SuggestedListeningBlockProps) {
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(content, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'loading', 'src', 'width', 'height', 'title'],
    });
  }, [content]);

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (!(domNode instanceof Element)) return;

      // Style YouTube embeds responsively
      if (domNode.name === 'div' && domNode.attribs?.class?.includes('sl-embed--youtube')) {
        return (
          <div className="my-6 max-w-4xl">
            <div className="aspect-video rounded-2xl overflow-hidden shadow-lg bg-black/10">
              {domToReact(domNode.children as any, options)}
            </div>
          </div>
        );
      }

      // Style Spotify embeds
      if (domNode.name === 'div' && domNode.attribs?.class?.includes('sl-embed--spotify')) {
        return (
          <div className="my-5 max-w-2xl">
            <div className="rounded-2xl overflow-hidden shadow-md">
              {domToReact(domNode.children as any, options)}
            </div>
          </div>
        );
      }

      // Style iframes
      if (domNode.name === 'iframe') {
        const src = domNode.attribs?.src || '';
        const isYoutube = src.includes('youtube');
        return (
          <iframe
            src={src}
            title={domNode.attribs?.title || 'Embedded content'}
            allow={domNode.attribs?.allow || ''}
            allowFullScreen={domNode.attribs?.allowfullscreen !== undefined}
            loading="lazy"
            className={isYoutube ? 'w-full h-full border-0' : 'w-full border-0 rounded-xl'}
            height={isYoutube ? undefined : '152'}
          />
        );
      }

      // Style section headings
      if (domNode.name === 'h3' && domNode.attribs?.class?.includes('sl-section-heading')) {
        return (
          <h3 className="text-xl font-bold text-foreground mt-8 mb-2 first:mt-0 border-b border-border/40 pb-2">
            {domToReact(domNode.children as any, options)}
          </h3>
        );
      }

      // Style section subtitles
      if (domNode.name === 'p' && domNode.attribs?.class?.includes('sl-section-subtitle')) {
        return (
          <p className="text-sm text-muted-foreground italic mb-4">
            {domToReact(domNode.children as any, options)}
          </p>
        );
      }

      // Style paragraphs
      if (domNode.name === 'p' && domNode.attribs?.class?.includes('sl-paragraph')) {
        return (
          <p className="text-sm leading-relaxed text-muted-foreground mb-3">
            {domToReact(domNode.children as any, options)}
          </p>
        );
      }

      // Style track lists
      if (domNode.name === 'ul' && domNode.attribs?.class?.includes('sl-track-list')) {
        return (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-4">
            {domToReact(domNode.children as any, options)}
          </ul>
        );
      }

      // Style track items
      if (domNode.name === 'li' && domNode.attribs?.class?.includes('sl-track-item')) {
        return (
          <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group">
            <span className="mt-0.5 text-primary shrink-0" aria-hidden="true">♪</span>
            <div className="flex flex-col min-w-0">
              {domToReact(domNode.children as any, options)}
            </div>
          </li>
        );
      }

      // Style track title
      if (domNode.name === 'span' && domNode.attribs?.class?.includes('sl-track-title')) {
        return (
          <span className="text-sm font-medium text-foreground leading-tight">
            {domToReact(domNode.children as any, options)}
          </span>
        );
      }

      // Style track artist
      if (domNode.name === 'span' && domNode.attribs?.class?.includes('sl-track-artist')) {
        return (
          <span className="text-xs text-muted-foreground leading-tight">
            {domToReact(domNode.children as any, options)}
          </span>
        );
      }

      // Style images
      if (domNode.name === 'img') {
        return (
          <img
            src={domNode.attribs?.src}
            alt={domNode.attribs?.alt || 'Suggested listening'}
            className="max-w-full rounded-2xl shadow-md my-4"
            loading="lazy"
          />
        );
      }

      return undefined;
    },
  };

  return (
    <div className="sl-block rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Suggested Listening</h2>
          <p className="text-xs text-muted-foreground">Curated tracks to complement your learning</p>
        </div>
      </div>

      {/* Content */}
      <div className="sl-content">
        {parse(sanitized, options)}
      </div>
    </div>
  );
}
