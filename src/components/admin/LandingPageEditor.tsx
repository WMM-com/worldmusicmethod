import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LearningOutcome {
  title: string;
  description: string;
}

interface Resource {
  image: string;
  title: string;
  description: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface LandingPageData {
  id?: string;
  course_id: string;
  hero_background_url: string;
  course_image_url: string;
  trailer_video_url: string;
  overview_heading: string;
  course_overview: string[];
  styles_image_desktop: string;
  styles_image_mobile: string;
  learning_outcomes: LearningOutcome[];
  learning_outcomes_intro: string;
  resources: Resource[];
  expert_name: string;
  expert_image_url: string;
  expert_bio: string[];
  faqs: FAQ[];
  cta_title: string;
  cta_description: string;
  course_includes: string[];
}

const defaultData: LandingPageData = {
  course_id: "",
  hero_background_url: "",
  course_image_url: "",
  trailer_video_url: "",
  overview_heading: "",
  course_overview: [""],
  styles_image_desktop: "",
  styles_image_mobile: "",
  learning_outcomes: [{ title: "", description: "" }],
  learning_outcomes_intro: "By the end of this course, you will be able to:",
  resources: [{ image: "", title: "", description: "" }],
  expert_name: "",
  expert_image_url: "",
  expert_bio: [""],
  faqs: [{ question: "", answer: "" }],
  cta_title: "Ready To Start Your Journey?",
  cta_description: "Join a worldwide community of musicians.",
  course_includes: ["Synced Notation & Tab", "Downloadable PDF Notation", "Lifetime Access", "Student Community"],
};

export function LandingPageEditor() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [formData, setFormData] = useState<LandingPageData>(defaultData);
  const queryClient = useQueryClient();

  // Fetch all courses
  const { data: courses } = useQuery({
    queryKey: ["admin-courses-landing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, country")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch landing page data for selected course
  const { data: landingPage, isLoading } = useQuery({
    queryKey: ["landing-page", selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      const { data, error } = await supabase
        .from("course_landing_pages")
        .select("*")
        .eq("course_id", selectedCourseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourseId,
  });

  // Update form when landing page data loads
  useEffect(() => {
    if (landingPage) {
      setFormData({
        id: landingPage.id,
        course_id: landingPage.course_id || "",
        hero_background_url: landingPage.hero_background_url || "",
        course_image_url: landingPage.course_image_url || "",
        trailer_video_url: landingPage.trailer_video_url || "",
        overview_heading: landingPage.overview_heading || "",
        course_overview: landingPage.course_overview || [""],
        styles_image_desktop: landingPage.styles_image_desktop || "",
        styles_image_mobile: landingPage.styles_image_mobile || "",
        learning_outcomes: (landingPage.learning_outcomes as unknown as LearningOutcome[]) || [{ title: "", description: "" }],
        learning_outcomes_intro: (landingPage as any).learning_outcomes_intro || "By the end of this course, you will be able to:",
        resources: (landingPage.resources as unknown as Resource[]) || [{ image: "", title: "", description: "" }],
        expert_name: landingPage.expert_name || "",
        expert_image_url: landingPage.expert_image_url || "",
        expert_bio: landingPage.expert_bio || [""],
        faqs: (landingPage.faqs as unknown as FAQ[]) || [{ question: "", answer: "" }],
        cta_title: (landingPage as any).cta_title || "Ready To Start Your Journey?",
        cta_description: (landingPage as any).cta_description || "Join a worldwide community of musicians.",
        course_includes: landingPage.course_includes || defaultData.course_includes,
      });
    } else if (selectedCourseId) {
      setFormData({ ...defaultData, course_id: selectedCourseId });
    }
  }, [landingPage, selectedCourseId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: LandingPageData) => {
      const payload = {
        course_id: data.course_id,
        hero_background_url: data.hero_background_url,
        course_image_url: data.course_image_url,
        trailer_video_url: data.trailer_video_url,
        overview_heading: data.overview_heading,
        course_overview: data.course_overview,
        styles_image_desktop: data.styles_image_desktop,
        styles_image_mobile: data.styles_image_mobile,
        learning_outcomes: data.learning_outcomes as unknown as any,
        learning_outcomes_intro: data.learning_outcomes_intro,
        resources: data.resources as unknown as any,
        expert_name: data.expert_name,
        expert_image_url: data.expert_image_url,
        expert_bio: data.expert_bio,
        faqs: data.faqs as unknown as any,
        cta_title: data.cta_title,
        cta_description: data.cta_description,
        course_includes: data.course_includes,
      };

      if (data.id) {
        const { error } = await supabase
          .from("course_landing_pages")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_landing_pages")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Landing page saved successfully");
      queryClient.invalidateQueries({ queryKey: ["landing-page", selectedCourseId] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  // Array field helpers
  const addArrayItem = (field: "course_overview" | "expert_bio" | "course_includes", defaultValue: string = "") => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], defaultValue],
    }));
  };

  const removeArrayItem = (field: "course_overview" | "expert_bio" | "course_includes", index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const updateArrayItem = (field: "course_overview" | "expert_bio" | "course_includes", index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  // Learning outcomes helpers
  const addOutcome = () => {
    setFormData(prev => ({
      ...prev,
      learning_outcomes: [...prev.learning_outcomes, { title: "", description: "" }],
    }));
  };

  const removeOutcome = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.filter((_, i) => i !== index),
    }));
  };

