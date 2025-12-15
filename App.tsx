
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { User, ReferralFee, ClosingFee, ShippingFee, StorageFee, RefundFee, AsinItem, ReferralFeeTier, CategoryMap, NodeMap } from './types';
import { fetchKeepaData, calculateProfits } from './services/engine';
import { Download, Plus, Trash2, Edit2, Loader2, RefreshCw, AlertCircle, IndianRupee, Settings, Save, Info, Upload as UploadIcon, Calculator, FileText, Search, X, CheckCircle, AlertTriangle, ArrowRight, ChevronRight, FileSpreadsheet, Package, Link as LinkIcon, RotateCcw, ChevronLeft, HelpCircle, Eye, ArrowUpDown } from 'lucide-react';
import { Button, Card, Input, Badge, StatCard } from './components/ui';
import UserSettings from './components/UserSettings';


// --- Helper: Robust CSV Parser ---
const parseCSV = (text: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  // Normalize newlines
  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const nextChar = cleanedText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // Skip escape quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  // Push last row if exists
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
};

// --- Login Page ---
const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await db.login(email, password);
      if (user) {
        onLogin();
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white shadow-sm mb-4">
          <IndianRupee className="h-8 w-8 text-blue-600" />
        </div>

        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Amazon FBA Pro
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Enterprise Profitability Calculator
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 border border-slate-100 rounded-xl">
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            <Input
              label="Email Address"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center text-sm font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};


// --- Dashboard ---

