import qrcode from "qrcode-generator";

export type EcLevel = "L" | "M" | "Q" | "H";

export interface Matrix {
  size: number;
  /** Row-major 0/1 matrix, length size * size */
  cells: Uint8Array;
}

export function makeMatrix(text: string, ec: EcLevel = "M"): Matrix {
  const qr = qrcode(0, ec);
  qr.addData(text, "Byte");
  qr.make();

  const size = qr.getModuleCount();
  const cells = new Uint8Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells[r * size + c] = qr.isDark(r, c) ? 1 : 0;
    }
  }
  return { size, cells };
}
