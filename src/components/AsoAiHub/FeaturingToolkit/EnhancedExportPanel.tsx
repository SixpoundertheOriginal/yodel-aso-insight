import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Eye, 
  Mail, 
  File 
} from 'lucide-react';
import { FeaturingContent } from '@/types/featuring';

interface EnhancedExportPanelProps {
  content: FeaturingContent;
  isReady: boolean;
}

export const EnhancedExportPanel: React.FC<EnhancedExportPanelProps> = ({
  content,
  isReady
}) => {
  const [emailAddress, setEmailAddress] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const generateTxtFile = () => {
    const txtContent = `APPLE APP STORE FEATURING SUBMISSION

Editorial Description:
${content.editorialDescription}

Helpful Info for Apple Review Team:
${content.helpfulInfo}

Generated on: ${new Date().toLocaleDateString()}
`;

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apple-featuring-submission.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHtmlSnapshot = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Apple Featuring Submission</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #007AFF; font-size: 24px; font-weight: 600; margin: 0; }
        .section { margin-bottom: 30px; }
        .label { color: #666; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        .content { font-size: 16px; line-height: 1.6; color: #333; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Apple App Store Featuring Submission</h1>
        </div>
        
        <div class="section">
            <div class="label">Editorial Description</div>
            <div class="content">${content.editorialDescription}</div>
        </div>
        
        <div class="section">
            <div class="label">Helpful Info for Apple Review Team</div>
            <div class="content">${content.helpfulInfo}</div>
        </div>
        
        <div class="footer">
            Generated on ${new Date().toLocaleDateString()} using Featuring Strategy Toolkit
        </div>
    </div>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apple-featuring-submission.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePdfSummary = () => {
    // In a real implementation, you'd use a PDF library like jsPDF
    console.log('Generating PDF summary...');
    alert('PDF generation feature coming soon!');
  };

  const sendEmail = () => {
    if (!emailAddress) return;
    
    const subject = 'Apple App Store Featuring Submission';
    const body = `Hi,

Please find the Apple App Store featuring submission below:

EDITORIAL DESCRIPTION:
${content.editorialDescription}

HELPFUL INFO FOR APPLE REVIEW TEAM:
${content.helpfulInfo}

Best regards,
Featuring Strategy Toolkit
`;

    const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Download className="w-5 h-5 text-yodel-orange" />
            <span>Export Submission</span>
          </CardTitle>
          {isReady && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Ready for Submission
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isReady && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">
              Complete all required fields before exporting
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Quick Export Options */}
          <Button
            onClick={generateTxtFile}
            disabled={!isReady}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>TXT for App Store Connect</span>
          </Button>

          <Button
            onClick={generateHtmlSnapshot}
            disabled={!isReady}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <File className="w-4 h-4" />
            <span>HTML Snapshot</span>
          </Button>

          <Button
            onClick={generatePdfSummary}
            disabled={!isReady}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Summary</span>
          </Button>

          {/* Preview Modal */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button
                disabled={!isReady}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Preview as Apple Editor</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl">
              <DialogHeader>
                <DialogTitle className="text-white">Apple Editor Preview</DialogTitle>
              </DialogHeader>
              <div className="bg-white text-black p-6 rounded-lg max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Editorial Description</h3>
                    <p className="text-gray-900">{content.editorialDescription}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Helpful Information</h3>
                    <p className="text-gray-900">{content.helpfulInfo}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Email Option */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="Email to team/client..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <Button
              onClick={sendEmail}
              disabled={!isReady || !emailAddress}
              className="flex items-center space-x-1"
            >
              <Mail className="w-4 h-4" />
              <span>Send</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
