// Error handling utilities for the Amazon FBA Calculator

export class CalculationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'CalculationError';
  }
}

export interface ErrorInfo {
  message: string;
  details?: any;
  timestamp: string;
  context?: string;
}

export const handleCalculationError = (error: any, context: string): ErrorInfo => {
  console.error(`[${context}] Calculation error:`, error);
  
  let message = 'An unknown error occurred';
  let details = error;

  if (error instanceof Error) {
    message = error.message;
    details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = error.message || error.error || JSON.stringify(error);
  }

  return {
    message,
    details,
    timestamp: new Date().toISOString(),
    context
  };
};

export const validateCalculationInputs = (asins: any[]) => {
  const errors: string[] = [];
  
  if (!asins || !Array.isArray(asins)) {
    errors.push('No ASINs provided for calculation');
    return errors;
  }

  if (asins.length === 0) {
    errors.push('ASIN list is empty');
    return errors;
  }

  const invalidAsins = asins.filter(asin => 
    !asin || 
    typeof asin.asin !== 'string' || 
    asin.asin.trim().length === 0 ||
    !asin.price || 
    typeof asin.price !== 'number' ||
    asin.price <= 0
  );

  if (invalidAsins.length > 0) {
    errors.push(`${invalidAsins.length} ASINs have invalid data (missing ASIN or price)`);
  }

  return errors;
};

export const createErrorReport = (errorInfo: ErrorInfo): string => {
  return `
=== Amazon FBA Calculator Error Report ===

Context: ${errorInfo.context}
Time: ${errorInfo.timestamp}
Message: ${errorInfo.message}

Details:
${JSON.stringify(errorInfo.details, null, 2)}

Please check the console for more detailed error information.
If this problem persists, please report it with this error report.
  `.trim();
};