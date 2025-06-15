
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, FileCode } from 'lucide-react';
import { FeaturingContent } from '@/types/featuring';

interface SubmissionPackagerProps {
  content: FeaturingContent;
  isReady: boolean;
}

export const SubmissionPackager: React.FC<SubmissionPackagerProps> = ({ content, isReady }) => {
  
  const generateHtmlContent = () => {
    const submissionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>App Store Featuring Submission</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          h1 { color: #111; }
          h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; }
          pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
          .meta { font-size: 0.9em; color: #555; }
        </style>
      </head>
      <body>
        <h1>Apple App Store Featuring Submission</h1>
        <p class="meta">Generated on: ${submissionDate}</p>
        
        <h2>Editorial Description (${content.editorialDescription.length} characters)</h2>
        <pre>${content.editorialDescription}</pre>
        
        <h2>Helpful Info for Apple Review (${content.helpfulInfo.length} characters)</h2>
        <pre>${content.helpfulInfo}</pre>

        <h2>Next Steps</h2>
        <p>Copy and paste the above content into the respective fields in App Store Connect's "Promote Your App" section.</p>
      </body>
      </html>
    `;
  };

  const generateTxtContent = () => {
    const submissionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
Apple App Store Featuring Submission
===================================
Generated on: ${submissionDate}

--- EDITORIAL DESCRIPTION (${content.editorialDescription.length} characters) ---
${content.editorialDescription}

--- HELPFUL INFO FOR APPLE REVIEW (${content.helpfulInfo.length} characters) ---
${content.helpfulInfo}

--- NEXT STEPS ---
Copy and paste the above content into the respective fields in App Store Connect's "Promote Your App" section.
    `.trim();
  };

  const handleExport = (format: 'html' | 'txt') => {
    const contentToExport = format === 'html' ? generateHtmlContent() : generateTxtContent();
    const mimeType = format === 'html' ? 'text/html' : 'text/plain';
    const filename = `featuring-submission.${format}`;

    const blob = new Blob([contentToExport], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="flex items-center gap-4 p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex-grow">
        <h3 className="text-lg font-semibold text-white">Generate Final Submission</h3>
        <p className="text-zinc-400">Package your content into downloadable files for App Store Connect.</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => handleExport('html')} disabled={!isReady} size="lg" className="bg-yodel-blue hover:bg-yodel-blue/90">
          <FileCode className="w-5 h-5 mr-2" /> HTML
        </Button>
        <Button onClick={() => handleExport('txt')} disabled={!isReady} size="lg" variant="outline">
          <FileText className="w-5 h-5 mr-2" /> TXT
        </Button>
      </div>
    </div>
  );
};
