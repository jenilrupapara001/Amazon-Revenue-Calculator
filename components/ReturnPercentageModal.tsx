import React, { useState, useEffect } from 'react';
import { AsinItem } from '../types';
import { Button } from './ui';
import { X } from 'lucide-react';

interface ReturnPercentageModalProps {
  item: AsinItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: AsinItem, returnPercent: number, stepLevel: string) => void;
}

export const ReturnPercentageModal: React.FC<ReturnPercentageModalProps> = ({ 
  item, 
  isOpen, 
  onClose, 
  onSave 
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
  
  let refundProcessingFee = 0;
  // Calculate return processing fee based on STEP level and price (no return percentage required)
  if (price <= 300) {
    refundProcessingFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 30 : stepLevel === 'Standard' ? 27 : stepLevel === 'Advanced' ? 24 : 24)
                                : (stepLevel === 'Basic' ? 50 : stepLevel === 'Standard' ? 45 : stepLevel === 'Advanced' ? 40 : 40);
  } else if (price <= 500) {
    refundProcessingFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 45 : stepLevel === 'Standard' ? 42 : stepLevel === 'Advanced' ? 39 : 39)
                                : (stepLevel === 'Basic' ? 75 : stepLevel === 'Standard' ? 70 : stepLevel === 'Advanced' ? 65 : 65);
  } else if (price <= 1000) {
    refundProcessingFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 60 : stepLevel === 'Standard' ? 57 : stepLevel === 'Advanced' ? 51 : 51)
                                : (stepLevel === 'Basic' ? 100 : stepLevel === 'Standard' ? 95 : stepLevel === 'Advanced' ? 85 : 85);
  } else {
    refundProcessingFee = isApparelOrShoes ? (stepLevel === 'Basic' ? 84 : stepLevel === 'Standard' ? 78 : stepLevel === 'Advanced' ? 66 : 66)
                                : (stepLevel === 'Basic' ? 140 : stepLevel === 'Standard' ? 130 : stepLevel === 'Advanced' ? 110 : 110);
  }

  const totalFees = item.totalFees || 0;
  const referralFee = item.referralFee || 0;
  const nonReferralFees = Math.max(0, totalFees - referralFee);
  const returnFee = Number((nonReferralFees + refundProcessingFee).toFixed(2));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Manage Return Settings</h2>
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
              Optional: Percentage of products expected to be returned (return fees calculate automatically)
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
            <h4 className="font-medium text-slate-900 text-sm">Return Fee (Calculated Automatically)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-600">Product Price:</span>
              <span className="text-slate-900">₹{price.toFixed(2)}</span>
              <span className="text-slate-600">STEP Level:</span>
              <span className="text-slate-900">{stepLevel}</span>
              <span className="text-slate-600">Return Fee:</span>
              <span className="text-slate-900 font-medium">₹{returnFee.toFixed(2)}</span>
              <span className="text-slate-600">Return % (Optional):</span>
              <span className="text-slate-900">{returnPercent}%</span>
              {isApparelOrShoes && (
                <>
                  <span className="text-slate-600 text-orange-600">Category:</span>
                  <span className="text-orange-600 text-xs">Apparel/Shoes rates apply</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-2 border-t pt-2">
              Return fees are calculated based on STEP level and price range, regardless of return percentage
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