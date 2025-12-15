import React from 'react';
import { AlertTriangle, Copy, X } from 'lucide-react';
import { Button } from './ui';
import { ErrorInfo, createErrorReport } from '../utils/errorHandler';

interface ErrorDisplayProps {
  error: ErrorInfo | null;
  onClose: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClose }) => {
  if (!error) return null;

  const copyErrorReport = () => {
    const report = createErrorReport(error);
    navigator.clipboard.writeText(report).then(() => {
      // You could add a toast notification here
      console.log('Error report copied to clipboard');
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Calculation Error</h2>
                <p className="text-sm text-slate-500">Something went wrong during the calculation process</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error Details */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-slate-900 mb-2">Error Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-600">Context:</span>
                <span className="ml-2 font-mono text-slate-800">{error.context}</span>
              </div>
              <div>
                <span className="text-slate-600">Time:</span>
                <span className="ml-2 font-mono text-slate-800">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Message:</span>
                <span className="ml-2 text-slate-800">{error.message}</span>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          {error.details && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-slate-900 mb-2">Technical Details</h3>
              <pre className="text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Troubleshooting Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Troubleshooting Steps</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Check that your fee configurations are properly set up</li>
              <li>Ensure you have valid ASINs with prices and weights</li>
              <li>Verify your internet connection is stable</li>
              <li>Try refreshing the page and running the calculation again</li>
              <li>Check the browser console for additional error details</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="secondary" onClick={copyErrorReport} icon={Copy}>
              Copy Error Report
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};