  const updateOutcome = (index: number, field: "title" | "description", value: string) => {
    setFormData(prev => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Resources helpers
  const addResource = () => {
    setFormData(prev => ({
      ...prev,
      resources: [...prev.resources, { image: "", title: "", description: "" }],
    }));
  };

  const removeResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  };

  const updateResource = (index: number, field: "image" | "title" | "description", value: string) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // FAQ helpers
  const addFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  };

  const removeFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Landing Page Editor</h2>
          <p className="text-muted-foreground">Edit course landing page content</p>
        </div>
        <Button onClick={handleSave} disabled={!selectedCourseId || saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course to edit" />
            </SelectTrigger>
            <SelectContent>
              {courses?.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title} ({course.country})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourseId && isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {selectedCourseId && !isLoading && (
        <Accordion type="multiple" defaultValue={["hero", "overview", "outcomes", "resources", "includes", "expert", "faqs", "cta"]} className="space-y-4">
          {/* Hero Section */}
          <AccordionItem value="hero" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Hero Section</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Hero Background Image URL</Label>
                <Input
                  value={formData.hero_background_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, hero_background_url: e.target.value }))}
                  placeholder="https://..."
                />
                {formData.hero_background_url && (
                  <img src={formData.hero_background_url} alt="Hero preview" className="h-32 object-cover rounded mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Course Image URL</Label>
                <Input
                  value={formData.course_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_image_url: e.target.value }))}
                  placeholder="https://..."
                />
                {formData.course_image_url && (
                  <img src={formData.course_image_url} alt="Course preview" className="h-32 object-cover rounded mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Trailer Video URL (YouTube or Vimeo)</Label>
                <Input
                  value={formData.trailer_video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, trailer_video_url: e.target.value }))}
                  placeholder="https://youtube.com/... or https://vimeo.com/..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Course Overview */}
          <AccordionItem value="overview" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Course Overview</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Overview Heading</Label>
                <Input
                  value={formData.overview_heading}
                  onChange={(e) => setFormData(prev => ({ ...prev, overview_heading: e.target.value }))}
                  placeholder="What You'll Learn"
                />
              </div>
              <div className="space-y-2">
                <Label>Overview Paragraphs</Label>
                {formData.course_overview.map((para, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={para}
                      onChange={(e) => updateArrayItem("course_overview", index, e.target.value)}
                      placeholder="Paragraph text..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeArrayItem("course_overview", index)}
                      disabled={formData.course_overview.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addArrayItem("course_overview")}>
                  <Plus className="h-4 w-4 mr-2" /> Add Paragraph
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Styles Image (Desktop)</Label>
                  <Input
                    value={formData.styles_image_desktop}
                    onChange={(e) => setFormData(prev => ({ ...prev, styles_image_desktop: e.target.value }))}
                    placeholder="https://..."
                  />
                  {formData.styles_image_desktop && (
                    <img src={formData.styles_image_desktop} alt="Desktop preview" className="h-24 object-cover rounded mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Styles Image (Mobile)</Label>
                  <Input
                    value={formData.styles_image_mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, styles_image_mobile: e.target.value }))}
                    placeholder="https://..."
                  />
                  {formData.styles_image_mobile && (
                    <img src={formData.styles_image_mobile} alt="Mobile preview" className="h-24 object-cover rounded mt-2" />
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Learning Outcomes */}
          <AccordionItem value="outcomes" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Learning Outcomes</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Intro Text</Label>
                <Input
                  value={formData.learning_outcomes_intro}
                  onChange={(e) => setFormData(prev => ({ ...prev, learning_outcomes_intro: e.target.value }))}
                  placeholder="By the end of this course, you will be able to:"
                />
              </div>
              <div className="space-y-4">
                <Label>Outcomes</Label>
                {formData.learning_outcomes.map((outcome, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">Outcome {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOutcome(index)}
                        disabled={formData.learning_outcomes.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={outcome.title}
                        onChange={(e) => updateOutcome(index, "title", e.target.value)}
                        placeholder="Title"
                      />
                      <Textarea
                        value={outcome.description}
                        onChange={(e) => updateOutcome(index, "description", e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addOutcome}>
                  <Plus className="h-4 w-4 mr-2" /> Add Outcome
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Resources */}
          <AccordionItem value="resources" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Resources</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {formData.resources.map((resource, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">Resource {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResource(index)}
                      disabled={formData.resources.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={resource.image}
                      onChange={(e) => updateResource(index, "image", e.target.value)}
                      placeholder="Image URL"
                    />
                    {resource.image && (
                      <img src={resource.image} alt="Resource preview" className="h-20 object-cover rounded" />
                    )}
                    <Input
                      value={resource.title}
                      onChange={(e) => updateResource(index, "title", e.target.value)}
                      placeholder="Title"
                    />
                    <Textarea
                      value={resource.description}
                      onChange={(e) => updateResource(index, "description", e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={addResource}>
                <Plus className="h-4 w-4 mr-2" /> Add Resource
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Course Includes */}
          <AccordionItem value="includes" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Course Includes</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">Items shown under "This Course Includes" on the landing page.</p>
              {formData.course_includes.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateArrayItem("course_includes", index, e.target.value)}
                    placeholder="e.g. Synced Notation & Tab"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem("course_includes", index)}
                    disabled={formData.course_includes.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => addArrayItem("course_includes")}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Meet Your Expert */}
          <AccordionItem value="expert" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Meet Your Expert</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Expert Name</Label>
                <Input
                  value={formData.expert_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, expert_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Expert Image URL</Label>
                <Input
                  value={formData.expert_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, expert_image_url: e.target.value }))}
                  placeholder="https://..."
                />
                {formData.expert_image_url && (
                  <img src={formData.expert_image_url} alt="Expert preview" className="h-32 object-cover rounded mt-2" />
                )}
              </div>
              <div className="space-y-4">
                <Label>Expert Bio Paragraphs</Label>
                {formData.expert_bio.map((para, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Paragraph {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem("expert_bio", index)}
                        disabled={formData.expert_bio.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={para}
                      onChange={(e) => updateArrayItem("expert_bio", index, e.target.value)}
                      placeholder="Bio paragraph..."
                      rows={4}
                    />
                  </Card>
                ))}
                <Button variant="outline" onClick={() => addArrayItem("expert_bio")}>
                  <Plus className="h-4 w-4 mr-2" /> Add Paragraph
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FAQs */}
          <AccordionItem value="faqs" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">FAQs</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {formData.faqs.map((faq, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">FAQ {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFaq(index)}
                      disabled={formData.faqs.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFaq(index, "question", e.target.value)}
                      placeholder="Question"
                    />
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, "answer", e.target.value)}
                      placeholder="Answer"
                    />
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={addFaq}>
                <Plus className="h-4 w-4 mr-2" /> Add FAQ
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* CTA Section */}
          <AccordionItem value="cta" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Final CTA Section</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>CTA Title</Label>
                <Input
                  value={formData.cta_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_title: e.target.value }))}
                  placeholder="Ready to Start Your Journey?"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Description</Label>
                <Textarea
                  value={formData.cta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_description: e.target.value }))}
                  placeholder="Join thousands of musicians..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
