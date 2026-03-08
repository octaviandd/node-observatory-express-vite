import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/base/card";
import { Button } from "@/components/ui/base/button";
import { Badge } from "@/components/ui/base/badge";
import { 
  Folder, 
  ExternalLink, 
  ChevronUp, 
  ChevronDown,
  Clock,
  Package
} from "lucide-react";
import { Link } from "react-router";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
import { formatDate } from "@/utils.js";

type BaseCardProps = {
  date: string;
  metadata?: string | number;
  content: object | string;
  file: string;
  line: string;
  package?: string;
  linkPath?: string;
  language?: string;
};

const CardHeaderActions = ({ 
  isExpanded, 
  onToggle, 
  linkPath 
}: { 
  isExpanded: boolean; 
  onToggle: () => void; 
  linkPath?: string;
}) => (
  <div className="flex items-center gap-1">
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onToggle}
      className="h-7 w-7"
    >
      {isExpanded ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </Button>
    {linkPath && (
      <Button variant="ghost" size="icon" asChild className="h-7 w-7">
        <Link to={linkPath}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </Button>
    )}
  </div>
);

const CodeContent = ({ 
  content, 
  language 
}: { 
  content: object | string; 
  language: string;
}) => {
  const formattedContent = typeof content === "string"
    ? content
    : JSON.stringify(content, null, 2);

  return (
    <div className="rounded-md overflow-hidden border border-border max-h-[400px] overflow-y-auto">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '0.75rem',
          fontSize: '0.75rem',
          background: 'transparent',
        }}
        wrapLines={true}
        lineProps={{
          style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
        }}
      >
        {formattedContent}
      </SyntaxHighlighter>
    </div>
  );
};

const FileLocation = ({ 
  file, 
  line, 
  pkg 
}: { 
  file: string; 
  line: string; 
  pkg?: string;
}) => (
  <div className="space-y-2">
    {/* <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
      <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <code className="text-xs font-mono text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap flex-1">
        {file}:{line}
      </code>
    </div> */}
    {pkg && (
      <Badge variant="secondary" className="w-full flex items-center justify-center gap-1.5">
        <Package className="h-3 w-3" />
        <span className="text-xs font-medium truncate">{pkg}</span>
      </Badge>
    )}
  </div>
);

export const BaseCard = ({
  date,
  content,
  file,
  line,
  package: pkg,
  linkPath,
  language = "json",
}: BaseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <time className="text-xs font-medium text-foreground truncate">
              {formatDate(date)}
            </time>
          </div>
          <CardHeaderActions 
            isExpanded={isExpanded} 
            onToggle={() => setIsExpanded(!isExpanded)} 
            linkPath={linkPath}
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <>
          <CardContent className="space-y-3 pt-0 px-3">
            <CodeContent content={content} language={language} />
          </CardContent>
          <CardFooter className="pt-0 pb-3 px-3">
            <FileLocation file={file} line={line} pkg={pkg} />
          </CardFooter>
        </>
      )}
    </Card>
  );
};