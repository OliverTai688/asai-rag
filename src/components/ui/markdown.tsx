import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { TrendingUp, Scale, Lightbulb, ShieldCheck } from "lucide-react";

interface MarkdownProps {
  content: string;
  className?: string;
  isInternal?: boolean;
}

export function Markdown({ content, className, isInternal = false }: MarkdownProps) {
  // Pre-process custom blocks: :::market, :::legal, :::strategy
  const processBlocks = (text: string) => {
    const blocks = [
      { 
        tag: 'market', 
        title: '市場洞察', 
        class: 'market',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`
      },
      { 
        tag: 'legal', 
        title: '法規警示', 
        class: 'legal',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path></svg>`
      },
      { 
        tag: 'strategy', 
        title: '溝通錦囊 (內部)', 
        class: 'strategy', 
        internalOnly: true,
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>`
      },
    ];

    let processedText = text;

    blocks.forEach(block => {
      const regex = new RegExp(`:::${block.tag}\\n([\\s\\S]*?)\\n:::`, 'g');
      
      if (block.internalOnly && !isInternal) {
        // Remove internal blocks for non-internal view
        processedText = processedText.replace(regex, '');
      } else {
        processedText = processedText.replace(regex, (match, p1) => {
          return `
            <div class="insight-block insight-block-${block.class}">
              <div class="insight-block-header">
                <span class="mr-1">${block.icon}</span>
                ${block.title}
              </div>
              <div class="insight-block-content">${p1.trim().replace(/\n/g, '<br/>')}</div>
            </div>
          `;
        });
      }
    });

    return processedText;
  };

  const processedContent = processBlocks(content);

  return (
    <div className={cn("prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-black", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

