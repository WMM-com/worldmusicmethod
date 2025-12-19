import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateExtendedProfile, ExtendedProfile } from '@/hooks/useProfilePortfolio';
import { User, Edit2, Check, X } from 'lucide-react';

interface BioSectionProps {
  profile: ExtendedProfile;
  isEditing: boolean;
}

export function BioSection({ profile, isEditing }: BioSectionProps) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');
  const updateProfile = useUpdateExtendedProfile();

  const handleSave = async () => {
    await updateProfile.mutateAsync({ bio });
    setEditing(false);
  };

  if (!profile.bio && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          About
        </CardTitle>
        {isEditing && !editing && (
          <Button variant="ghost" size="sm" onClick={() => { setBio(profile.bio || ''); setEditing(true); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell visitors about yourself or your band/venue..."
              className="min-h-[150px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground whitespace-pre-wrap">
            {profile.bio || 'No bio yet. Click edit to add one.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
