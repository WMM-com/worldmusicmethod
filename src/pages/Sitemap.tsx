import { useEffect, useState } from 'react';

const Sitemap = () => {
  const [sitemapContent, setSitemapContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mhmdjalantsouizsypzh.supabase.co';
        const response = await fetch(`${supabaseUrl}/functions/v1/sitemap`);
        const xml = await response.text();
        setSitemapContent(xml);
      } catch (error) {
        console.error('Failed to fetch sitemap:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSitemap();
  }, []);

  useEffect(() => {
    if (sitemapContent) {
      // Replace the entire document with the XML content
      document.open('text/xml');
      document.write(sitemapContent);
      document.close();
    }
  }, [sitemapContent]);

  if (loading) {
    return null;
  }

  return null;
};

export default Sitemap;
