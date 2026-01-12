import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, Upload, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useR2Upload } from '@/hooks/useR2Upload';

interface SiteSettings {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
}

export function AdminSiteSettings() {
  const queryClient = useQueryClient();
  const { uploadFile, isUploading } = useR2Upload();
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [siteName, setSiteName] = useState('World Music Method');

  // Fetch site settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      if (error) throw error;
      return data as SiteSettings[];
    },
  });

  // Set initial values from settings
  useEffect(() => {
    if (settings) {
      const logo = settings.find(s => s.key === 'site_logo');
      const favicon = settings.find(s => s.key === 'site_favicon');
      const name = settings.find(s => s.key === 'site_name');
      if (logo?.value) setLogoUrl(logo.value);
      if (favicon?.value) setFaviconUrl(favicon.value);
      if (name?.value) setSiteName(name.value);
    }
  }, [settings]);

  // Upsert setting mutation
  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadFile(file, { 
        bucket: 'admin', 
        folder: 'site-assets',
        imageOptimization: 'media',
        trackInDatabase: false,
      });
      if (result?.url) {
        setLogoUrl(result.url);
        await saveMutation.mutateAsync({ key: 'site_logo', value: result.url });
        toast.success('Logo uploaded successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadFile(file, { 
        bucket: 'admin', 
        folder: 'site-assets',
        imageOptimization: 'avatar',
        trackInDatabase: false,
      });
      if (result?.url) {
        setFaviconUrl(result.url);
        await saveMutation.mutateAsync({ key: 'site_favicon', value: result.url });
        toast.success('Favicon uploaded successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload favicon');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await Promise.all([
        saveMutation.mutateAsync({ key: 'site_name', value: siteName }),
        saveMutation.mutateAsync({ key: 'site_logo', value: logoUrl }),
        saveMutation.mutateAsync({ key: 'site_favicon', value: faviconUrl }),
      ]);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const clearLogo = async () => {
    setLogoUrl('');
    await saveMutation.mutateAsync({ key: 'site_logo', value: '' });
    toast.success('Logo removed');
  };

  const clearFavicon = async () => {
    setFaviconUrl('');
    await saveMutation.mutateAsync({ key: 'site_favicon', value: '' });
    toast.success('Favicon removed');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Identity</CardTitle>
          <CardDescription>Manage your site name, logo, and favicon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Site Name */}
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Your Site Name"
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Site Logo</Label>
            <div className="flex items-start gap-4">
              <div className="w-48 h-24 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Site logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Image className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="logo-upload"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {logoUrl && (
                    <Button variant="ghost" size="sm" onClick={clearLogo}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Or enter logo URL..."
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: PNG or SVG, max height 80px
                </p>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Image className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    id="favicon-upload"
                    onChange={handleFaviconUpload}
                    disabled={isUploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('favicon-upload')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Favicon
                  </Button>
                  {faviconUrl && (
                    <Button variant="ghost" size="sm" onClick={clearFavicon}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Or enter favicon URL..."
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 32x32 or 64x64 PNG, ICO, or SVG
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How your site identity appears</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-3">
              {faviconUrl && (
                <img src={faviconUrl} alt="Favicon preview" className="h-6 w-6" />
              )}
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="h-8 max-w-[200px] object-contain" />
              ) : (
                <span className="font-semibold text-lg">{siteName}</span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <ExternalLink className="h-3 w-3 inline mr-1" />
            Note: Favicon changes may require a hard refresh (Ctrl+Shift+R) to see in browser tabs
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
