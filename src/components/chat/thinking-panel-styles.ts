export function getThinkingWrapperClass(expanded: boolean): string {
  return expanded
    ? 'overflow-hidden transition-all duration-300 ease-out max-h-[70vh] opacity-100 mt-3'
    : 'overflow-hidden transition-all duration-300 ease-out max-h-0 opacity-0 mt-0'
}

export function getThinkingPanelClass(): string {
  return 'rounded-xl bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155] shadow-lg'
}

export function getThinkingBodyClass(): string {
  return 'max-h-[60vh] overflow-y-auto px-4 pb-4'
}
