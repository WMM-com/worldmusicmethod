import DOMPurify from 'dompurify';
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';
import { YouTubeEmbed } from '@/components/blog/embeds/YouTubeEmbed';
import { preprocessContent } from '@/components/blog/embeds/contentPreprocessor';

interface SuggestedListeningBlockProps {
  html: string;
}

/** Render an iframe DOM node as plain JSX. */
function renderIframe(node: Element) {
  const { src, title, allow, allowfullscreen, loading, width, height } = node.attribs || {};
  return (
    <iframe
      src={src}
      title={title || undefined}
      allow={allow || undefined}
      allowFullScreen={allowfullscreen !== undefined}
      loading={(loading as 'lazy' | 'eager') || 'lazy'}
      width={width || undefined}
      height={height || undefined}
      className="border-0"
    />
  );
}

export function SuggestedListeningBlock({ html }: SuggestedListeningBlockProps) {
  // Preprocess to convert YouTube URLs → sentinels
  const preprocessed = preprocessContent(html);

  // Sanitize
  const sanitized = DOMPurify.sanitize(preprocessed, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'allow', 'allowfullscreen', 'frameborder', 'scrolling',
      'src', 'title', 'loading', 'target', 'rel',
      'width', 'height', 'style',
    ],
  });

  const parserOptions: HTMLReactParserOptions = {
    replace(domNode) {
      if (!(domNode instanceof Element) || domNode.type !== 'tag') return;

      const classes = domNode.attribs?.class || '';
      const id = domNode.attribs?.id || '';

      // YouTube sentinel
      if (classes.includes('yt-embed-placeholder') && id.startsWith('yt-')) {
        const videoId = id.replace('yt-', '');
        return <YouTubeEmbed videoId={videoId} title="YouTube Video" />;
      }

      // Wrap bare iframes
      if (domNode.name === 'iframe') {
        const src = domNode.attribs?.src || '';

        // YouTube iframes
        const ytMatch = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/);
        if (ytMatch) {
          return <YouTubeEmbed videoId={ytMatch[1]} title="YouTube Video" />;
        }

        // Spotify
        if (/spotify\.com/i.test(src)) {
          return (
            <div className="blog-embed blog-embed--spotify">
              {renderIframe(domNode)}
            </div>
          );
        }

        // SoundCloud
        if (/soundcloud\.com/i.test(src)) {
          return (
            <div className="blog-embed blog-embed--audio">
              {renderIframe(domNode)}
            </div>
          );
        }

        // Generic iframe
        return (
          <div className="blog-embed blog-embed--generic">
            {renderIframe(domNode)}
          </div>
        );
      }

      return undefined;
    },
  };

  return (
    <article className="suggested-listening-content prose prose-lg max-w-none
      prose-headings:font-display prose-headings:text-gray-900 prose-headings:tracking-tight
      prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
      prose-h3:border-b prose-h3:border-gray-200 prose-h3:pb-3
      prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
      prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-5
      prose-li:text-gray-600 prose-li:leading-relaxed prose-li:marker:text-primary
      prose-strong:text-gray-900 prose-strong:font-semibold
      prose-em:text-gray-800
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-ul:space-y-1 prose-ol:space-y-2
      prose-hr:border-gray-200 prose-hr:my-8
      [&_iframe]:rounded-xl [&_iframe]:shadow-lg [&_iframe]:my-6 [&_iframe]:max-w-full
      [&_.blog-embed]:my-6 [&_.blog-embed]:rounded-xl [&_.blog-embed]:overflow-hidden [&_.blog-embed]:shadow-lg
      [&_.blog-embed--spotify_iframe]:!h-[352px]
      [&_.blog-embed_iframe]:w-full"
    >
      {parse(sanitized, parserOptions)}
    </article>
  );
}
