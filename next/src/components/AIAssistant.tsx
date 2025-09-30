
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Search, Sparkles } from "lucide-react";

// Define the interface for how tools are structured
interface Tool {
  name: string;
  description: string;
  category: string;
}

// Our database of tools categorized by type
const toolsDatabase: Record<string, Tool[]> = {
  "AI Tools": [
    { name: "Chat GPT Plus", description: "Advanced AI language model for text generation and conversation", category: "AI Tools" },
    { name: "Eleven Labs", description: "Best AI voices and text-to-speech technology", category: "AI Tools" },
    { name: "Flair.ai", description: "AI-assisted design and branding tool", category: "AI Tools" },
    { name: "Fliki", description: "AI-powered video making tool from text", category: "AI Tools" },
    { name: "Fotor", description: "AI image editing and design platform", category: "AI Tools" },
    { name: "Midjourney", description: "AI image generation from text descriptions", category: "AI Tools" },
    { name: "Quillbot", description: "AI-powered paraphrasing and writing enhancement tool", category: "AI Tools" },
    { name: "Quetext", description: "AI plagiarism detection service", category: "AI Tools" },
    { name: "YourTextGuru", description: "SEO content optimization with AI assistance", category: "AI Tools" },
    { name: "Text Optimizer", description: "AI-driven content optimization for SEO", category: "AI Tools" },
  ],
  "SEO & Content Marketing": [
    { name: "Dinorank", description: "SEO ranking and performance tool", category: "SEO & Content Marketing" },
    { name: "Keysearch", description: "SEO keyword research tool", category: "SEO & Content Marketing" },
    { name: "Keyword Tool", description: "Generate keyword ideas for content optimization", category: "SEO & Content Marketing" },
    { name: "Majestic", description: "Backlink analysis and SEO metrics", category: "SEO & Content Marketing" },
    { name: "Mangools", description: "Suite for SEO research and analysis", category: "SEO & Content Marketing" },
    { name: "SearchAtlas", description: "Comprehensive SEO research and analysis platform", category: "SEO & Content Marketing" },
    { name: "Semrush", description: "All-in-one marketing toolkit for digital marketing professionals", category: "SEO & Content Marketing" },
    { name: "Ubersuggest", description: "Keyword research and SEO insights tool", category: "SEO & Content Marketing" },
    { name: "WooRank", description: "SEO analysis and website audit tool", category: "SEO & Content Marketing" },
    { name: "YourTextGuru", description: "SEO content optimization with AI assistance", category: "SEO & Content Marketing" },
    { name: "Text Optimizer", description: "Content optimization for SEO", category: "SEO & Content Marketing" },
  ],
  "Product Research & Spy Tools": [
    { name: "Adsparo", description: "Ad performance tracking and optimization", category: "Product Research & Spy Tools" },
    { name: "Dropship.io", description: "Store sales follow-up and dropshipping analytics", category: "Product Research & Spy Tools" },
    { name: "Exploding Topics", description: "Discover trending topics before they take off", category: "Product Research & Spy Tools" },
    { name: "Foreplay", description: "Ad creation and optimization tool", category: "Product Research & Spy Tools" },
    { name: "Helium 10", description: "E-commerce research and optimization suite", category: "Product Research & Spy Tools" },
    { name: "JungleScout", description: "Product research for Amazon sellers", category: "Product Research & Spy Tools" },
    { name: "Kalodata", description: "TikTok Shop analysis tool", category: "Product Research & Spy Tools" },
    { name: "Niche Scrapper", description: "Analyze profitable niche markets", category: "Product Research & Spy Tools" },
    { name: "OnlyAds", description: "Ad campaign monitoring and optimization", category: "Product Research & Spy Tools" },
    { name: "Peeksta", description: "Product trend search and discovery", category: "Product Research & Spy Tools" },
    { name: "Pipiads", description: "Product search on TikTok and trend analysis", category: "Product Research & Spy Tools" },
    { name: "PinSpy", description: "Pinterest ad analysis tool", category: "Product Research & Spy Tools" },
    { name: "Sell The Trend", description: "Product trend analysis for e-commerce", category: "Product Research & Spy Tools" },
    { name: "Shophunter", description: "Online store monitoring and competitor analysis", category: "Product Research & Spy Tools" },
    { name: "TrendTrack", description: "Track winning Shopify stores and products", category: "Product Research & Spy Tools" },
  ],
  "Design & Creative": [
    { name: "Canva Pro", description: "Comprehensive design platform with premium features", category: "Design & Creative" },
    { name: "CapCut Pro", description: "Professional video editing tool", category: "Design & Creative" },
    { name: "Cutout.pro", description: "AI-powered photo and video enhancement tool", category: "Design & Creative" },
    { name: "Envato Element", description: "Subscription-based marketplace for creative assets", category: "Design & Creative" },
    { name: "Freepik", description: "Platform for graphic resources and design elements", category: "Design & Creative" },
    { name: "Iconscout", description: "Marketplace for icons, illustrations and stock photos", category: "Design & Creative" },
    { name: "Storyblocks", description: "Stock media platform for videos, images and audio", category: "Design & Creative" },
    { name: "Youzign", description: "Graphic design tool for marketers", category: "Design & Creative" },
  ],
  "Productivity & Writing": [
    { name: "Brain.fm", description: "Focus-enhancing music for productivity", category: "Productivity & Writing" },
    { name: "Quillbot", description: "AI-powered paraphrasing tool", category: "Productivity & Writing" },
    { name: "Quetext", description: "Plagiarism detection service", category: "Productivity & Writing" },
    { name: "SendShort", description: "Tool for creating concise video subtitles", category: "Productivity & Writing" },
    { name: "AlsoAsked", description: "Question research tool for content creators", category: "Productivity & Writing" },
  ]
};

