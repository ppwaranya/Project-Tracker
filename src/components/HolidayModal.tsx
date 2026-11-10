import React, { useState } from 'react';
import { Holiday } from '../lib/types';
import { uid, todayISO } from '../lib/trackerLogic';
import { Calendar, Plus, Trash2, X } from 'lucide-react';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: Holiday[];
  onSaveHolidays: (holidays: Holiday[]) => void;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  holidays,
  onSaveHolidays,
}) => {
  const [list, setList] = useState<Holiday[]>(holidays);

  if (!isOpen) return null;

  const handleAdd = () => {
    setList([...list, { id: uid(), date: todayISO(), name: '' }]);
  };

  const handleUpdate = (id: string, field: 'date' | 'name', val: string) => {
    setList(
      list.map((h) => (h.id === id ? { ...h, [field]: val } : h))
    );
  };

  const handleDelete = (id: string) => {
    setList(list.filter((h) => h.id !== id));
  };

  const handleSave = () => {
    onSaveHolidays(list.filter((h) => h.date));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Company & Public Holidays (วันหยุดทำการ)
            </h3>
            <p className="text-xs text-slate-500">
              These dates are excluded when calculating working days in project timelines across all products.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {list.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400 italic">
              No holidays added. Click "+ Add Holiday" below.
            </p>
          ) : (
            list.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200"
              >
                <input
                  type="date"
                  value={h.date}
                  onChange={(e) => handleUpdate(h.id, 'date', e.target.value)}
                  className="w-36 text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={h.name}
                  placeholder="Holiday name (e.g. New Year's Day, Company Off)"
                  onChange={(e) => handleUpdate(h.id, 'name', e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white"
                />
                <button
                  onClick={() => handleDelete(h.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  title="Delete holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save Holidays
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
