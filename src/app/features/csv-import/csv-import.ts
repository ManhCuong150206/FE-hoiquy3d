import { Component, computed, inject, signal } from '@angular/core';
import {
    CsvTable, MissingStrategy, buildDataset, countMissing, numericColumns, parseCsv,
} from '../../core/engine/csv';
import { LabStore } from '../../state/lab-store';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

@Component({
    selector: 'app-csv-import',
    templateUrl: './csv-import.html',
    styleUrl: './csv-import.css',
})
export class CsvImport {
    store = inject(LabStore);

    table = signal<CsvTable | null>(null);
    fileName = signal('');
    yCol = signal(-1);
    xCols = signal<number[]>([]);
    missing = signal<MissingStrategy>('drop');
    standardize = signal(true);
    message = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

    numeric = computed(() => {
        const t = this.table();
        return t ? numericColumns(t) : [];
    });

    preview = computed(() => this.table()?.rows.slice(0, 6) ?? []);

    delimiterName = computed(() => {
        const d = this.table()?.delimiter;
        return d === ';' ? 'dấu chấm phẩy' : d === '\t' ? 'tab' : 'dấu phẩy';
    });

    missingCount = computed(() => {
        const t = this.table();
        if (!t || this.yCol() < 0) return 0;
        return countMissing(t, [...this.xCols(), this.yCol()]);
    });

    async onFile(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_BYTES) {
            this.fail('Tệp quá lớn (tối đa 20 MB).');
            input.value = '';
            return;
        }

        let table: CsvTable;
        try {
            table = parseCsv(await file.text());
        } catch {
            this.fail('Không đọc được tệp này.');
            input.value = '';
            return;
        }
        input.value = ''; // cho phép chọn lại đúng tệp đó lần sau

        if (table.headers.length < 2 || table.rows.length === 0) {
            this.fail('Tệp cần có dòng tiêu đề, ít nhất 2 cột và 1 dòng dữ liệu.');
            return;
        }
        const numIdx = numericColumns(table).flatMap((ok, i) => (ok ? [i] : []));
        if (numIdx.length < 2) {
            this.fail('Cần ít nhất 2 cột số (1 cho Y, 1 cho X).');
            return;
        }

        this.table.set(table);
        this.fileName.set(file.name);
        this.yCol.set(numIdx[numIdx.length - 1]); // mặc định: cột số cuối là Y
        this.xCols.set(numIdx.slice(0, -1));
        this.message.set(null);
    }

    onY(e: Event) {
        const i = +(e.target as HTMLSelectElement).value;
        this.yCol.set(i);
        this.xCols.update((x) => x.filter((c) => c !== i));
    }

    onX(i: number, e: Event) {
        const on = (e.target as HTMLInputElement).checked;
        this.xCols.update((x) =>
            on ? [...x.filter((c) => c !== i), i].sort((a, b) => a - b) : x.filter((c) => c !== i),
        );
    }

    onMissing(e: Event) {
        this.missing.set((e.target as HTMLSelectElement).value as MissingStrategy);
    }

    onStandardize(e: Event) {
        this.standardize.set((e.target as HTMLInputElement).checked);
    }

    apply() {
        const t = this.table();
        if (!t) return;
        const res = buildDataset(t, {
            xCols: this.xCols(),
            yCol: this.yCol(),
            missing: this.missing(),
            standardize: this.standardize(),
        });
        if (res.error) {
            this.fail(res.error);
            return;
        }
        this.store.loadDataset(res.X, res.y, this.fileName());

        const parts = [`Đã nạp ${res.used}/${res.total} mẫu`];
        if (res.droppedRows) parts.push(`bỏ ${res.droppedRows} dòng`);
        if (res.filledCells) parts.push(`điền ${res.filledCells} ô`);
        let text = parts.join(', ') + '.';
        if (this.xCols().length > 2) text += ' Không gian 3D chỉ vẽ 2 đặc trưng đầu tiên.';
        this.message.set({ kind: 'ok', text });
    }

    private fail(text: string) {
        this.message.set({ kind: 'error', text });
    }
}