const Dashboard = ({ asins }: { asins: AsinItem[] }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [keepaKey, setKeepaKey] = useState(db.getKeepaKey());

  const saveSettings = () => {
    db.saveKeepaKey(keepaKey);
    setShowSettings(false);
    alert("Settings Saved");
  };

  const stats = {
    total: asins.length,
    processed: asins.filter(a => a.status === 'calculated').length,
    errors: asins.filter(a => a.status === 'error').length,
    avgMargin: 0
  };

  const calculatedItems = asins.filter(a => a.status === 'calculated' && a.marginPercent !== undefined);
  if (calculatedItems.length > 0) {
    const sum = calculatedItems.reduce((acc, curr) => acc + (curr.marginPercent || 0), 0);
    stats.avgMargin = sum / calculatedItems.length;
  }

  return (
    <div className="space-y-10">

      {/* ===== Page Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            High-level overview of your ASIN portfolio and profitability metrics
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Settings}
          onClick={() => setShowSettings(!showSettings)}
          className="shrink-0"
        >
          API Configuration
        </Button>
      </div>

      {/* ===== API Settings Panel ===== */}
      {showSettings && (
        <Card className="animate-in slide-in-from-top-2 border border-slate-200 bg-slate-50/60 backdrop-blur-sm">
          <div className="p-6 flex flex-col lg:flex-row gap-6">

            {/* Left */}
            <div className="flex-1 max-w-lg">
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                External Integrations
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Configure APIs used for live pricing and historical data.
              </p>

              <Input
                label="Keepa API Key"
                type="password"
                value={keepaKey}
                onChange={(e: any) => setKeepaKey(e.target.value)}
                placeholder="••••••••••••••••"
              />

              <div className="flex justify-end gap-2 mt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={saveSettings}>
                  Save Configuration
                </Button>
              </div>
            </div>

            {/* Right Info Box */}
            <div className="hidden lg:block w-80">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-medium">Security Note</p>
                    <p className="text-blue-700 mt-1 leading-relaxed">
                      API keys are stored locally in your browser.
                      A valid Keepa subscription is required for
                      real-time data access.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* ===== KPI Section ===== */}
      <div>
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            Key Metrics
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            High-level performance overview
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="Total Inventory"
            value={stats.total}
            icon={Package}
            colorClass="text-slate-600"
          />

          <StatCard
            title="Calculated ASINs"
            value={stats.processed}
            icon={CheckCircle}
            colorClass="text-blue-600"

          />

          <StatCard
            title="Average Margin"
            value={`${stats.avgMargin.toFixed(1)}%`}
            icon={IndianRupee}
            colorClass="text-green-600"

          />

          <StatCard
            title="Issues Found"
            value={stats.errors}
            icon={AlertTriangle}
            colorClass="text-red-500"
          />
        </div>
      </div>


    </div>


  );
};

// --- Upload Page ---
const UploadPage = ({ onUploadComplete, onNavigate }: { onUploadComplete: () => void, onNavigate: (p: string) => void }) => {
  const [rawText, setRawText] = useState('');
  const [stapleLevel, setStapleLevel] = useState<'Standard' | 'Heavy' | 'Oversize'>('Standard');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUploadText = async () => {
    const asinList = rawText.split(/[\n,]+/).map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    if (asinList.length === 0) return;
    await db.addAsinsBulk(asinList.map(a => ({ asin: a, stapleLevel })));
    setRawText('');
    onUploadComplete();
    onNavigate('results');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      // Use Robust Parser
      const rows = parseCSV(text);

      const newAsins: { asin: string; stapleLevel: 'Standard' | 'Heavy' | 'Oversize' }[] = [];
      rows.forEach(parts => {
        const asin = parts[0]?.trim().toUpperCase();
        if (!asin || asin.toLowerCase() === 'asin') return;
        let sLevel = stapleLevel;
        if (parts[1]) {
          const val = parts[1].trim().toLowerCase();
          if (val === 'heavy') sLevel = 'Heavy';
          else if (val === 'oversize') sLevel = 'Oversize';
        }
        newAsins.push({ asin, stapleLevel: sLevel });
      });
      if (newAsins.length > 0) {
        await db.addAsinsBulk(newAsins);
        onUploadComplete();
        onNavigate('results');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto">

      {/* ===== Page Header ===== */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Bulk Import ASINs
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Add products to your workspace for fee calculation and profitability
          analysis. Import ASINs manually or upload a CSV file.
        </p>
      </div>

      {/* ===== Import Methods ===== */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* ===== Manual Entry ===== */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Manual ASIN Entry
            </h3>
          </div>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ASIN List
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Enter one ASIN per line
              </p>

              <Input
                multiline
                rows={9}
                inputClassName="w-full p-3 text-sm font-mono leading-relaxed"
                placeholder={`B08N5KWB9H\nB07XJ8C8F5\nB09XYZ1234`}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Default Size Tier
              </label>
              <select
                className="w-full p-2.5 border border-slate-300 rounded-md bg-white text-sm focus:ring-orange-500 focus:border-orange-500"
                value={stapleLevel}
                onChange={e => setStapleLevel(e.target.value as any)}
              >
                <option value="Standard">Standard Size</option>
                <option value="Oversize">Oversize</option>
                <option value="Heavy">Heavy & Bulky</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleUploadText}
            disabled={!rawText}
            className="mt-6 w-full"
          >
            Process ASINs
          </Button>
        </Card>

        {/* ===== CSV Upload ===== */}
        <Card className="p-6 flex flex-col justify-center items-center text-center border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/60 transition">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
            <FileSpreadsheet className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-900">
            Upload CSV File
          </h3>

          <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">
            Upload a CSV or TXT file containing ASINs.
            <br />
            <span className="font-mono text-xs text-slate-600">
              ASIN, SizeTier (optional)
            </span>
          </p>

          <input
            type="file"
            accept=".csv,.txt"
            ref={fileRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            variant="secondary"
            icon={UploadIcon}
            onClick={() => fileRef.current?.click()}
            className="mt-6"
          >
            Browse Files
          </Button>

          <p className="text-xs text-slate-400 mt-3">
            Maximum recommended size: 10,000 ASINs
          </p>
        </Card>

      </div>
    </div>

  );
};

// --- Fees Page ---
const FeesPage = () => {
  const [tab, setTab] = useState<'referral' | 'closing' | 'shipping' | 'storage' | 'refund' | 'mapping' | 'nodemap'>('referral');
  const [refFees, setRefFees] = useState<ReferralFee[]>([]);
  const [closeFees, setCloseFees] = useState<ClosingFee[]>([]);
  const [shipFees, setShipFees] = useState<ShippingFee[]>([]);
  const [storageFees, setStorageFees] = useState<StorageFee[]>([]);
  const [refundFees, setRefundFees] = useState<RefundFee[]>([]);
  const [mappings, setMappings] = useState<CategoryMap[]>([]);
  const [nodeMaps, setNodeMaps] = useState<NodeMap[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Closing fees pagination + search (separate from referral pagination)
  const [closePage, setClosePage] = useState(1);
  const [closePerPage, setClosePerPage] = useState(50);
  const [closeSearch, setCloseSearch] = useState('');

  const [editRef, setEditRef] = useState<Partial<ReferralFee> | null>(null);
  const [editClose, setEditClose] = useState<Partial<ClosingFee> | null>(null);
  const [editShip, setEditShip] = useState<Partial<ShippingFee> | null>(null);
  const [editStorage, setEditStorage] = useState<Partial<StorageFee> | null>(null);
  const [newMapping, setNewMapping] = useState({ keepaCategory: '', feeCategory: '' });
  const [newNodeMap, setNewNodeMap] = useState({ nodeId: '', feeCategoryName: '' });

  const masterSheetInputRef = useRef<HTMLInputElement>(null);
  const closeFeesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFees(); }, []);

  // Reset page when tab or search changes
  useEffect(() => { setPage(1); }, [tab, searchTerm]);
  useEffect(() => { setClosePage(1); }, [tab, closeSearch]);

  const seedRefundFees = async (): Promise<RefundFee[]> => {
    const existing = await db.getRefundFees();
    if (existing.length > 0) return existing;

    const defaultFees: RefundFee[] = [
      { id: 'rf1', minPrice: 0, maxPrice: 300, basic: 50, standard: 45, advanced: 40, premium: 40, category: 'General' },
      { id: 'rf2', minPrice: 301, maxPrice: 500, basic: 75, standard: 70, advanced: 65, premium: 65, category: 'General' },
      { id: 'rf3', minPrice: 501, maxPrice: 1000, basic: 100, standard: 95, advanced: 85, premium: 85, category: 'General' },
      { id: 'rf4', minPrice: 1001, maxPrice: 99999999, basic: 140, standard: 130, advanced: 110, premium: 110, category: 'General' },
      { id: 'rf5', minPrice: 0, maxPrice: 300, basic: 30, standard: 27, advanced: 24, premium: 24, category: 'Apparel' },
      { id: 'rf6', minPrice: 301, maxPrice: 500, basic: 45, standard: 42, advanced: 39, premium: 39, category: 'Apparel' },
      { id: 'rf7', minPrice: 501, maxPrice: 1000, basic: 60, standard: 57, advanced: 51, premium: 51, category: 'Apparel' },
      { id: 'rf8', minPrice: 1001, maxPrice: 99999999, basic: 84, standard: 78, advanced: 66, premium: 66, category: 'Apparel' },
      { id: 'rf9', minPrice: 0, maxPrice: 300, basic: 35, standard: 32, advanced: 28, premium: 28, category: 'Shoes' },
      { id: 'rf10', minPrice: 301, maxPrice: 500, basic: 50, standard: 47, advanced: 42, premium: 42, category: 'Shoes' },
      { id: 'rf11', minPrice: 501, maxPrice: 1000, basic: 65, standard: 62, advanced: 55, premium: 55, category: 'Shoes' },
      { id: 'rf12', minPrice: 1001, maxPrice: 99999999, basic: 90, standard: 85, advanced: 72, premium: 72, category: 'Shoes' },
    ];

    for (const fee of defaultFees) {
      await db.saveRefundFee(fee);
    }

    return await db.getRefundFees();
  };

  const loadFees = async () => {
    setRefFees(await db.getReferralFees());
    setCloseFees(await db.getClosingFees());
    setShipFees(await db.getShippingFees());
    setStorageFees(await db.getStorageFees());
    setRefundFees(await seedRefundFees());
    setMappings(await db.getCategoryMappings());
    setNodeMaps(await db.getNodeMaps());
  };

  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${tab} data? This cannot be undone.`)) return;

    if (tab === 'referral') await db.clearReferralFees();
    else if (tab === 'closing') await db.clearClosingFees();
    else if (tab === 'shipping') await db.clearShippingFees();
    else if (tab === 'storage') {/* No clear all for storage implemented in db yet, maybe unneeded */ }
    else if (tab === 'refund') await db.clearRefundFees();
    else if (tab === 'mapping') await db.clearCategoryMappings();
    else if (tab === 'nodemap') await db.clearNodeMaps();

    loadFees();
  };

  const handleMasterSheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;

      // Use Robust Parser
      const rows = parseCSV(text);
      if (rows.length < 2) return;

      const header = rows[0].map(h => h.trim().toLowerCase());
      const idxCat = header.findIndex(h => h === 'categories');
      const idxNode = header.findIndex(h => h === 'category node' || h === 'category node id');
      const tierCols: { idx: number, min: number, max: number }[] = [];

      header.forEach((h, idx) => {
        const rangeMatch = h.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          tierCols.push({ idx, min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) });
          return;
        }
        const aboveMatch = h.match(/^above (\d+)$/) || h.match(/^(\d+)\+$/);
        if (aboveMatch) {
          tierCols.push({ idx, min: parseFloat(aboveMatch[1]) + 0.01, max: 99999999 });
        }
      });

      if (idxCat === -1) { alert("Could not find 'Categories' column"); return; }

      // Detect if CSV is Referral (has tiers) or Closing (has Fee/Min/Max) data
      const hasTierColumns = tierCols.length > 0;
      const idxFee = header.findIndex(h => h.includes('fee') || h.includes('closing'));
      const idxMin = header.findIndex(h => h.includes('min'));
      const idxMax = header.findIndex(h => h.includes('max'));

      if (hasTierColumns) {
        const newFees: Omit<ReferralFee, 'id'>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length <= idxCat) continue;
          const category = row[idxCat]?.replace(/"/g, '').trim();
          const nodeId = idxNode !== -1 ? row[idxNode]?.trim() : undefined;
          if (!category) continue;
          const tiers: ReferralFeeTier[] = [];
          tierCols.forEach(tc => {
            let valStr = row[tc.idx]?.replace('%', '').trim();
            if (valStr && !isNaN(parseFloat(valStr))) {
              tiers.push({ minPrice: tc.min, maxPrice: tc.max, percentage: parseFloat(valStr) });
            }
          });
          if (tiers.length > 0) newFees.push({ category, nodeId, tiers });
        }

        if (newFees.length > 0) {
          alert(`Found ${newFees.length} categories. Starting import... (This may take a moment)`);
          await db.saveReferralFeesBulk(newFees);
          loadFees();
          alert(`Successfully imported ${newFees.length} categories.`);
        }
      } else if (idxFee !== -1 && (idxMin !== -1 || idxMax !== -1)) {
        // Closing fee style CSV with explicit min/max/fee or category-level fee
        const newClosing: Omit<ClosingFee, 'id'>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length <= idxCat) continue;
          const category = row[idxCat]?.replace(/"/g, '').trim();
          const nodeId = idxNode !== -1 ? row[idxNode]?.trim() : undefined;
          const feeVal = row[idxFee]?.replace(/[^0-9.]/g, '').trim();
          const minVal = idxMin !== -1 ? parseFloat(row[idxMin]) : 0;
          const maxVal = idxMax !== -1 ? parseFloat(row[idxMax]) : 99999999;
          if (!feeVal || isNaN(parseFloat(feeVal))) continue;
          const feeNum = parseFloat(feeVal);
          newClosing.push({ minPrice: isNaN(minVal) ? 0 : minVal, maxPrice: isNaN(maxVal) ? 99999999 : maxVal, fee: feeNum, category: category || undefined, nodeId: nodeId || undefined });
        }
        if (newClosing.length > 0) {
          alert(`Found ${newClosing.length} closing fee entries. Importing...`);
          await db.saveClosingFeesBulk(newClosing);
          loadFees();
          alert(`Imported ${newClosing.length} closing fee entries.`);
        }
      } else {
        alert('No recognizable fee data found in CSV. Expected tiered referral or closing fee columns.');
      }
    };
    reader.readAsText(file);
    if (masterSheetInputRef.current) masterSheetInputRef.current.value = '';
  };

  const parseRangeFromHeader = (h: string): { min: number; max: number } | null => {
    if (!h) return null;
    const s = h.toLowerCase().replace(/\s+/g, '');
    // match patterns like fc0-300, fc301-500, fc501-1000
    const rangeMatch = s.match(/(\d+)-(\d+)/);
    if (rangeMatch) return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
    const aboveMatch = s.match(/above(\d+)|(?:>(=)?)(\d+)/);
    if (aboveMatch) {
      const num = parseFloat(aboveMatch[1] || aboveMatch[3] || '0');
      return { min: num + 0.01, max: 99999999 };
    }
    const plusMatch = s.match(/(\d+)\+/);
    if (plusMatch) return { min: parseFloat(plusMatch[1]) + 0.01, max: 99999999 };
    // fallback: try to find a leading number
    const numMatch = s.match(/^(?:fc|sf|es|mfn)?(\d+)/);
    if (numMatch) return { min: parseFloat(numMatch[1]), max: parseFloat(numMatch[1]) };
    return null;
  };

  const handleCloseFeesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) return alert('CSV appears empty');

      const headerRaw = rows[0].map(h => (h || '').toString().trim());
      const header = headerRaw.map(h => h.toLowerCase().replace(/\s+/g, ''));
      const idxCat = header.findIndex(h => h === 'categories' || h === 'category' || h === 'categoryname');
      const idxNode = header.findIndex(h => h === 'categorynode' || h === 'categorynodeid' || h === 'categorynode_id');

      if (idxCat === -1) return alert("CSV must include a 'Categories' column");

      // Find all fee columns that match FC/SF/ES/MFN + range
      const feeCols: { idx: number; sellerType: string; range: { min: number; max: number } }[] = [];
      headerRaw.forEach((hRaw, idx) => {
        const h = (hRaw || '').toString();
        const key = h.toLowerCase().replace(/\s+/g, '');
        const m = key.match(/^(fc|sf|es|mfn)(.*)$/);
        if (m) {
          const sellerType = m[1].toUpperCase();
          const rest = m[2];
          const range = parseRangeFromHeader(rest);
          if (range) feeCols.push({ idx, sellerType, range });
        }
      });

      if (feeCols.length === 0) return alert('No fee columns detected. Expect columns like FC0-300, SF301-500, MFNAbove1000 etc.');

      const newClose: Omit<ClosingFee, 'id'>[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const category = (row[idxCat] || '').toString().replace(/"/g, '').trim();
        const nodeId = idxNode !== -1 ? (row[idxNode] || '').toString().trim() : undefined;
        if (!category && !nodeId) continue; // skip blank rows

        for (const fc of feeCols) {
          const rawVal = (row[fc.idx] || '').toString().replace(/[^0-9.\-]/g, '').trim();
          if (!rawVal) continue;
          const feeNum = parseFloat(rawVal);
          if (isNaN(feeNum)) continue;
          newClose.push({ minPrice: fc.range.min, maxPrice: fc.range.max, fee: feeNum, category: category || undefined, nodeId: nodeId || undefined, sellerType: fc.sellerType as any });
        }
      }

      if (newClose.length === 0) return alert('No valid fee values found in CSV rows.');

      if (!confirm(`Import ${newClose.length} closing fee entries? This will add entries to existing closing fees.`)) return;
      await db.saveClosingFeesBulk(newClose);
      await loadFees();
      alert(`Imported ${newClose.length} closing fee entries.`);
    };
    reader.readAsText(file);
    if (closeFeesInputRef.current) closeFeesInputRef.current.value = '';
  };

  const saveRef = async () => { if (editRef) { await db.saveReferralFee(editRef as ReferralFee); setEditRef(null); loadFees(); } };
  const delRef = async (id: string) => { if (confirm('Delete rule?')) { await db.deleteReferralFee(id); loadFees(); } };

  const saveClose = async () => { if (editClose) { await db.saveClosingFee(editClose as ClosingFee); setEditClose(null); loadFees(); } };
  const delClose = async (id: string) => { if (confirm('Delete slab?')) { await db.deleteClosingFee(id); loadFees(); } };

  const saveShip = async () => { if (editShip) { await db.saveShippingFee(editShip as ShippingFee); setEditShip(null); loadFees(); } };
  const delShip = async (id: string) => { if (confirm('Delete fee?')) { await db.deleteShippingFee(id); loadFees(); } };

  const saveStorage = async () => { if (editStorage) { await db.saveStorageFee(editStorage as StorageFee); setEditStorage(null); loadFees(); } };
  const delStorage = async (id: string) => { if (confirm('Delete fee?')) { await db.deleteStorageFee(id); loadFees(); } };

  const saveMapping = async () => {
    if (!newMapping.keepaCategory || !newMapping.feeCategory) return;
    await db.saveCategoryMapping(newMapping);
    setNewMapping({ keepaCategory: '', feeCategory: '' });
    loadFees();
  };
  const delMapping = async (id: string) => { if (confirm('Delete mapping?')) { await db.deleteCategoryMapping(id); loadFees(); } };

  const saveNodeMap = async () => {
    if (!newNodeMap.nodeId || !newNodeMap.feeCategoryName) return;
    await db.saveNodeMap(newNodeMap);
    setNewNodeMap({ nodeId: '', feeCategoryName: '' });
    loadFees();
  };
  const delNodeMap = async (id: string) => { if (confirm('Delete node map?')) { await db.deleteNodeMap(id); loadFees(); } };


  const addTier = () => { if (!editRef) return; setEditRef({ ...editRef, tiers: [...(editRef.tiers || []), { minPrice: 0, maxPrice: 99999999, percentage: 0 }] }); };
  const updateTier = (idx: number, f: keyof ReferralFeeTier, v: number) => { if (!editRef?.tiers) return; const nt = [...editRef.tiers]; nt[idx] = { ...nt[idx], [f]: v }; setEditRef({ ...editRef, tiers: nt }); };
  const removeTier = (idx: number) => { if (!editRef?.tiers) return; setEditRef({ ...editRef, tiers: editRef.tiers.filter((_, i) => i !== idx) }); };

  // Improved Search Logic: Checks both Name AND Node ID
  const filteredRefFees = refFees.filter(r => {
    const term = searchTerm.toLowerCase();
    return r.category.toLowerCase().includes(term) || (r.nodeId && String(r.nodeId).toLowerCase().includes(term));
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRefFees.length / ITEMS_PER_PAGE);
  const displayedFees = filteredRefFees.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Fee Master Configuration
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage Amazon India marketplace fee structures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={masterSheetInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleMasterSheetUpload}
          />

          <Button
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => masterSheetInputRef.current?.click()}
          >
            Upload Master
          </Button>

          <Button
            size="sm"
            variant="danger"
            icon={Trash2}
            onClick={handleClearAll}
          >
            Clear
          </Button>
        </div>
      </div>


      <div className="bg-slate-50 border border-slate-200 rounded-lg px-2">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: 'referral', label: 'Referral Fees' },
            { id: 'closing', label: 'Closing Fees' },
            { id: 'shipping', label: 'Shipping Fees' },
            { id: 'storage', label: 'Storage Fees' },
            { id: 'refund', label: 'Refund Fees' },
            { id: 'mapping', label: 'Name Mapping' },
            { id: 'nodemap', label: 'Category Node ID' },
          ].map(t => {
            const active = tab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`
            whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition
            ${active
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}
          `}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>


      {tab === 'referral' && (
        <div className="animate-in fade-in">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input className="m-0" inputClassName="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white" placeholder="Search ASIN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button onClick={() => setEditRef({ category: '', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 10 }] })} icon={Plus}>
              New Category
            </Button>
          </div>

          <div className="mb-4 text-sm text-slate-500 flex justify-between items-center">
            <span>Showing {displayedFees.length} of {filteredRefFees.length} entries</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" size="sm" icon={ChevronLeft} className="p-1 rounded" />
                <span className="font-medium">Page {page} of {totalPages}</span>
                <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="ghost" size="sm" icon={ChevronRight} className="p-1 rounded" />
              </div>
            )}
          </div>

          {editRef && (
            <Card className="mb-6 border-orange-200 ring-4 ring-orange-50/50 p-6">
              <h3 className="font-bold text-slate-800 mb-4">{editRef.id ? 'Edit Rule' : 'Create New Rule'}</h3>
              <Input label="Category Name" value={editRef.category} onChange={(e: any) => setEditRef({ ...editRef, category: e.target.value })} />
              <Input label="Node ID (Optional)" value={editRef.nodeId || ''} onChange={(e: any) => setEditRef({ ...editRef, nodeId: e.target.value })} />
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Pricing Tiers</label>
                {editRef.tiers?.map((tier, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="number" className="w-24 p-1 border rounded text-sm" value={tier.minPrice} onChange={e => updateTier(idx, 'minPrice', Number(e.target.value))} />
                    <span>-</span>
                    <input type="number" className="w-24 p-1 border rounded text-sm" value={tier.maxPrice} onChange={e => updateTier(idx, 'maxPrice', Number(e.target.value))} />
                    <span className="ml-2">Rate:</span>
                    <input type="number" className="w-16 p-1 border rounded text-sm" value={tier.percentage} onChange={e => updateTier(idx, 'percentage', Number(e.target.value))} />
                    <span>%</span>
                    <Button variant="ghost" size="sm" onClick={() => removeTier(idx)} icon={Trash2} className="text-red-500" />
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addTier} className="text-blue-600 text-sm flex items-center" icon={Plus}>Add Tier</Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveRef}>Save Rule</Button>
                <Button variant="ghost" onClick={() => setEditRef(null)}>Cancel</Button>
              </div>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedFees.map(r => (
              <Card key={r.id} className="p-4 relative hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-sm line-clamp-2" title={r.category}>{r.category}</h4>
                    {r.nodeId && <span className="text-xs text-slate-500 font-mono block mt-1">ID: {r.nodeId}</span>}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditRef(r)} icon={Edit2} />
                    <Button variant="ghost" size="sm" onClick={() => delRef(r.id)} icon={Trash2} />
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-600 mt-3 pt-2 border-t border-slate-100">
                  {r.tiers.map((t, i) => (
                    <div key={i} className="flex justify-between">
                      <span>₹{t.minPrice} - ₹{t.maxPrice}</span>
                      <span className="font-bold">{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" size="sm" icon={ChevronLeft} className="p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed" />
                <span className="text-sm font-medium px-2">Page {page} of {totalPages}</span>
                <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="ghost" size="sm" icon={ChevronRight} className="p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'shipping' && (
        <div className="animate-in fade-in">
          <div className="mb-6"><Button onClick={() => setEditShip({ sizeType: 'Standard', weightMin: 0, weightMax: 0, fee: 0, pickAndPackFee: 0 })} icon={Plus}>Add Weight Rule</Button></div>
          {editShip && (
            <Card className="p-6 mb-6">
              <h3 className="font-bold mb-4">Edit Shipping Rule</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-1"><label className="block text-sm font-medium mb-1">Type</label><select className="w-full border-slate-300 rounded-md p-2" value={editShip.sizeType} onChange={e => setEditShip({ ...editShip, sizeType: e.target.value as any })}><option value="Standard">Standard</option><option value="Heavy">Heavy</option><option value="Oversize">Oversize</option></select></div>
                <Input label="Min Weight (g)" type="number" value={editShip.weightMin} onChange={(e: any) => setEditShip({ ...editShip, weightMin: Number(e.target.value) })} />
                <Input label="Max Weight (g)" type="number" value={editShip.weightMax} onChange={(e: any) => setEditShip({ ...editShip, weightMax: Number(e.target.value) })} />
                <Input label="Fee (Base)" type="number" value={editShip.fee} onChange={(e: any) => setEditShip({ ...editShip, fee: Number(e.target.value) })} />

                <div className="col-span-2 md:col-span-4 border-t border-slate-100 pt-4 mt-2">
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <input type="checkbox" checked={editShip.useIncremental || false} onChange={e => setEditShip({ ...editShip, useIncremental: e.target.checked })} />
                    Enable Incremental Calculation
                  </label>
                  {editShip.useIncremental && (
                    <div className="flex gap-4">
                      <Input label="Step Size (g)" type="number" value={editShip.incrementalStep} onChange={(e: any) => setEditShip({ ...editShip, incrementalStep: Number(e.target.value) })} />
                      <Input label="Step Fee (₹)" type="number" value={editShip.incrementalFee} onChange={(e: any) => setEditShip({ ...editShip, incrementalFee: Number(e.target.value) })} />
                    </div>
                  )}
                </div>

                <Input label="Pick & Pack" type="number" value={editShip.pickAndPackFee} onChange={(e: any) => setEditShip({ ...editShip, pickAndPackFee: Number(e.target.value) })} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={saveShip}>Save Rule</Button>
                <Button variant="ghost" onClick={() => setEditShip(null)}>Cancel</Button>
              </div>
            </Card>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Weight Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Base Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Incremental</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pick & Pack</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {shipFees.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium">{s.sizeType}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{s.weightMin}-{s.weightMax}g</td>
                    <td className="px-6 py-4 text-sm font-bold">₹{s.fee}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {s.useIncremental ? `+₹${s.incrementalFee}/${s.incrementalStep}g` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">₹{s.pickAndPackFee || 0}</td>
                    <td className="px-6 py-4 text-right space-x-2 text-sm">
                      <Button variant="ghost" size="sm" onClick={() => setEditShip(s)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => delShip(s.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'storage' && (
        <div className="animate-in fade-in">
          <div className="mb-6"><Button onClick={() => setEditStorage({ duration: 'Monthly', rate: 45, description: '' })} icon={Plus}>Add Storage Rate</Button></div>
          {editStorage && (
            <Card className="p-6 mb-6 flex gap-4 items-end">
              <Input label="Description" value={editStorage.description} onChange={(e: any) => setEditStorage({ ...editStorage, description: e.target.value })} />
              <Input label="Rate (₹ per CuFt)" type="number" value={editStorage.rate} onChange={(e: any) => setEditStorage({ ...editStorage, rate: Number(e.target.value) })} />
              <div className="flex gap-2 mb-4">
                <Button onClick={saveStorage}>Save</Button>
                <Button variant="ghost" onClick={() => setEditStorage(null)}>Cancel</Button>
              </div>
            </Card>
          )}
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rate per Cubic Foot</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {storageFees.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-4 text-sm">{s.description || 'Standard'}</td>
                  <td className="px-6 py-4 text-sm font-bold">₹{s.rate}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditStorage(s)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => delStorage(s.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Closing Fee and Mapping Tabs maintained similar logic structure, omitted for brevity but logic is consistent */}
      {tab === 'closing' && (
        <div className="animate-in fade-in">
          {/* Closing Fee UI */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <input type="file" ref={closeFeesInputRef} className="hidden" accept=".csv" onChange={handleCloseFeesUpload} />
            <Button size="sm" icon={FileSpreadsheet} onClick={() => closeFeesInputRef.current?.click()}>Upload Closing Fees CSV</Button>
            <Button onClick={() => setEditClose({ minPrice: 0, maxPrice: 0, fee: 0 })} icon={Plus}>Add Slab</Button>
            <div className="text-xs text-slate-400">Expected CSV headers: <code>Categories, Category Node, Main Category Node, FC0-300, FC301-500, FC501-1000, FCAbove 1000, SF0-300, SF301-500, SF501-1000, SFAbove 1000, ES0-300, ES301-500, ES501-1000, ESAbove 1000, MFN0-300, MFN301-500, MFN501-1000, MFNAbove 1000</code></div>
          </div>
          {editClose && (
            <Card className="p-4 mb-6 flex flex-col gap-4 bg-orange-50">
              <div className="grid md:grid-cols-3 gap-4">
                <Input label="Category (Optional)" value={(editClose.category as string) || ''} onChange={(e: any) => setEditClose({ ...editClose, category: e.target.value })} />
                <Input label="Node ID (Optional)" value={(editClose.nodeId as string) || ''} onChange={(e: any) => setEditClose({ ...editClose, nodeId: e.target.value })} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Seller Type</label>
                  <select className="w-full border-slate-300 rounded-md p-2" value={(editClose.sellerType as string) || 'FC'} onChange={e => setEditClose({ ...editClose, sellerType: e.target.value as any })}>
                    <option value="FC">FC</option>
                    <option value="SF">SF</option>
                    <option value="ES">ES</option>
                    <option value="MFN">MFN</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Input label="Min" type="number" value={editClose.minPrice} onChange={(e: any) => setEditClose({ ...editClose, minPrice: Number(e.target.value) })} />
                <Input label="Max" type="number" value={editClose.maxPrice} onChange={(e: any) => setEditClose({ ...editClose, maxPrice: Number(e.target.value) })} />
                <Input label="Fee" type="number" value={editClose.fee} onChange={(e: any) => setEditClose({ ...editClose, fee: Number(e.target.value) })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveClose}>Save</Button>
                <Button variant="ghost" onClick={() => setEditClose(null)}>Cancel</Button>
              </div>
            </Card>
          )}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Input placeholder="Search category or node id" value={closeSearch} onChange={e => setCloseSearch(e.target.value)} inputClassName="h-10" />
              <div className="text-sm text-slate-500">Total: <span className="font-medium">{closeFees.length}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Per page</label>
              <select className="rounded-md border p-2 text-sm" value={closePerPage} onChange={e => { setClosePerPage(Number(e.target.value)); setClosePage(1); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Seller Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category / Node</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const term = closeSearch.toLowerCase().trim();
                const filtered = term
                  ? closeFees.filter(c => (c.category || '').toLowerCase().includes(term) || (c.nodeId || '').toLowerCase().includes(term))
                  : closeFees;
                const total = filtered.length;
                const totalPages = Math.max(1, Math.ceil(total / closePerPage));
                const start = (closePage - 1) * closePerPage;
                const pageItems = filtered.slice(start, start + closePerPage);
                return (
                  <>
                    {pageItems.map(c => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="px-6 py-4 text-sm">₹{c.minPrice} - ₹{c.maxPrice}</td>
                        <td className="px-6 py-4 text-sm font-bold">₹{c.fee}</td>
                        <td className="px-6 py-4 text-sm"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{(c.sellerType || 'FC').toUpperCase()}</span></td>
                        <td className="px-6 py-4 text-sm">{c.category || '-'}{c.nodeId ? ` / ${c.nodeId}` : ''}</td>
                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setEditClose(c)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => delClose(c.id)}>Delete</Button></div></td>
                      </tr>
                    ))}

                    {/* Pagination controls */}
                    <tr>
                      <td colSpan={4} className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-600">Showing {Math.min(total, start + 1)} - {Math.min(total, start + pageItems.length)} of {total}</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setClosePage(1)} disabled={closePage === 1}>First</Button>
                            <Button size="sm" variant="ghost" onClick={() => setClosePage(p => Math.max(1, p - 1))} disabled={closePage === 1}>Prev</Button>
                            <div className="text-sm">Page</div>
                            <input type="number" min={1} max={totalPages} value={closePage} onChange={e => { const v = Number(e.target.value || 1); if (!isNaN(v)) setClosePage(Math.min(Math.max(1, v), totalPages)); }} className="w-16 text-center rounded-md border px-2 py-1" />
                            <div className="text-sm">of {totalPages}</div>
                            <Button size="sm" variant="ghost" onClick={() => setClosePage(p => Math.min(totalPages, p + 1))} disabled={closePage === totalPages}>Next</Button>
                            <Button size="sm" variant="ghost" onClick={() => setClosePage(totalPages)} disabled={closePage === totalPages}>Last</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'mapping' && (
        <div className="animate-in fade-in">
          <Card className="p-6 mb-6">
            <h3 className="font-bold mb-4">Add Name Mapping</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Keepa Category Contains" value={newMapping.keepaCategory} onChange={(e: any) => setNewMapping({ ...newMapping, keepaCategory: e.target.value })} />
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Map To</label>
                <select className="w-full border-slate-300 rounded-md p-2" value={newMapping.feeCategory} onChange={e => setNewMapping({ ...newMapping, feeCategory: e.target.value })}>
                  <option value="">Select...</option>
                  {refFees.map(r => <option key={r.id} value={r.category}>{r.category}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={saveMapping}>Save Mapping</Button>
          </Card>
          <table className="min-w-full">
            <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Keepa</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fee Category</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-6 py-4 text-sm">{m.keepaCategory}</td>
                  <td className="px-6 py-4 text-sm">{m.feeCategory}</td>
                  <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" onClick={() => delMapping(m.id)}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'nodemap' && (
        <div className="animate-in fade-in">
          <Card className="p-6 mb-6">
            <h3 className="font-bold mb-4">Add Node ID Mapping</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Keepa Node ID (Exact)"
                value={newNodeMap.nodeId}
                onChange={(e: any) => setNewNodeMap({ ...newNodeMap, nodeId: e.target.value })}
                placeholder="e.g. 1571272031"
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Map To Fee Category</label>
                <select className="w-full border-slate-300 rounded-md p-2" value={newNodeMap.feeCategoryName} onChange={e => setNewNodeMap({ ...newNodeMap, feeCategoryName: e.target.value })}>
                  <option value="">Select...</option>
                  {refFees.map(r => <option key={r.id} value={r.category}>{r.category}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={saveNodeMap}>Save Node ID Map</Button>
          </Card>
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Keepa Node ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Referral Fee Category</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {nodeMaps.map(m => (
                <tr key={m.id}>
                  <td className="px-6 py-4 text-sm font-mono">{m.nodeId}</td>
                  <td className="px-6 py-4 text-sm">{m.feeCategoryName}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => delNodeMap(m.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'refund' && (
        <div className="animate-in fade-in">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Refund Fees Configuration</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Configure return processing fees based on price ranges and STEP levels.
                </p>
              </div>
              {refundFees.length === 0 && (
                <Button
                  onClick={async () => {
                    const defaultFees = [
                      { id: 'rf1', minPrice: 0, maxPrice: 300, basic: 50, standard: 45, advanced: 40, premium: 40, category: 'General' as const },
                      { id: 'rf2', minPrice: 301, maxPrice: 500, basic: 75, standard: 70, advanced: 65, premium: 65, category: 'General' as const },
                      { id: 'rf3', minPrice: 501, maxPrice: 1000, basic: 100, standard: 95, advanced: 85, premium: 85, category: 'General' as const },
                      { id: 'rf4', minPrice: 1001, maxPrice: 99999999, basic: 140, standard: 130, advanced: 110, premium: 110, category: 'General' as const },
                      { id: 'rf5', minPrice: 0, maxPrice: 300, basic: 30, standard: 27, advanced: 24, premium: 24, category: 'Apparel' as const },
                      { id: 'rf6', minPrice: 301, maxPrice: 500, basic: 45, standard: 42, advanced: 39, premium: 39, category: 'Apparel' as const },
                      { id: 'rf7', minPrice: 501, maxPrice: 1000, basic: 60, standard: 57, advanced: 51, premium: 51, category: 'Apparel' as const },
                      { id: 'rf8', minPrice: 1001, maxPrice: 99999999, basic: 84, standard: 78, advanced: 66, premium: 66, category: 'Apparel' as const },
                      { id: 'rf9', minPrice: 0, maxPrice: 300, basic: 35, standard: 32, advanced: 28, premium: 28, category: 'Shoes' as const },
                      { id: 'rf10', minPrice: 301, maxPrice: 500, basic: 50, standard: 47, advanced: 42, premium: 42, category: 'Shoes' as const },
                      { id: 'rf11', minPrice: 501, maxPrice: 1000, basic: 65, standard: 62, advanced: 55, premium: 55, category: 'Shoes' as const },
                      { id: 'rf12', minPrice: 1001, maxPrice: 99999999, basic: 90, standard: 85, advanced: 72, premium: 72, category: 'Shoes' as const }
                    ];
                    
                    for (const fee of defaultFees) {
                      await db.saveRefundFee(fee);
                    }
                    loadFees();
                    alert('Default refund fees loaded successfully');
                  }}
                  icon={Plus}
                >
                  Load Default Fees
                </Button>
              )}
            </div>
            
            {refundFees.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Found {refundFees.length} refund fee configurations. Return fees will be calculated automatically.
                  </span>
                </div>
              </div>
            )}
          </div>

          {refundFees.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-500 mb-4">No refund fees configured</div>
              <p className="text-sm text-slate-400 mb-6">
                Load default refund fees or configure custom rates for return processing costs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {refundFees.map((fee) => (
                <Card key={fee.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-slate-900">
                        {fee.category} - ₹{fee.minPrice} to ₹{fee.maxPrice === 99999999 ? '∞' : fee.maxPrice}
                      </h4>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {fee.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Simple edit functionality - could be enhanced with modal
                          const newBasic = prompt(`Enter new Basic fee for ${fee.category} (₹${fee.minPrice}-${fee.maxPrice === 99999999 ? '∞' : fee.maxPrice}):`, fee.basic.toString());
                          if (newBasic && !isNaN(Number(newBasic))) {
                            const updatedFee = { ...fee, basic: Number(newBasic) };
                            db.saveRefundFee(updatedFee).then(() => loadFees());
                          }
                        }}
                        icon={Edit2}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this refund fee?')) {
                            db.deleteRefundFee(fee.id).then(() => loadFees());
                          }
                        }}
                        icon={Trash2}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Price Range:</span>
                      <div className="font-medium">₹{fee.minPrice} - {fee.maxPrice === 99999999 ? '∞' : `₹${fee.maxPrice}`}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Basic:</span>
                      <div className="font-medium">₹{fee.basic}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Standard:</span>
                      <div className="font-medium">₹{fee.standard}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Advanced:</span>
                      <div className="font-medium">₹{fee.advanced}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Premium:</span>
                      <div className="font-medium">₹{fee.premium}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ResultsPage = ({ asins, onRefresh, onClear }: { asins: AsinItem[], onRefresh: any, onClear: any }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
      await fetchKeepaData(asins, force);
      await onRefresh();
    } catch (e) {
      console.error(e);
      alert("Error occurred during fetch.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const currentAsins = await db.getAsins();
      await calculateProfits(currentAsins);
      await onRefresh();
    } catch (e) {
      console.error(e);
      alert("Error occurred during calculation.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExport = () => {
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

        {/* Summary stats */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Items" value={filtered.length} icon={Package} colorClass="bg-slate-600 text-slate-600" />
            <StatCard title="Calculated" value={asins.filter(a => a.status === 'calculated').length} icon={CheckCircle} colorClass="bg-blue-600 text-blue-600" />
            <StatCard title="Average Margin" value={`${(asins.filter(a => a.marginPercent !== undefined).reduce((s, i) => s + (i.marginPercent || 0), 0) / Math.max(1, asins.filter(a => a.marginPercent !== undefined).length)).toFixed(1)}%`} icon={IndianRupee} colorClass="bg-green-600 text-green-600" />
            <StatCard title="Average Price" value={`₹${(asins.filter(a => a.price).reduce((s, i) => s + (i.price || 0), 0) / Math.max(1, asins.filter(a => a.price).length)).toFixed(0)}`} icon={IndianRupee} colorClass="bg-orange-600 text-orange-600" />
          </div> */}

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
                  <td className={`px-4 py-3 text-right text-sm font-bold ${(item.returnPercent ? item.adjustedNetRevenue : item.netRevenue) && (item.returnPercent ? item.adjustedNetRevenue : item.netRevenue) > 0 ? 'text-green-600' : 'text-red-600'} mono`}>
                    {item.returnPercent && item.adjustedNetRevenue ? `₹${item.adjustedNetRevenue}` : (item.netRevenue ? `₹${item.netRevenue}` : '-')}
                    {item.returnPercent && item.returnPercent > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        (Orig: ₹{item.netRevenue || 0})
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.marginPercent !== undefined ? (
                      <div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${(item.returnPercent ? item.adjustedMarginPercent : item.marginPercent) > 15 ? 'bg-green-50 text-green-800' :
                          (item.returnPercent ? item.adjustedMarginPercent : item.marginPercent) > 0 ? 'bg-yellow-50 text-yellow-800' :
                            'bg-red-50 text-red-700'
                          }`}>
                          {Number(item.returnPercent ? item.adjustedMarginPercent : item.marginPercent).toFixed(1)}%
                        </span>
                        {item.returnPercent && item.returnPercent > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            (Orig: {(item.marginPercent || 0).toFixed(1)}%)
                          </div>
                        )}
                        {item.returnPercent && item.returnPercent > 0 && (
                          <div className="text-xs text-orange-600 mt-1 font-medium">
                            Return: {item.returnPercent}%
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700 font-mono">
                    {item.returnFee && item.returnFee > 0 ? (
                      <div>
                        <div>₹{item.returnFee}</div>
                        {item.stepLevel && (
                          <div className="text-xs text-slate-500">{item.stepLevel}</div>
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

// --- Product Details Modal ---
const ProductDetailsModal = ({ item, isOpen, onClose }: { item: AsinItem | null, isOpen: boolean, onClose: () => void }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Product Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                {item.image ? <img className="h-full w-full object-cover" src={item.image} alt="" /> : <Package className="h-8 w-8 text-slate-300" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">{item.title || item.asin}</h3>
                <p className="text-sm text-slate-500 font-mono">{item.asin}</p>
                {item.brand && <p className="text-sm text-slate-600">Brand: {item.brand}</p>}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-slate-900">Basic Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-600">Category:</span>
                <span className="text-slate-900">{item.category || 'N/A'}</span>
                <span className="text-slate-600">Size Tier:</span>
                <span className="text-slate-900">{item.stapleLevel}</span>
                <span className="text-slate-600">Price:</span>
                <span className="text-slate-900">₹{item.price || 0}</span>
                <span className="text-slate-600">Weight:</span>
                <span className="text-slate-900">{item.weight || 0}g</span>
                <span className="text-slate-600">Dimensions:</span>
                <span className="text-slate-900">{item.dimensions || 'N/A'}</span>
              </div>
            </div>

            {item.categoryPath && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Category Path</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{item.categoryPath}</p>
              </div>
            )}
          </div>

          {/* Fee Breakdown */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-3">Fee Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Referral Fee:</span>
                  <span className="text-slate-900">₹{item.referralFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Closing Fee:</span>
                  <span className="text-slate-900">₹{item.closingFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Shipping Fee:</span>
                  <span className="text-slate-900">₹{item.shippingFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pick & Pack:</span>
                  <span className="text-slate-900">₹{item.pickAndPackFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Storage Fee:</span>
                  <span className="text-slate-900">₹{item.storageFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">GST (18%):</span>
                  <span className="text-slate-900">₹{item.tax || 0}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-900">Total Fees:</span>
                    <span className="text-slate-900">₹{item.totalFees || 0}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Return Processing Cost:</span>
                    <span className="text-slate-900">₹{item.returnFee || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Step Level</span>
                    <span>{item.stepLevel || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Return %</span>
                    <span>{item.returnPercent ?? 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-3">Profitability</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Original Net Profit:</span>
                  <span className="text-slate-900">₹{item.netRevenue || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Original Margin:</span>
                  <span className="text-slate-900">{item.marginPercent?.toFixed(2) || 0}%</span>
                </div>
                {item.returnPercent && item.returnPercent > 0 && (
                  <>
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Return %:</span>
                        <span className="text-slate-900">{item.returnPercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Adjusted Net Profit:</span>
                        <span className="text-slate-900">₹{item.adjustedNetRevenue || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Adjusted Margin:</span>
                        <span className="text-slate-900">{item.adjustedMarginPercent?.toFixed(2) || 0}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Return Percentage Modal ---
const ReturnPercentageModal = ({ item, isOpen, onClose, onSave }: {
  item: AsinItem | null,
  isOpen: boolean,
  onClose: () => void,
  onSave: (item: AsinItem, returnPercent: number, stepLevel: string) => void
}) => {
  const [returnPercent, setReturnPercent] = useState(0);
  const [stepLevel, setStepLevel] = useState('Standard');

  useEffect(() => {
    if (item) {
      setReturnPercent(item.returnPercent || 0);
      setStepLevel(item.stepLevel || 'Standard');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    onSave(item, returnPercent, stepLevel);
    onClose();
  };

  // Calculate return fee for preview
  const price = item.price || 0;
  const isApparelOrShoes = (item.category || '').toLowerCase().includes('apparel') ||
                          (item.category || '').toLowerCase().includes('shoes') ||
                          (item.category || '').toLowerCase().includes('clothing');
  
  // Simplified return fee calculation for preview (always available, regardless of return %)
  let returnFee = 0;
  if (price <= 300) {
    returnFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 30 : stepLevel === 'Standard' ? 27 : stepLevel === 'Advanced' ? 24 : 24)
                                : (stepLevel === 'Basic' ? 50 : stepLevel === 'Standard' ? 45 : stepLevel === 'Advanced' ? 40 : 40);
  } else if (price <= 500) {
    returnFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 45 : stepLevel === 'Standard' ? 42 : stepLevel === 'Advanced' ? 39 : 39)
                                : (stepLevel === 'Basic' ? 75 : stepLevel === 'Standard' ? 70 : stepLevel === 'Advanced' ? 65 : 65);
  } else if (price <= 1000) {
    returnFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 60 : stepLevel === 'Standard' ? 57 : stepLevel === 'Advanced' ? 51 : 51)
                                : (stepLevel === 'Basic' ? 100 : stepLevel === 'Standard' ? 95 : stepLevel === 'Advanced' ? 85 : 85);
  } else {
    returnFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 84 : stepLevel === 'Standard' ? 78 : stepLevel === 'Advanced' ? 66 : 66)
                                : (stepLevel === 'Basic' ? 140 : stepLevel === 'Standard' ? 130 : stepLevel === 'Advanced' ? 110 : 110);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Edit Return Percentage</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Return Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={returnPercent}
              onChange={(e) => setReturnPercent(Number(e.target.value))}
              className="w-full p-3 border border-slate-300 rounded-md text-sm"
              placeholder="Enter return percentage"
            />
            <p className="text-xs text-slate-500 mt-1">
              Percentage of products expected to be returned
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              STEP Level
            </label>
            <select
              value={stepLevel}
              onChange={(e) => setStepLevel(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md text-sm bg-white"
            >
              <option value="Basic">Basic</option>
              <option value="Standard">Standard</option>
              <option value="Advanced">Advanced</option>
              <option value="Premium">Premium</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Return processing level based on seller tier
            </p>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-slate-900 text-sm">Return Fee Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-600">Product Price:</span>
              <span className="text-slate-900">₹{price.toFixed(2)}</span>
              <span className="text-slate-600">Return %:</span>
              <span className="text-slate-900">{returnPercent}%</span>
              <span className="text-slate-600">STEP Level:</span>
              <span className="text-slate-900">{stepLevel}</span>
              <span className="text-slate-600">Return Fee:</span>
              <span className="text-slate-900">₹{returnFee.toFixed(2)}</span>
              {isApparelOrShoes && (
                <>
                  <span className="text-slate-600 text-orange-600">Category:</span>
                  <span className="text-orange-600 text-xs">Apparel/Shoes rates apply</span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [asins, setAsins] = useState<AsinItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize database first
        const { initializeDatabase } = await import('./services/db');
        await initializeDatabase();
        
        const u = db.getUser();
        if (u) setUser(u);
        if (u) {
          const a = await db.getAsins();
          setAsins(a);
        }
      } catch (error) {
        console.error('Failed to initialize application:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const refreshData = async () => {
    const a = await db.getAsins();
    setAsins(a);
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
  };

  const handleClearAsins = async () => {
    await db.clearAsins();
    setAsins([]);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-orange-600 animate-spin" /></div>;
  if (!user) return <LoginPage onLogin={() => setUser(db.getUser())} />;

  return (
    <Layout activePage={activePage} onNavigate={setActivePage} onLogout={handleLogout} userEmail={user.email}>
      {activePage === 'dashboard' && <Dashboard asins={asins} />}
      {activePage === 'fees' && <FeesPage />}
      {activePage === 'upload' && <UploadPage onUploadComplete={refreshData} onNavigate={setActivePage} />}
      {activePage === 'results' && <ResultsPage asins={asins} onRefresh={refreshData} onClear={handleClearAsins} />}
      {activePage === 'settings' && <UserSettings />}
    </Layout>
  );
};

export default App;
