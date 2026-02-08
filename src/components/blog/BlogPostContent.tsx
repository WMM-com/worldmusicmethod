import { useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import parse, { domToReact, HTMLReactParserOptions, Element, DOMNode } from 'html-react-parser';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YouTubeEmbed } from '@/components/blog/embeds/YouTubeEmbed';
import { SocialEmbed } from '@/components/blog/embeds/SocialEmbed';
import { preprocessContent } from '@/components/blog/embeds/contentPreprocessor';

interface BlogPostContentProps {
  content: string;
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // Sanitize allowing iframes for embeds (YouTube, Spotify, SoundCloud, social)
  const sanitized = DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'allow', 'allowfullscreen', 'frameborder', 'scrolling',
      'src', 'title', 'loading',
      'data-youtube-embed', 'data-social-embed', 'data-social-src',
    ],
  });

  // Pre-process: convert plain URLs & iframes into data-attribute divs
  const processed = preprocessContent(sanitized);

  // html-react-parser options to inject React components
  const parserOptions: HTMLReactParserOptions = {
    replace(domNode) {
      if (!(domNode instanceof Element) || domNode.type !== 'tag') return;

      // YouTube embed
      const ytId = domNode.attribs?.['data-youtube-embed'];
      if (ytId) {
        return <YouTubeEmbed videoId={ytId} title="YouTube Video" />;
      }

      // Social embed
      const socialPlatform = domNode.attribs?.['data-social-embed'] as
        | 'instagram'
        | 'facebook'
        | 'tiktok'
        | undefined;
      const socialSrc = domNode.attribs?.['data-social-src'];
      if (socialPlatform && socialSrc) {
        return <SocialEmbed platform={socialPlatform} src={socialSrc} />;
      }

      // Wrap bare iframes that aren't already in a wrapper
      if (domNode.name === 'iframe') {
        const src = domNode.attribs?.src || '';
        // YouTube iframes that slipped through
        const ytMatch = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/);
        if (ytMatch) {
          return <YouTubeEmbed videoId={ytMatch[1]} title="YouTube Video" />;
        }

        // Spotify – keep as responsive iframe
        if (/spotify\.com/i.test(src)) {
          return (
            <div className="blog-embed blog-embed--spotify">
              {domToReact([domNode as unknown as DOMNode], parserOptions)}
            </div>
          );
        }

        // SoundCloud
        if (/soundcloud\.com/i.test(src)) {
          return (
            <div className="blog-embed blog-embed--audio">
              {domToReact([domNode as unknown as DOMNode], parserOptions)}
            </div>
          );
        }

        // Generic iframe → responsive wrapper
        return (
          <div className="blog-embed blog-embed--generic">
            {domToReact([domNode as unknown as DOMNode], parserOptions)}
          </div>
        );
      }

      return undefined;
    },
  };

  return (
    <div className="relative">
      {/* Content wrapper with truncation */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isExpanded
            ? 'max-h-none overflow-visible'
            : 'max-h-[500px] sm:max-h-[650px] overflow-hidden'
        }`}
      >
        <article
          ref={articleRef}
          className="blog-content prose prose-invert prose-lg max-w-none
            prose-headings:font-display prose-headings:text-foreground prose-headings:tracking-tight
            prose-h1:text-3xl sm:prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-5
            prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
            prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-5
            prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:marker:text-secondary
            prose-strong:text-foreground prose-strong:font-semibold
            prose-blockquote:border-l-4 prose-blockquote:border-secondary prose-blockquote:bg-card/50
            prose-blockquote:rounded-r-lg prose-blockquote:py-4 prose-blockquote:px-6
            prose-blockquote:text-foreground prose-blockquote:not-italic
            prose-blockquote:font-medium prose-blockquote:text-lg
            prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
            prose-ul:space-y-2 prose-ol:space-y-2
            prose-hr:border-border prose-hr:my-8
            prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl
            prose-code:text-secondary prose-code:font-mono
            prose-table:border-collapse prose-th:bg-card prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-2
            prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2
            prose-figure:my-8
            prose-figcaption:text-center prose-figcaption:text-muted-foreground prose-figcaption:text-sm prose-figcaption:mt-2"
        >
          {parse(processed, parserOptions)}
        </article>
      </div>

      {/* Gradient overlay + Read Full Blog button (only when collapsed) */}
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          isExpanded ? 'opacity-0 pointer-events-none h-0' : 'opacity-100'
        }`}
      >
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="bg-background pb-2 flex justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsExpanded(true)}
                className="gap-2"
              >
                Read Full Blog
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Show Less button (only when expanded) */}
      {isExpanded && (
        <div className="flex justify-center mt-8">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsExpanded(false)}
            className="gap-2"
          >
            Show Less
            <ChevronUp className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
