import React, { useState } from 'react';
import { CostSummaryResult, Project } from '../lib/types';
import {
  baht,
  calcOtherItemTotal,
  classifyOtherCostUnit,
  resolvePackagingPrice,
  VAT_RATE,
} from '../lib/trackerLogic';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  EyeOff,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react';

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
  const {
    q,
    unitsPerPack,
    fullPacks,
    remainderUnits,
    baseUnitName,
    packUnitName,
    f,
    fp,
    fhas,
    pk,
    ot,
    additionalCost,
    subtotal,
    vat,
    plateTotal,
    platePerUnit,
    unit,
    packCost,
    sellableBatchCost,
    remainderCost,
    batch,
    below,
  } = costSummary;

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isMultiPack = unitsPerPack > 1;
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

  const activePackaging = project.packaging.filter(
    (it) => it.selectedForCost !== false
  );
  const perUnitOthers = project.other.filter(
    (o) => classifyOtherCostUnit(o.unit, packUnitName) !== 'lumpsum'
  );
  const lumpSumOthers = project.other.filter(
    (o) => classifyOtherCostUnit(o.unit, packUnitName) === 'lumpsum'
  );

  return (
    <div className="space-y-4">
      {/* แถบสรุปสัดส่วนการบรรจุและเศษคงเหลือ (แสดงเมื่อมี 1 แพ็ก > 1 หน่วยย่อย) */}
      {isMultiPack && (
        <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs text-teal-950 space-y-0.5">
              <div className="font-bold">
                โครงสร้างการบรรจุ: 1 {packUnitName} บรรจุ {unitsPerPack.toLocaleString('en-US')} {baseUnitName}
              </div>
              {q > 0 && (
                <div className="text-teal-800">
                  ผลิตทั้งหมด <strong>{q.toLocaleString('en-US')} {baseUnitName}</strong>{' '}
                  → แพ็กขายได้จริง <strong>{fullPacks.toLocaleString('en-US')} {packUnitName}</strong>
                  {remainderUnits > 0 ? (
                    <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                      เหลือเศษ {remainderUnits.toLocaleString('en-US')} {baseUnitName} (สำหรับ QC / Sample)
                    </span>
                  ) : (
                    <span className="ml-1.5 text-emerald-700 font-semibold">(ลงตัวพอดี ไม่มีเศษ)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warnings & Notices */}
      {!q && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <span>
            ยังไม่ได้ระบุจำนวนสั่งผลิตในส่วนภาพรวมโครงการ การคำนวณขั้นราคาจึงใช้ขั้นต่ำสุด และค่าบล็อกยังไม่สามารถเฉลี่ยเป็นต่อหน่วยได้
          </span>
        </div>
      )}

      {below.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>
            จำนวนใช้งานจริงต่ำกว่าปริมาณสั่งผลิตขั้นต่ำ (MOQ) ของรายการ: <strong>{below.join(', ')}</strong>
          </span>
        </div>
      )}

      {/* Breakdown Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-xs sm:text-sm text-left">
          {isMultiPack && (
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
              <tr>
                <th className="py-2.5 px-4">รายการต้นทุน (Cost Component)</th>
                <th className="py-2.5 px-4 text-right">ต่อหน่วยย่อย (Per {baseUnitName})</th>
                <th className="py-2.5 px-4 text-right bg-teal-50/50 text-teal-900">
                  ต่อแพ็กขาย (Per {packUnitName} · {unitsPerPack} {baseUnitName})
                </th>
              </tr>
            </thead>
          )}

          <tbody className="divide-y divide-slate-100">
            {/* 1. Formula Cost */}
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 text-slate-700 font-medium">
                Formula Cost ({f.ver}
                {f.code ? ` · ${f.code}` : ''})
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                {fhas ? (
                  `${baht(fp)} THB`
                ) : (
                  <span className="text-slate-400 italic">Price not set</span>
                )}
              </td>
              {isMultiPack && (
                <td className="py-3 px-4 text-right font-bold text-teal-950 tabular-nums bg-teal-50/20">
                  {fhas ? `${baht(fp * unitsPerPack)} THB` : '-'}
                </td>
              )}
            </tr>

            {/* 2. Packaging & Components */}
            <tr
              onClick={() => activePackaging.length > 0 && toggleRow('packaging')}
              className={`transition-colors ${
                activePackaging.length > 0
                  ? 'hover:bg-purple-50/40 cursor-pointer select-none'
                  : ''
              }`}
            >
              <td className="py-3 px-4 text-slate-700 font-medium">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activePackaging.length > 0 && (
                    <span className="text-slate-400">
                      {expandedRows['packaging'] ? (
                        <ChevronDown className="w-4 h-4 text-purple-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span>Packaging & Components</span>
                  <span className="text-xs text-slate-400">
                    (Includes {activePackaging.length} of {project.packaging.length} items
                    {plateTotal > 0 && q > 0
                      ? `, incl. mold/plate ${baht(platePerUnit)} THB/${baseUnitName}`
                      : ''}
                    )
                  </span>
                  {activePackaging.length > 0 && (
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {expandedRows['packaging'] ? 'ซ่อนรายละเอียด' : 'คลิกดูรายการ'}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                {baht(pk)} THB
              </td>
              {isMultiPack && (
                <td className="py-3 px-4 text-right font-bold text-teal-950 tabular-nums bg-teal-50/20">
                  {baht(pk * unitsPerPack)} THB
                </td>
              )}
            </tr>

            {/* รายการย่อยของ Packaging */}
            {expandedRows['packaging'] && activePackaging.length > 0 && (
              <tr className="bg-slate-50/80">
                <td colSpan={isMultiPack ? 3 : 2} className="px-6 py-3">
                  <div className="space-y-2 border-l-2 border-purple-400 pl-3.5">
                    {activePackaging.map((pkg) => {
                      const basis =
                        pkg.costBasis ||
                        (pkg.type === 'Secondary Package' ? 'pack' : 'unit');
                      const basisQty = basis === 'pack' ? fullPacks : q;
                      const res = resolvePackagingPrice(pkg, basisQty);
                      const vatMult = pkg.vatIncluded ? 1 : 1 + VAT_RATE;
                      const rawUnitWithVat = res.price * vatMult;

                      const perBaseUnit =
                        basis === 'pack'
                          ? rawUnitWithVat / unitsPerPack
                          : rawUnitWithVat;
                      const perPack =
                        basis === 'pack'
                          ? rawUnitWithVat
                          : rawUnitWithVat * unitsPerPack;

                      const platePerBase =
                        q > 0 && pkg.plateCost
                          ? (Number(pkg.plateCost) / q) * vatMult
                          : 0;
                      const totalBase = perBaseUnit + platePerBase;
                      const totalPack = perPack + platePerBase * unitsPerPack;

                      const selectedStep =
                        res.selectedIdx !== null ? pkg.steps[res.selectedIdx] : null;

                      return (
                        <div
                          key={pkg.id}
                          className="flex items-center justify-between gap-3 text-xs py-1 border-b border-slate-200/60 last:border-b-0"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                              <span>{pkg.name || '(ไม่ระบุชื่อบรรจุภัณฑ์)'}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                {basis === 'pack'
                                  ? `คิดต่อ ${packUnitName}`
                                  : `คิดต่อ ${baseUnitName}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {selectedStep && selectedStep.qty
                                ? `ขั้นราคา ≥ ${Number(selectedStep.qty).toLocaleString('en-US')} ${
                                    basis === 'pack' ? packUnitName : baseUnitName
                                  } (${baht(rawUnitWithVat)} บ./${
                                    basis === 'pack' ? packUnitName : baseUnitName
                                  })`
                                : `ราคา ${baht(rawUnitWithVat)} บ./${
                                    basis === 'pack' ? packUnitName : baseUnitName
                                  }`}
                              {platePerBase > 0 &&
                                ` + ค่าบล็อกเฉลี่ย ${baht(platePerBase)} บ./${baseUnitName}`}
                            </div>
                          </div>
                          <div className="text-right tabular-nums whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {baht(totalBase)} THB / {baseUnitName}
                            </div>
                            {isMultiPack && (
                              <div className="text-[11px] font-semibold text-teal-800">
                                ({baht(totalPack)} THB / {packUnitName})
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            )}

            {/* 3. Operating & Other Costs */}
            <tr
              onClick={() => perUnitOthers.length > 0 && toggleRow('otherUnit')}
              className={`transition-colors ${
                perUnitOthers.length > 0
                  ? 'hover:bg-amber-50/40 cursor-pointer select-none'
                  : ''
              }`}
            >
              <td className="py-3 px-4 text-slate-700 font-medium">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {perUnitOthers.length > 0 && (
                    <span className="text-slate-400">
                      {expandedRows['otherUnit'] ? (
                        <ChevronDown className="w-4 h-4 text-amber-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span>Operating & Other Costs (ต่อหน่วย)</span>
                  <span className="text-xs text-slate-400">
                    ({perUnitOthers.length} items)
                  </span>
                  {perUnitOthers.length > 0 && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {expandedRows['otherUnit'] ? 'ซ่อนรายละเอียด' : 'คลิกดูรายการ'}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                {baht(ot)} THB
              </td>
              {isMultiPack && (
                <td className="py-3 px-4 text-right font-bold text-teal-950 tabular-nums bg-teal-50/20">
                  {baht(ot * unitsPerPack)} THB
                </td>
              )}
            </tr>

            {/* รายการย่อยของ Operating & Other Costs */}
            {expandedRows['otherUnit'] && perUnitOthers.length > 0 && (
              <tr className="bg-slate-50/80">
                <td colSpan={isMultiPack ? 3 : 2} className="px-6 py-3">
                  <div className="space-y-1.5 border-l-2 border-amber-400 pl-3.5">
                    {perUnitOthers.map((item) => {
                      const calc = calcOtherItemTotal(item, unitsPerPack, packUnitName);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 text-xs py-1 border-b border-slate-200/60 last:border-b-0"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              {item.name || '(ไม่ระบุชื่อค่าใช้จ่าย)'}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              ({baht(item.amount)} บ. ต่อ {calc.perQtyVal} {item.unit})
                            </span>
                          </div>
                          <div className="text-right tabular-nums whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {baht(calc.perBaseUnit)} THB / {baseUnitName}
                            </div>
                            {isMultiPack && (
                              <div className="text-[11px] font-semibold text-teal-800">
                                ({baht(calc.perPack)} THB / {packUnitName})
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            )}

            {/* Subtotal */}
            <tr className="bg-slate-50/90 font-medium text-slate-800">
              <td className="py-3 px-4">Subtotal (ก่อน VAT)</td>
              <td className="py-3 px-4 text-right tabular-nums font-bold">
                {baht(subtotal)} THB
              </td>
              {isMultiPack && (
                <td className="py-3 px-4 text-right tabular-nums font-bold text-teal-950 bg-teal-50/20">
                  {baht(subtotal * unitsPerPack)} THB
                </td>
              )}
            </tr>

            {/* VAT 7% */}
            <tr className="bg-amber-50/70 font-medium text-amber-900">
              <td className="py-3 px-4">VAT 7% (เฉพาะรายการต่อหน่วยที่ยังไม่รวม VAT)</td>
              <td className="py-3 px-4 text-right tabular-nums font-bold">
                {baht(vat)} THB
              </td>
              {isMultiPack && (
                <td className="py-3 px-4 text-right tabular-nums font-bold">
                  {baht(vat * unitsPerPack)} THB
                </td>
              )}
            </tr>

            {/* Total Unit Cost & Total Pack Cost */}
            <tr className="bg-emerald-50/80 border-t-2 border-emerald-500 font-bold text-slate-900">
              <td className="py-3.5 px-4 text-emerald-950 font-bold text-sm">
                Total Cost (รวม VAT)
              </td>
              <td className="py-3.5 px-4 text-right text-base font-extrabold text-emerald-700 tabular-nums font-heading">
                {baht(unit)} THB / {baseUnitName}
              </td>
              {isMultiPack && (
                <td className="py-3.5 px-4 text-right text-base font-extrabold text-teal-900 tabular-nums font-heading bg-teal-100/60">
                  {baht(packCost)} THB / {packUnitName}
                </td>
              )}
            </tr>

            {/* Additional Cost (ต่อครั้ง / ต่อรอบ) */}
            <tr
              onClick={() => lumpSumOthers.length > 0 && toggleRow('additional')}
              className={`bg-indigo-50/70 border-t border-indigo-200 font-bold text-indigo-950 transition-colors ${
                lumpSumOthers.length > 0
                  ? 'hover:bg-indigo-100/70 cursor-pointer select-none'
                  : ''
              }`}
            >
              <td colSpan={isMultiPack ? 2 : 1} className="py-3 px-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {lumpSumOthers.length > 0 && (
                    <span className="text-indigo-500">
                      {expandedRows['additional'] ? (
                        <ChevronDown className="w-4 h-4 text-indigo-700" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span>Additional Cost (ค่าใช้จ่ายต่อครั้ง / ต่อรอบ)</span>
                  <span className="text-xs font-normal text-indigo-700">
                    ({lumpSumOthers.length} items · รวม VAT แล้ว ไม่หารต่อชิ้น)
                  </span>
                  {lumpSumOthers.length > 0 && (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                      {expandedRows['additional'] ? 'ซ่อนรายละเอียด' : 'คลิกดูรายการ'}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right text-sm sm:text-base font-extrabold text-indigo-700 tabular-nums font-heading">
                {baht(additionalCost)} THB
              </td>
            </tr>

            {/* รายการย่อยของ Additional Cost */}
            {expandedRows['additional'] && lumpSumOthers.length > 0 && (
              <tr className="bg-indigo-50/30">
                <td colSpan={isMultiPack ? 3 : 2} className="px-6 py-3">
                  <div className="space-y-1.5 border-l-2 border-indigo-400 pl-3.5">
                    {lumpSumOthers.map((item) => {
                      const calc = calcOtherItemTotal(item, unitsPerPack, packUnitName);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 text-xs py-1 border-b border-indigo-100 last:border-b-0"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              {item.name || '(ไม่ระบุชื่อค่าใช้จ่าย)'}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              ({baht(item.amount)} บ. × {calc.perQtyVal} {item.unit})
                            </span>
                          </div>
                          <div className="font-bold text-indigo-700 tabular-nums whitespace-nowrap">
                            {baht(calc.value)} THB
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            )}

            {/* แยกยอดแพ็กขายเต็ม กับ เศษคงเหลือ (ถ้ามี) */}
            {isMultiPack && q > 0 && (
              <>
                <tr className="bg-slate-50/60 text-xs text-slate-700 border-t border-slate-200">
                  <td colSpan={2} className="py-2.5 px-4">
                    ต้นทุนแพ็กเต็มพร้อมขาย ({fullPacks.toLocaleString('en-US')} {packUnitName} × {baht(packCost)} บ.)
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-bold text-slate-800">
                    {baht(sellableBatchCost)} THB
                  </td>
                </tr>
                {remainderUnits > 0 && (
                  <tr className="bg-amber-50/40 text-xs text-amber-900">
                    <td colSpan={2} className="py-2.5 px-4">
                      มูลค่าเศษคงเหลือ ({remainderUnits.toLocaleString('en-US')} {baseUnitName} × {baht(unit)} บ. · สำหรับ QC / Sample)
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-amber-800">
                      {baht(remainderCost)} THB
                    </td>
                  </tr>
                )}
              </>
            )}

            {/* Total Batch Cost */}
            <tr className="bg-slate-100/90 font-medium text-slate-900 border-t border-slate-300">
              <td colSpan={isMultiPack ? 2 : 1} className="py-3 px-4 font-bold">
                Total Batch Cost (รวม VAT + Additional Cost){' '}
                <span className="text-xs font-normal text-slate-500">
                  ({q ? `${Number(q).toLocaleString('en-US')} ${baseUnitName}` : 'Quantity not set'})
                </span>
              </td>
              <td className="py-3 px-4 text-right tabular-nums font-extrabold text-slate-950 text-sm sm:text-base">
                {q || additionalCost > 0 ? `${baht(batch)} THB` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual Stacked Bar Chart */}
      {total > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>สัดส่วนโครงสร้างต้นทุนต่อหน่วย (Unit Cost Distribution)</span>
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
              title={`ต้นทุนอื่นต่อหน่วย: ${baht(ot)} บาท (${pct(ot).toFixed(1)}%)`}
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
              <span>ต้นทุนอื่นต่อหน่วย: <strong>{pct(ot).toFixed(1)}%</strong> ({baht(ot)} บ.)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};