// Mock AI response function (to be replaced with actual OpenAI API)
const generateAIResponse = async (userQuestion: string): Promise<string> => {
  // This would be replaced with the actual OpenAI API call
  console.log("Sending to AI:", userQuestion);
  
  // Find relevant tools based on keywords in the question
  const keywords = userQuestion.toLowerCase().split(' ');
  const relevantTools: Tool[] = [];
  
  // Search through our tools database for relevant matches
  Object.values(toolsDatabase).forEach(categoryTools => {
    categoryTools.forEach(tool => {
      const toolInfoLower = `${tool.name} ${tool.description} ${tool.category}`.toLowerCase();
      if (keywords.some(keyword => keyword.length > 3 && toolInfoLower.includes(keyword))) {
        if (!relevantTools.find(t => t.name === tool.name)) {
          relevantTools.push(tool);
        }
      }
    });
  });
  
  // Simulate AI thinking delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (relevantTools.length === 0) {
    return "Based on your question, I don't have specific tool recommendations. Could you provide more details about what you're trying to accomplish?";
  }
  
  // Generate a response based on found tools
  const toolSuggestions = relevantTools
    .slice(0, 3)
    .map(tool => `- **${tool.name}**: ${tool.description}`)
    .join('\n');
  
  return `Based on your needs, here are some tools that might help:\n\n${toolSuggestions}\n\nWould you like more specific information about any of these tools?`;
};

const AIAssistant: React.FC = () => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast({
        title: "Empty question",
        description: "Please enter a question about tools you need.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const aiResponse = await generateAIResponse(question);
      setResponse(aiResponse);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      console.error("AI response error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#5c3dfa] hover:bg-[#4c2dea] text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Tool Assistant AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[#202031]/95 backdrop-blur-xl border-[#5c3dfa]/40 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tool Assistant AI</DialogTitle>
          <DialogDescription className="text-gray-300">
            Describe what you're trying to accomplish, and I'll recommend the best tools for your needs.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="relative">
            <Textarea 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Example: I need to optimize my website for SEO..."
              className="min-h-[100px] bg-[#1a1a2e] border border-white/10 text-white placeholder:text-gray-400"
            />
            <Button 
              type="submit" 
              className="mt-2 bg-[#5c3dfa] hover:bg-[#4c2dea] text-white flex items-center gap-2"
              disabled={isLoading}
            >
              <Search className="w-4 h-4" />
              {isLoading ? "Finding tools..." : "Find Tools"}
            </Button>
          </div>
        </form>
        
        {response && (
          <div className="mt-4 p-4 bg-[#1a1a2e] border border-[#5c3dfa]/30 rounded-xl">
            <h3 className="text-lg font-medium text-white mb-2">Recommendations:</h3>
            <div className="text-gray-300 whitespace-pre-line">
              {response}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIAssistant;
