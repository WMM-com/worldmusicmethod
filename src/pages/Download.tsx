import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, AlertCircle, CheckCircle2, Loader2, Clock, FileIcon } from 'lucide-react';
import { toast } from 'sonner';

interface DownloadInfo {
  product_id: string;
  file_url: string;
  title: string;
  can_download: boolean;
  reason: string;
}

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.rpc('validate_download_token', {
        p_token: token,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setDownloadInfo(data[0]);
      } else {
        setDownloadInfo({
          product_id: '',
          file_url: '',
          title: '',
          can_download: false,
          reason: 'Invalid download link',
        });
      }
    } catch (error) {
      console.error('Failed to validate token:', error);
      setDownloadInfo({
        product_id: '',
        file_url: '',
        title: '',
        can_download: false,
        reason: 'Failed to validate download link',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadInfo?.file_url) return;

    setDownloading(true);
    try {
      // Fetch the file
      const response = await fetch(downloadInfo.file_url);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      
      // Extract filename from URL
      const urlParts = downloadInfo.file_url.split('/');
      const filename = urlParts[urlParts.length - 1] || `${downloadInfo.title}.file`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Download started!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Validating download link...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              {downloadInfo?.can_download ? (
                <>
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <CardTitle>Ready to Download</CardTitle>
                  <CardDescription>
                    Your purchase of <strong>{downloadInfo.title}</strong> is ready
                  </CardDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                  <CardTitle>Download Unavailable</CardTitle>
                  <CardDescription>
                    {downloadInfo?.reason || 'Unable to process download'}
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {downloadInfo?.can_download ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <FileIcon className="h-10 w-10 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{downloadInfo.title}</p>
                      <p className="text-xs text-muted-foreground">Digital Product</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Now
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <Clock className="h-4 w-4" />
                    <span>Link expires in 7 days</span>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {downloadInfo?.title ? (
                      <>
                        The download link for <strong>{downloadInfo.title}</strong> is no longer valid.
                      </>
                    ) : (
                      'This download link is invalid or has expired.'
                    )}
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/">Return Home</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
