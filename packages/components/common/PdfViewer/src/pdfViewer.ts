export interface PdfViewerProps {
  src: string;
  initialPage?: number;
  scale?: number;
  minScale?: number;
  maxScale?: number;
}

export interface PdfViewerEmits {
  (e: 'loaded', numPages: number): void;
  (e: 'error', error: Error): void;
  (e: 'rendered'): void;
  (e: 'page-change', page: number): void;
}
