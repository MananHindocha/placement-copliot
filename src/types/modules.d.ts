declare module 'unpdf' {
  export function extractText(
    data: ArrayBuffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<{ text: string; totalPages: number }>;
}

declare module 'mammoth' {
  export function extractRawText(
    options: { buffer: Buffer }
  ): Promise<{ value: string; messages: unknown[] }>;
}

