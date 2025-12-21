import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ImportCourseData() {
  const [courseTitle, setCourseTitle] = useState("Argentinian Fingerstyle Guitar");
  const [importing, setImporting] = useState(false);
  const [modulesText, setModulesText] = useState("");
  const [lessonsText, setLessonsText] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{
    modulesCreated: number;
    lessonsCreated: number;
    errors: string[];
  } | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(msg);
  };

  const handleImport = async () => {
    if (!modulesText || !lessonsText) {
      toast.error("Please paste both modules and lessons data");
      return;
    }
    
    setImporting(true);
    setResults(null);
    setLogs([]);
    
    try {
      addLog(`Calling edge function for course: ${courseTitle}`);
      
      const { data, error } = await supabase.functions.invoke('import-learndash-data', {
        body: {
          action: 'import-course',
          courseTitle,
          modulesData: modulesText,
          lessonsData: lessonsText,
        }
      });
      
      if (error) {
        addLog(`Error: ${error.message}`);
        toast.error('Import failed: ' + error.message);
        return;
      }
      
      if (!data.success) {
        addLog(`Failed: ${data.error}`);
        toast.error(data.error);
        return;
      }
      
      addLog(`Import complete for ${data.courseTitle}`);
      addLog(`Modules created: ${data.results.modulesCreated}`);
      addLog(`Lessons created: ${data.results.lessonsCreated}`);
      
      if (data.results.errors?.length > 0) {
        data.results.errors.forEach((e: string) => addLog(`Error: ${e}`));
      }
      
      setResults(data.results);
      toast.success(`Import complete! ${data.results.modulesCreated} modules, ${data.results.lessonsCreated} lessons`);
      
    } catch (error) {
      console.error('Import error:', error);
      addLog(`Exception: ${(error as Error).message}`);
      toast.error('Import failed: ' + (error as Error).message);
    }
    
    setImporting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Course Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Course Title</label>
          <Input
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder="e.g. Argentinian Fingerstyle Guitar"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Modules JSONL Data</label>
          <Textarea
            value={modulesText}
            onChange={(e) => setModulesText(e.target.value)}
            placeholder="Paste modules JSONL here..."
            rows={4}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Lessons JSONL Data</label>
          <Textarea
            value={lessonsText}
            onChange={(e) => setLessonsText(e.target.value)}
            placeholder="Paste lessons JSONL here..."
            rows={4}
          />
        </div>
        
        <Button onClick={handleImport} disabled={importing}>
          {importing ? "Importing..." : "Import Modules & Lessons"}
        </Button>
        
        {logs.length > 0 && (
          <ScrollArea className="h-40 border rounded-md p-2 bg-muted/50">
            <div className="text-xs font-mono space-y-1">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {results && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p>Modules created: {results.modulesCreated}</p>
            <p>Lessons created: {results.lessonsCreated}</p>
            {results.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-destructive font-medium">Errors:</p>
                <ul className="text-sm text-destructive">
                  {results.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {results.errors.length > 10 && (
                    <li>... and {results.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
