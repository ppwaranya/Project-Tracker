import React from 'react';
import { CostSummaryResult, Project } from '../lib/types';
import { baht } from '../lib/trackerLogic';
import { AlertTriangle, EyeOff, ShieldAlert } from 'lucide-react';

interface CostSummaryProps {
  project: Project;
  costSummary: CostSummaryResult;
  costPrivacy: boolean;
}

export const CostSummary: React.FC<CostSummaryProps> = ({
  project,
  costSummary,
  costPrivacy,
}) => {
  const { q, f, fp, fhas, pk, ot, subtotal, vat, plateTotal, platePerUnit, unit, batch, below } = costSummary;
  const total = unit || 0;

  const pct = (v: number) => (total > 0 ? Math.max(0, (v / total) * 100) : 0);

  if (costPrivacy) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-7 text-center space-y-3 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <EyeOff className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-slate-800 font-heading">
            ตัวเลขประมาณการต้นทุนถูกซ่อนไว้ (โหมดนำเสนอ)
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            กำลังเปิดระบบเพื่อปรึกษาหารือกับทีมอื่น ข้อมูลราคาวัตถุดิบ บรรจุภัณฑ์ และต้นทุนเฉลี่ยจึงถูกปิดบังเพื่อความปลอดภัย
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#ffc83b]/30 text-amber-950 border border-amber-300">
            คลิกปุ่ม "การแสดงต้นทุน" ที่แถบด้านบนเพื่อเปิดดูข้อมูล
          </span>
        </div>
      </div>
    );
  }

  const selectedPkgCount = project.packaging.filter((it) => it.selectedForCost !== false).length;

  return (
    <div className="space-y-4">
      {/* Warnings & Notices */}
      {!q && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <span>
            ยังไม่ได้ระบุจำนวนสั่งผลิตในส่วนภาพรวมโครงการ การคำนวณขั้นราคาจึงใช้ขั้นต่ำสุด และค่าบล็อก/ค่าขนส่งยังไม่สามารถเฉลี่ยเป็นต่อหน่วยได้
          </span>
        </div>
      )}

      {below.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>
            จำนวนการสั่งผลิตต่ำกว่าปริมาณสั่งผลิตขั้นต่ำ (MOQ) ของรายการ: <strong>{below.join(', ')}</strong>
          </span>
        </div>
      )}

      {/* Breakdown Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-xs sm:text-sm text-left">
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 text-slate-700 font-medium">
                Formula Cost ({f.ver})
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                {fhas ? `${baht(fp)} THB / pc` : <span className="text-slate-400 italic">Price not set</span>}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 text-slate-700 font-medium">
                Packaging & Components{' '}
                <span className="text-xs text-slate-400">
                  (Includes {selectedPkgCount} of {project.packaging.length} items
                  {plateTotal > 0 && q > 0 ? `, incl. mold/plate ${baht(platePerUnit)} THB/pc` : ''})
                </span>
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                {baht(pk)} THB / pc
              </td>
            </tr>

            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 text-slate-700 font-medium">
                Operating & Other Costs{' '}
                <span className="text-xs text-slate-400">({project.other.length} items)</span>
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                {baht(ot)} THB / pc
              </td>
            </tr>

            <tr className="bg-slate-50/90 font-medium text-slate-800">
              <td className="py-3 px-4">Subtotal (ก่อน VAT)</td>
              <td className="py-3 px-4 text-right tabular-nums font-bold">
                {baht(subtotal)} THB / pc
              </td>
            </tr>

            <tr className="bg-amber-50/70 font-medium text-amber-900">
              <td className="py-3 px-4">VAT 7% (เฉพาะรายการที่ยังไม่รวม VAT)</td>
              <td className="py-3 px-4 text-right tabular-nums font-bold">
                {baht(vat)} THB / pc
              </td>
            </tr>

            {/* Total Unit Cost */}
            <tr className="bg-emerald-50/80 border-t-2 border-emerald-500 font-bold text-slate-900">
              <td className="py-3.5 px-4 text-emerald-950 font-bold text-sm">Total Unit Cost (รวม VAT)</td>
              <td className="py-3.5 px-4 text-right text-base font-extrabold text-emerald-700 tabular-nums font-heading">
                {baht(unit)} THB
              </td>
            </tr>

            {/* Total Batch Cost */}
            <tr className="bg-slate-50/90 font-medium text-slate-800">
              <td className="py-3 px-4">
                Total Batch Cost (รวม VAT){' '}
                <span className="text-xs text-slate-500">
                  ({q ? `${Number(q).toLocaleString('en-US')} pcs` : 'Quantity not set'})
                </span>
              </td>
              <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                {q ? `${baht(batch)} THB` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual Stacked Bar Chart */}
      {total > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>สัดส่วนโครงสร้างต้นทุน (Cost Distribution)</span>
            <span className="text-teal-700">100% สัดส่วนรวม</span>
          </div>

          <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-100 gap-0.5">
            <div
              style={{ width: `${pct(fp)}%`, backgroundColor: '#0d9488' }}
              className="transition-all"
              title={`สูตร: ${baht(fp)} บาท (${pct(fp).toFixed(1)}%)`}
            />
            <div
              style={{ width: `${pct(pk)}%`, backgroundColor: '#8b5cf6' }}
              className="transition-all"
              title={`บรรจุภัณฑ์: ${baht(pk)} บาท (${pct(pk).toFixed(1)}%)`}
            />
            <div
              style={{ width: `${pct(ot)}%`, backgroundColor: '#f59e0b' }}
              className="transition-all"
              title={`ต้นทุนอื่น: ${baht(ot)} บาท (${pct(ot).toFixed(1)}%)`}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#0d9488' }} />
              <span>สูตรผลิตภัณฑ์: <strong>{pct(fp).toFixed(1)}%</strong> ({baht(fp)} บ.)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
              <span>บรรจุภัณฑ์: <strong>{pct(pk).toFixed(1)}%</strong> ({baht(pk)} บ.)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
              <span>ต้นทุนอื่น: <strong>{pct(ot).toFixed(1)}%</strong> ({baht(ot)} บ.)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
