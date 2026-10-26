// Đọc CSV và dựng tập dữ liệu (X, y). Không phụ thuộc Angular nên test được độc lập.

export interface CsvTable {
    headers: string[];
    rows: string[][];
    delimiter: string;
}

export type MissingStrategy = 'drop' | 'mean' | 'zero';

const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '?', '-', '--']);

/** Parser CSV (RFC 4180): ngoặc kép, dấu phân tách trong ô, xuống dòng trong ô, BOM. */
export function parseCsv(text: string): CsvTable {
    const src = text.replace(/^\uFEFF/, '');
    const firstLine = src.split(/\r?\n/, 1)[0] ?? '';

    // tự đoán dấu phân tách: , ; hoặc tab (hòa thì ưu tiên dấu phẩy)
    const delimiter = [',', ';', '\t']
        .map((d) => ({ d, n: firstLine.split(d).length }))
        .reduce((best, cur) => (cur.n > best.n ? cur : best)).d;

    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (inQuotes) {
            if (c === '"') {
                if (src[i + 1] === '"') { cell += '"'; i++; }
                else inQuotes = false;
            } else cell += c;
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === delimiter) {
            row.push(cell); cell = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && src[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            rows.push(row); row = [];
        } else cell += c;
    }
    if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }

    const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
    if (nonEmpty.length === 0) return { headers: [], rows: [], delimiter };

    const width = nonEmpty[0].length;
    const seen = new Map<string, number>();
    const headers = nonEmpty[0].map((h, i) => {
        const base = h.trim() || `cột ${i + 1}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return n === 1 ? base : `${base}_${n}`;
    });
    const body = nonEmpty.slice(1).map((r) => {
        const out = r.slice(0, width);
        while (out.length < width) out.push('');
        return out;
    });
    return { headers, rows: body, delimiter };
}

/** Chuyển ô thành số; ô rỗng / NA / chữ → NaN. Với dấu ; hoặc tab, "3,14" được hiểu là 3.14. */
export function toNumber(raw: string, decimalComma: boolean): number {
    let t = raw.trim();
    if (MISSING_TOKENS.has(t.toLowerCase())) return NaN;
    if (decimalComma && /^[-+]?\d+,\d+$/.test(t)) t = t.replace(',', '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
}

/** Cột được coi là số khi ≥ 80% ô không rỗng đọc được thành số. */
export function numericColumns(t: CsvTable): boolean[] {
    const decimalComma = t.delimiter !== ',';
    return t.headers.map((_, c) => {
        let filled = 0;
        let numeric = 0;
        for (const r of t.rows) {
            const raw = r[c].trim();
            if (MISSING_TOKENS.has(raw.toLowerCase())) continue;
            filled++;
            if (!Number.isNaN(toNumber(raw, decimalComma))) numeric++;
        }
        return filled > 0 && numeric / filled >= 0.8;
    });
}

/** Số ô rỗng / không đọc được trong các cột đã chọn. */
export function countMissing(t: CsvTable, cols: number[]): number {
    const decimalComma = t.delimiter !== ',';
    let n = 0;
    for (const r of t.rows) for (const c of cols) if (Number.isNaN(toNumber(r[c], decimalComma))) n++;
    return n;
}

export interface BuildOptions {
    xCols: number[];
    yCol: number;
    missing: MissingStrategy;
    standardize: boolean;
}

export interface BuildResult {
    provenance?: import('../models/training-step').DatasetProvenance;
    X: number[][];
    y: number[];
    total: number;
    used: number;
    droppedRows: number;
    filledCells: number;
    error?: string;
}

export const MIN_ROWS = 10;

export function buildDataset(t: CsvTable, o: BuildOptions): BuildResult {
    const fail = (error: string): BuildResult => ({
        X: [], y: [], total: t.rows.length, used: 0, droppedRows: 0, filledCells: 0, error,
    });
    if (o.xCols.length === 0) return fail('Hãy chọn ít nhất một cột đặc trưng (X).');
    if (o.yCol < 0 || o.xCols.includes(o.yCol)) return fail('Cột mục tiêu (Y) phải khác các cột X.');

    const decimalComma = t.delimiter !== ',';
    const k = o.xCols.length;

    // 1) đọc số; dòng thiếu Y luôn bị bỏ (không thể điền biến mục tiêu)
    let X: number[][] = [];
    let y: number[] = [];
    let dropped = 0;
    let sources: number[] = [];
    for (const [index, r] of t.rows.entries()) {
        const yv = toNumber(r[o.yCol], decimalComma);
        if (Number.isNaN(yv)) { dropped++; continue; }
        X.push(o.xCols.map((c) => toNumber(r[c], decimalComma)));
        y.push(yv);
        sources.push(index);
    }

    // 2) xử lý ô thiếu ở các cột X
    let filled = 0;
    if (o.missing === 'drop') {
        const keepX: number[][] = [];
        const keepY: number[] = [];
        const keepSources: number[] = [];
        X.forEach((row, i) => {
            if (row.some((v) => Number.isNaN(v))) dropped++;
            else { keepX.push(row); keepY.push(y[i]); keepSources.push(sources[i]); }
        });
        X = keepX;
        y = keepY;
        sources = keepSources;
    } else {
        const fill = o.xCols.map((_, j) => {
            if (o.missing === 'zero') return 0;
            let sum = 0;
            let n = 0;
            for (const row of X) if (!Number.isNaN(row[j])) { sum += row[j]; n++; }
            return n ? sum / n : 0;
        });
        for (const row of X) {
            for (let j = 0; j < k; j++) {
                if (Number.isNaN(row[j])) { row[j] = fill[j]; filled++; }
            }
        }
    }

    if (X.length < MIN_ROWS) {
        return { ...fail(`Chỉ còn ${X.length} dòng hợp lệ, cần ít nhất ${MIN_ROWS}.`), droppedRows: dropped, filledCells: filled };
    }

    const provenance: import('../models/training-step').DatasetProvenance = {
        labels: o.xCols.map(c => t.headers[c]), target: t.headers[o.yCol], standardized: o.standardize, stats: [],
        rows: sources.map((index, i) => ({ sourceRow: index + 2,
            original: [...o.xCols, o.yCol].map(c => t.rows[index][c]), filled: [...X[i], y[i]] })),
    };
    // 3) Giữ nguyên tiền xử lý trước khi chia train/test; xem docs/learning-walkthrough.md.
    if (o.standardize) {
        const z = (vals: number[]) => {
            const m = vals.reduce((a, b) => a + b, 0) / vals.length;
            const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length) || 1;
            provenance.stats.push({ mean: m, sd });
            return vals.map((v) => (v - m) / sd);
        };
        for (let j = 0; j < k; j++) {
            const col = z(X.map((r) => r[j]));
            X.forEach((r, i) => (r[j] = col[i]));
        }
        y = z(y);
    }

    return { X, y, total: t.rows.length, used: X.length, droppedRows: dropped, filledCells: filled, provenance };
}
