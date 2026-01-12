import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Users } from 'lucide-react';
import { useGroups, useMyGroups } from '@/hooks/useGroups';
import { GroupCard } from './GroupCard';
import { CreateGroupDialog } from './CreateGroupDialog';
import { CATEGORY_LABELS, type GroupCategory } from '@/types/groups';

export function GroupsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory | undefined>();
  
  const { data: allGroups, isLoading: loadingAll } = useGroups(searchQuery, selectedCategory);
  const { data: myGroups, isLoading: loadingMy } = useMyGroups();
  
  const isLoading = activeTab === 'discover' ? loadingAll : loadingMy;
  const groups = activeTab === 'discover' ? allGroups : myGroups;
  
  const categories = Object.entries(CATEGORY_LABELS) as [GroupCategory, string][];
  
  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <CreateGroupDialog />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="my-groups">My Groups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="discover" className="mt-4">
          <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto pb-2 -mx-1 px-1">
            <Button
              size="sm"
              variant={!selectedCategory ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(undefined)}
              className="shrink-0"
            >
              All
            </Button>
            {categories.map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedCategory === key ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(key)}
                className="shrink-0"
              >
                {label}
              </Button>
            ))}
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : groups?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No groups found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search' : 'Be the first to create a group!'}
              </p>
              <CreateGroupDialog trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              } />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups?.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my-groups" className="mt-4">
          {loadingMy ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : myGroups?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">You haven't joined any groups yet</h3>
              <p className="text-muted-foreground">
                Discover groups to connect with other musicians
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myGroups?.map((group) => (
                <GroupCard key={group.id} group={group as any} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
