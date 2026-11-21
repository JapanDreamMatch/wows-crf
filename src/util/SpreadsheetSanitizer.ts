/**
 * Google SpreadSheet のフォーミュラインジェクション対策および安全なセル読み書きヘルパー
 */

const FORMULA_TRIGGER_CHARS = new Set(["=", "\t", "\r", "\n", "\0"]);

/**
 * 文字列の先頭（トリム前またはトリム後）が数式開始文字 "=" や制御文字であるかを判定する。
 * ContactInput で正当に利用される "@" や "-" / "+" は Google Sheets 側で RAW / stringValue として
 * 書き込むことで無害化するため、ここでは "=" と危険な制御文字を拒否対象とする。
 */
export function hasLeadingFormulaTrigger(value: string): boolean {
    if (!value) {
        return false;
    }
    if (FORMULA_TRIGGER_CHARS.has(value[0])) {
        return true;
    }
    // 先頭スペース・制御文字を挟んだ "=..." や途中の改行＋数式も拒否
    const trimmed = value.trimStart();
    if (trimmed.length > 0 && trimmed[0] === "=") {
        return true;
    }
    return /[\r\n\0]/.test(value);
}

/**
 * 入力文字列がスプレッドシートへ安全に保存可能かを検証する（エラー時はメッセージ、正常時は null）。
 */
export function validateSafeSheetText(value: string, fieldLabel: string): string | null {
    if (hasLeadingFormulaTrigger(value)) {
        return `${fieldLabel}の先頭に「=」や改行・制御文字は使用できません`;
    }
    return null;
}

/**
 * セル書き込み直前の最終防衛線。不安全な先頭文字を検出した場合は例外を送出する。
 */
export function assertSafeSheetCellString(value: string): string {
    if (hasLeadingFormulaTrigger(value)) {
        throw new Error("Unsafe spreadsheet cell value rejected");
    }
    return value;
}

export interface StringWritableCell {
    stringValue: string | undefined;
}

/**
 * google-spreadsheet の cell.value セッター（"=" 始まりで自動 formulaValue 化）を使わず、
 * 必ず userEnteredValue.stringValue として安全に文字列を設定する。
 */
export function setCellStringSafe(cell: StringWritableCell, value: string): void {
    cell.stringValue = assertSafeSheetCellString(value);
}
