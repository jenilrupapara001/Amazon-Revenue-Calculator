import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { calculateProfits } from '../services/engine';
import { AsinItem } from '../types';
import { 
  Download, Plus, Trash2, Edit2, Loader2, RefreshCw, AlertCircle, 
  IndianRupee, Settings, Save, Info, Upload as UploadIcon, Calculator, 
  FileText, Search, X, CheckCircle, AlertTriangle, ArrowRight, ChevronRight, 
  FileSpreadsheet, Package, Link as LinkIcon, RotateCcw, ChevronLeft, 
  HelpCircle, Eye, ArrowUpDown 
} from 'lucide-react';
import { Button, Card, Input, Badge, StatCard } from './ui';
import { ErrorDisplay } from './ErrorDisplay';
import { handleCalculationError, validateCalculationInputs, ErrorInfo } from '../utils/errorHandler';

// Import the modals from the original App.tsx
import { ProductDetailsModal } from './ProductDetailsModal';
import { ReturnPercentageModal } from './ReturnPercentageModal';

interface ResultsPageProps {
  asins: AsinItem[];
  onRefresh: () => void;
  onClear: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ asins, onRefresh, onClear }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Error handling state
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<AsinItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Pagination State for Results Table
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => { setPage(1); }, [filterCategory, searchTerm]);

  const handleFetch = async (force: boolean) => {
    setIsFetching(true);
    try {
      const { fetchKeepaData } = await import('../services/engine');
      await fetchKeepaData(asins, force);
      await onRefresh();
    } catch (e) {
      console.error('Fetch error:', e);
      alert("Error occurred during data fetch. Please check your API key and try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setErrorInfo(null);
    
    try {
      // Validate inputs first
      const validationErrors = validateCalculationInputs(asins);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const currentAsins = await db.getAsins();
      await calculateProfits(currentAsins);
      await onRefresh();
    } catch (e) {
      const errorInfo = handleCalculationError(e, 'calculateProfits');
      setErrorInfo(errorInfo);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['ASIN', 'Title', 'Category', 'Price', 'Weight', 'Ref Fee', 'Closing', 'Shipping', 'Storage', 'Tax', 'Total Fees', 'Net Profit', 'Margin', 'Return %', 'STEP Level', 'Return Fee'];
      const rows = asins.map(a => [
        a.asin, `"${a.title?.replace(/"/g, '""')}"`, a.category, a.price, a.weight,
        a.referralFee, a.closingFee, (a.shippingFee || 0) + (a.pickAndPackFee || 0), a.storageFee, a.tax,
        a.totalFees, a.netRevenue, a.marginPercent, a.returnPercent || 0, a.stepLevel || '-', a.returnFee || 0
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `fba_profitability_export.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      console.error('Export error:', e);
      alert("Error occurred during export. Please try again.");
    }
  };

  // Action handlers
  const handleViewDetails = (item: AsinItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleDeleteItem = async (item: AsinItem) => {
    if (confirm(`Are you sure you want to delete ${item.asin}?`)) {
      try {
        await db.deleteAsin(item.id);
        await onRefresh();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const handleEditReturnPercentage = (item: AsinItem) => {
    setSelectedItem(item);
    setShowReturnModal(true);
  };

  const handleSaveReturnPercentage = async (item: AsinItem, returnPercent: number, stepLevel: string) => {
    try {
      // Update the item with return percentage and STEP level
      await db.updateAsin(item.id, { returnPercent, stepLevel: stepLevel as 'Basic' | 'Standard' | 'Advanced' | 'Premium' });
      
      // Recalculate the profitability with return fee calculation
      const updatedAsins = await db.getAsins();
      await calculateProfits(updatedAsins);
      
      // Refresh the data
      await onRefresh();
    } catch (error) {
      console.error('Error updating return percentage:', error);
      alert('Failed to update return percentage');
    }
  };

  const filtered = asins.filter(a =>
    (a.asin.toLowerCase().includes(searchTerm.toLowerCase()) || a.title?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterCategory ? a.category === filterCategory : true)
  );

  const categories = Array.from(new Set(asins.map(a => a.category).filter(Boolean)));

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const displayedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Error Display */}
      <ErrorDisplay error={errorInfo} onClose={() => setErrorInfo(null)} />

      {/* Filters: full-width sticky card above table */}
      <div className="w-full">
        <Card className="sticky top-20 z-30 p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-4 items-end">

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  className="m-0"
                  inputClassName="pl-10 h-10"
                  placeholder="Search ASIN or title..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
              {/* Secondary group: Fetch / Refresh / Export */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  startIcon={RefreshCw}
                  onClick={() => handleFetch(false)}
                  disabled={isFetching || isCalculating}
                  className="w-full sm:w-auto"
                >
                  Fetch
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  startIcon={RotateCcw}
                  onClick={() => handleFetch(true)}
                  disabled={isFetching || isCalculating}
                  title="Force refresh"
                  className="w-full sm:w-auto"
                />

                <Button
                  size="sm"
                  variant="secondary"
                  startIcon={Download}
                  onClick={handleExport}
                  className="w-full sm:w-auto"
                >
                  Export
                </Button>
              </div>

              {/* Primary action: Calculate */}
              <div className="sm:ml-2">
                <Button
                  size="md"
                  variant="primary"
                  startIcon={Calculator}
                  onClick={handleCalculate}
                  disabled={isFetching || isCalculating}
                  loading={isCalculating}
                  className="w-full sm:w-auto"
                >
                  {isCalculating ? 'Calculating…' : 'Calculate'}
                </Button>
              </div>

              {/* Danger group */}
              <div className="sm:ml-2">
                <Button
                  size="sm"
                  variant="danger"
                  startIcon={Trash2}
                  onClick={() => confirm('Clear all?') && onClear()}
                  className="w-full sm:w-auto"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white shadow-sm relative">
          <table className="table text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[300px]">Product</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Price (₹)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Wt (g)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ref Fee</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Closing</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider group cursor-help" title="Includes Shipping + Pick & Pack">
                  <span className="border-b border-dashed border-slate-400">Fulfill</span>
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Storage</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">GST</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider font-bold">Total Fees</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider font-bold text-slate-900">Net Profit</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider font-bold text-slate-900">Margin</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Return Fee</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                        {item.image ? <img className="h-full w-full object-cover" src={item.image} alt="" /> : <Package className="h-5 w-5 text-slate-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 truncate max-w-[200px]" title={item.title}>
                          <a href={`https://www.amazon.in/dp/${item.asin}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 hover:underline">
                            {item.title || item.asin}
                          </a>
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10 font-mono select-all">
                            {item.asin}
                          </span>
                          {item.categoryId && (
                            <span className="inline-flex items-center rounded-sm bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 ring-1 ring-inset ring-orange-600/20 font-mono select-all" title="Node ID">
                              {item.categoryId}
                            </span>
                          )}
                          <Badge status={item.status} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate" title={item.categoryPath || item.category}>
                    {item.categoryPath || item.category || '-'}
                  </td>
                  <td className="px-4 py-3 number mono">{item.price ? `₹${item.price}` : '-'}</td>
                  <td className="px-4 py-3 number mono">{item.weight ? `${item.weight}` : '-'}</td>
                  <td className="px-4 py-3 number mono">{item.referralFee ? item.referralFee : '-'}</td>
                  <td className="px-4 py-3 number mono">{item.closingFee ? item.closingFee : '-'}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-600 group relative cursor-help font-mono">
                    <span className="border-b border-dashed border-slate-300">
                      {(item.shippingFee || 0) + (item.pickAndPackFee || 0) > 0 ? (item.shippingFee || 0) + (item.pickAndPackFee || 0) : '-'}
                    </span>
                    {((item.shippingFee || 0) + (item.pickAndPackFee || 0) > 0) && (
                      <div className="hidden group-hover:block absolute bottom-full right-0 bg-slate-800 text-white text-[10px] p-2 rounded mb-1 whitespace-nowrap z-20 shadow-lg">
                        Weight Fee: ₹{item.shippingFee}<br />Pick & Pack: ₹{item.pickAndPackFee}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 number mono">{item.storageFee ? item.storageFee : '-'}</td>
                  <td className="px-4 py-3 number mono">{item.tax ? item.tax : '-'}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700 font-mono">
                    {item.totalFees ? `₹${item.totalFees}` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-bold ${item.netRevenue && item.netRevenue > 0 ? 'text-green-600' : 'text-red-600'} mono`}>
                    {item.netRevenue ? `₹${item.netRevenue}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.marginPercent !== undefined ? (
                      <div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${item.marginPercent > 15 ? 'bg-green-50 text-green-800' :
                          item.marginPercent > 0 ? 'bg-yellow-50 text-yellow-800' :
                            'bg-red-50 text-red-700'
                          }`}>
                          {Number(item.marginPercent).toFixed(1)}%
                        </span>
                        {item.returnPercent && item.returnPercent > 0 && (
                          <div className="text-xs text-orange-600 mt-1 font-medium">
                            Return: {item.returnPercent}%
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700 font-mono">
                    {item.returnFee && item.stepLevel ? (
                      <div>
                        <div>₹{item.returnFee}</div>
                        <div className="text-xs text-slate-500">{item.stepLevel}</div>
                        {item.returnPercent && item.returnPercent > 0 && (
                          <div className="text-xs text-orange-600 font-medium">
                            Return: {item.returnPercent}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        className="h-8 w-8 p-0"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditReturnPercentage(item)}
                        className="h-8 w-8 p-0"
                        title="Edit Return %"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayedItems.length === 0 && <div className="p-10 text-center text-slate-400">No items found matching your criteria.</div>}
        </Card>

        <div className="flex justify-between items-center bg-white p-2 border-t border-slate-200">
          <span className="text-sm text-slate-500">Showing {displayedItems.length} of {filtered.length} entries</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ProductDetailsModal
        item={selectedItem}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedItem(null);
        }}
      />
      
      <ReturnPercentageModal
        item={selectedItem}
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveReturnPercentage}
      />
    </div>
  );
};