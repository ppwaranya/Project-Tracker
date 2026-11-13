import React from 'react';
import { PnLLineItem, Project, ProjectPnL } from '../lib/types';
import { baht, uid } from '../lib/trackerLogic';
import { EyeOff, Plus, TrendingUp, Calculator } from 'lucide-react';

interface PnLTabProps {
  project: Project;
  totalCogs: number;
  costPrivacy: boolean;
  isEditing: boolean;
  panelActions: React.ReactNode;
  isCollapsed: boolean;
  onChangePnL: (nextPnL: ProjectPnL) => void;
}

const DEFAULT_PNL: ProjectPnL = {
  grossSale: '',
  distributionFee: '',
  atlItems: [],
  btlItems: [],
  otherMktItems: [],
  fixedCostItems: [],
  otherExpenseItems: [],
};

export const PnLTab: React.FC<PnLTabProps> = ({
  project,
  totalCogs,
  costPrivacy,
  isEditing,
  panelActions,
  isCollapsed,
  onChangePnL,
}) => {
  const pnl: ProjectPnL = {
    ...DEFAULT_PNL,
    ...(project.pnl || {}),
    atlItems: project.pnl?.atlItems || [],
    btlItems: project.pnl?.btlItems || [],
    otherMktItems: project.pnl?.otherMktItems || [],
    fixedCostItems: project.pnl?.fixedCostItems || [],
    otherExpenseItems: project.pnl?.otherExpenseItems || [],
  };

  const sumItems = (items: PnLLineItem[]) =>
    items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // 1. Gross Sale / Revenue
  const grossSaleNum = Number(pnl.grossSale) || 0;
  // 2. Distribution Fee / Platform Fee
  const distFeeNum = Number(pnl.distributionFee) || 0;
  // 3. Net Sale = ข้อ 1 - ข้อ 2
  const netSale = grossSaleNum - distFeeNum;
  // 4. COGS = Total Batch Cost
  const cogs = Number(totalCogs) || 0;
  // 5. Net A&P (MKT Cost) = ATL + BTL + Other Marketing Expenses
  const atlTotal = sumItems(pnl.atlItems);
  const btlTotal = sumItems(pnl.btlItems);
  const otherMktTotal = sumItems(pnl.otherMktItems);
  const netApTotal = atlTotal + btlTotal + otherMktTotal;
  // 6. Fixed Cost & Administrative Expenses
  const fixedCostTotal = sumItems(pnl.fixedCostItems);
  // 7. Other Expense
  const otherExpenseTotal = sumItems(pnl.otherExpenseItems);
  // 8. Net Contribution = ข้อ 3 - (ข้อ 4 + ข้อ 5 + ข้อ 6 + ข้อ 7)
  const netContribution =
    netSale - (cogs + netApTotal + fixedCostTotal + otherExpenseTotal);

  const netMarginPct =
    netSale > 0 ? ((netContribution / netSale) * 100).toFixed(2) : '0.00';

  type ListField =
    | 'atlItems'
    | 'btlItems'
    | 'otherMktItems'
    | 'fixedCostItems'
    | 'otherExpenseItems';

  const handleAddRow = (field: ListField) => {
    const newItem: PnLLineItem = {
      id: uid(),
      description: '',
      amount: '',
    };
    onChangePnL({
      ...pnl,
      [field]: [...pnl[field], newItem],
    });
  };

  const handleUpdateRow = (
    field: ListField,
    id: string,
    key: 'description' | 'amount',
    value: string
  ) => {
    onChangePnL({
      ...pnl,
      [field]: pnl[field].map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      ),
    });
  };

  const handleDeleteRow = (field: ListField, id: string) => {
    onChangePnL({
      ...pnl,
      [field]: pnl[field].filter((item) => item.id !== id),
    });
  };

  const renderSubTable = (
    title: string,
    field: ListField,
    subtotal: number,
    badgeColor = 'bg-slate-100 text-slate-700'
  ) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800">{title}</span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
            {costPrivacy ? '••••••' : `${baht(subtotal)} ฿`}
          </span>
        </div>

        <button
          type="button"
          disabled={!isEditing}
          onClick={() => handleAddRow(field)}
          className="flex items-center gap-1 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] disabled:opacity-40 px-3 py-1 rounded-xl transition-colors cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3 w-48 text-right">Amount (THB)</th>
              <th className="py-2 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pnl[field].length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No items recorded. Click "+ Add" above.
                </td>
              </tr>
            ) : (
              pnl[field].map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="p-2 pl-3">
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={row.description}
                      onChange={(e) =>
                        handleUpdateRow(field, row.id, 'description', e.target.value)
                      }
                      placeholder=""
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium disabled:bg-slate-50 disabled:text-slate-700"
                    />
                  </td>
                  <td className="p-2">
                    {costPrivacy ? (
                      <input
                        type="text"
                        disabled
                        value="••••••"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-right text-slate-400 font-mono"
                      />
                    ) : (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={!isEditing}
                        value={row.amount}
                        onChange={(e) =>
                          handleUpdateRow(field, row.id, 'amount', e.target.value)
                        }
                        placeholder=""
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-right font-bold tabular-nums disabled:bg-slate-50 disabled:text-slate-800"
                      />
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(field, row.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 text-base leading-none cursor-pointer"
                        title="Delete"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Profit & Loss Statement (P&L)
            </h3>
            {costPrivacy && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" />
                <span>Presentation Mode Active</span>
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">{panelActions}</div>
        </div>

        <div hidden={isCollapsed} className="space-y-5">
          {/* Top KPI Summary Cards for P&L */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                1. Gross Sale / Revenue
              </span>
              <b className="text-lg font-black text-slate-900 tabular-nums">
                {costPrivacy ? '••••••' : `${baht(grossSaleNum)} ฿`}
              </b>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 block mb-1">
                3. Net Sale (1 - 2)
              </span>
              <b className="text-lg font-black text-blue-950 tabular-nums">
                {costPrivacy ? '••••••' : `${baht(netSale)} ฿`}
              </b>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 block mb-1">
                4. COGS (Total Batch Cost)
              </span>
              <b className="text-lg font-black text-amber-950 tabular-nums">
                {costPrivacy ? '••••••' : `${baht(cogs)} ฿`}
              </b>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                netContribution >= 0
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-rose-50 border-rose-300'
              }`}
            >
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider block mb-1 ${
                  netContribution >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                8. Net Contribution
              </span>
              <b
                className={`text-lg font-black tabular-nums ${
                  netContribution >= 0 ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {costPrivacy ? '••••••' : `${baht(netContribution)} ฿`}
              </b>
              {!costPrivacy && netSale > 0 && (
                <span
                  className={`block text-[11px] font-bold mt-0.5 ${
                    netContribution >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  Net Margin: {netMarginPct}%
                </span>
              )}
            </div>
          </div>

          {/* 1 - 4: Revenue & Direct COGS */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-4">P&L Line Item / Description</th>
                  <th className="py-3 px-4 w-56 text-right">Amount (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Gross Sale / Revenue */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    1. Gross Sale / Revenue
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {costPrivacy ? (
                      <span className="font-mono text-slate-400">••••••</span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={!isEditing}
                        value={pnl.grossSale}
                        onChange={(e) =>
                          onChangePnL({ ...pnl, grossSale: e.target.value })
                        }
                        placeholder=""
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-right font-extrabold text-slate-900 tabular-nums disabled:bg-slate-50"
                      />
                    )}
                  </td>
                </tr>

                {/* 2. Distribution Fee / Platform Fee */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    2. Distribution Fee / Platform Fee
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {costPrivacy ? (
                      <span className="font-mono text-slate-400">••••••</span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={!isEditing}
                        value={pnl.distributionFee}
                        onChange={(e) =>
                          onChangePnL({ ...pnl, distributionFee: e.target.value })
                        }
                        placeholder=""
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-right font-extrabold text-slate-900 tabular-nums disabled:bg-slate-50"
                      />
                    )}
                  </td>
                </tr>

                {/* 3. Net Sale */}
                <tr className="bg-blue-50/60 font-extrabold text-blue-950">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <span>3. Net Sale (ข้อ 1 - ข้อ 2)</span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-base">
                    {costPrivacy ? '••••••' : `${baht(netSale)} ฿`}
                  </td>
                </tr>

                {/* 4. COGS */}
                <tr className="bg-amber-50/50 font-bold text-amber-950">
                  <td className="py-3 px-4">
                    <span>4. COGS</span>
                    <span className="block text-[11px] font-medium text-amber-800/80">
                      ดึงยอดอัตโนมัติจาก Total Batch Cost
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-extrabold">
                    {costPrivacy ? '••••••' : `${baht(cogs)} ฿`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Net A&P (MKT Cost) */}
          <div className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  5. Net A&P (MKT Cost)
                </h4>
                <p className="text-xs text-slate-500">
                  รวมค่าใช้จ่ายการตลาดจาก ATL, BTL และ Other Marketing Expenses
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 block">
                  Total Net A&P
                </span>
                <b className="text-base font-black text-indigo-900 tabular-nums">
                  {costPrivacy ? '••••••' : `${baht(netApTotal)} ฿`}
                </b>
              </div>
            </div>

            <div className="space-y-4">
              {renderSubTable(
                '5.1 ATL (Above The Line)',
                'atlItems',
                atlTotal,
                'bg-indigo-100 text-indigo-900'
              )}
              {renderSubTable(
                '5.2 BTL (Below The Line)',
                'btlItems',
                btlTotal,
                'bg-indigo-100 text-indigo-900'
              )}
              {renderSubTable(
                '5.3 Other Marketing Expenses',
                'otherMktItems',
                otherMktTotal,
                'bg-indigo-100 text-indigo-900'
              )}
            </div>
          </div>

          {/* 6. Fixed Cost & Administrative Expenses */}
          <div className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-extrabold text-slate-900">
                6. Fixed Cost & Administrative Expenses
              </h4>
              <b className="text-sm font-black text-slate-900 tabular-nums">
                {costPrivacy ? '••••••' : `${baht(fixedCostTotal)} ฿`}
              </b>
            </div>
            {renderSubTable(
              'รายการ Fixed Cost & Administrative Expenses',
              'fixedCostItems',
              fixedCostTotal
            )}
          </div>

          {/* 7. Other Expense */}
          <div className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-extrabold text-slate-900">
                7. Other Expense
              </h4>
              <b className="text-sm font-black text-slate-900 tabular-nums">
                {costPrivacy ? '••••••' : `${baht(otherExpenseTotal)} ฿`}
              </b>
            </div>
            {renderSubTable(
              'รายการ Other Expense',
              'otherExpenseItems',
              otherExpenseTotal
            )}
          </div>

          {/* 8. Net Contribution Summary Footer */}
          <div
            className={`p-5 rounded-2xl border-2 flex items-center justify-between flex-wrap gap-4 ${
              netContribution >= 0
                ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                : 'bg-rose-50/90 border-rose-400 text-rose-950'
            }`}
          >
            <div>
              <h4 className="text-base font-black">
                8. Net Contribution
              </h4>
              <p className="text-xs font-semibold opacity-80">
                คำนวณอัตโนมัติ: Net Sale (ข้อ 3) − COGS (ข้อ 4) − Net A&P (ข้อ 5) − Fixed Cost (ข้อ 6) − Other Expense (ข้อ 7)
              </p>
            </div>

            <div className="text-right">
              <b className="text-2xl font-black tabular-nums block">
                {costPrivacy ? '••••••' : `${baht(netContribution)} ฿`}
              </b>
              {!costPrivacy && netSale > 0 && (
                <span className="text-xs font-extrabold">
                  Net Margin: {netMarginPct}% of Net Sale
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};