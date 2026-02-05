import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { 
  FileText, Image, Layout, Share2, DollarSign, ShoppingBag, 
  Headphones, Video, Music, Code, Calendar 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// All available section types with descriptions
const ALL_SECTION_TYPES = [
  // Main content sections
  { type: 'text_block', label: 'Text Block', icon: FileText, description: 'Add formatted text content', category: 'content' },
  { type: 'gallery', label: 'Gallery', icon: Image, description: 'Showcase images in a grid', category: 'content' },
  { type: 'projects', label: 'Projects', icon: Layout, description: 'Display portfolio projects', category: 'content' },
  { type: 'custom_tabs', label: 'Info Tabs', icon: FileText, description: 'Tabbed information sections', category: 'content' },
  { type: 'audio_player', label: 'Audio Player', icon: Headphones, description: 'Upload and play audio tracks', category: 'content' },
  { type: 'social_feed', label: 'Social Feed', icon: Share2, description: 'Display your social posts', category: 'content' },
  
  // Embed sections
  { type: 'youtube', label: 'YouTube', icon: Video, description: 'Embed YouTube videos', category: 'embed' },
  { type: 'spotify', label: 'Spotify', icon: Music, description: 'Embed Spotify playlists', category: 'embed' },
  { type: 'soundcloud', label: 'SoundCloud', icon: Headphones, description: 'Embed SoundCloud tracks', category: 'embed' },
  { type: 'generic', label: 'Other Embed', icon: Code, description: 'Embed any iframe content', category: 'embed' },
  
  // Commerce sections (premium)
  { type: 'donation', label: 'Tip Jar', icon: DollarSign, description: 'Accept tips from fans', category: 'commerce', premium: true },
  { type: 'digital_products', label: 'Digital Products', icon: ShoppingBag, description: 'Sell digital downloads', category: 'commerce', premium: true },
];

interface AddSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSection: (sectionType: string) => void;
  isPremium?: boolean;
}

export function AddSectionModal({ 
  open, 
  onOpenChange, 
  onAddSection,
  isPremium = false 
}: AddSectionModalProps) {
  
  const handleSelect = (sectionType: string, isPremiumSection: boolean) => {
    if (isPremiumSection && !isPremium) {
      // Let the parent handle the premium gate toast
    }
    onAddSection(sectionType);
    onOpenChange(false);
  };

  const contentSections = ALL_SECTION_TYPES.filter(s => s.category === 'content');
  const embedSections = ALL_SECTION_TYPES.filter(s => s.category === 'embed');
  const commerceSections = ALL_SECTION_TYPES.filter(s => s.category === 'commerce');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content Block</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Content Sections */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Content</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {contentSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card 
                    key={section.type}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                      "group"
                    )}
                    onClick={() => handleSelect(section.type, false)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <h4 className="font-medium text-sm">{section.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {section.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Embed Sections */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Embeds</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {embedSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card 
                    key={section.type}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                      "group"
                    )}
                    onClick={() => handleSelect(section.type, false)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <h4 className="font-medium text-xs">{section.label}</h4>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Commerce Sections (Premium) */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              Commerce
              <Badge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {commerceSections.map((section) => {
                const Icon = section.icon;
                const isLocked = !isPremium;
                return (
                  <Card 
                    key={section.type}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                      "group relative",
                      isLocked && "opacity-60"
                    )}
                    onClick={() => handleSelect(section.type, true)}
                  >
                    <CardContent className="p-4 text-center">
                      {isLocked && (
                        <Crown className="h-4 w-4 absolute top-2 right-2 text-secondary" />
                      )}
                      <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <h4 className="font-medium text-sm">{section.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {section.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
