let isYakuModalOpen = false;
let isTermsModalOpen = false;
let isMusicMuted = false;

export function getUiState() {
  return { isYakuModalOpen, isTermsModalOpen, isMusicMuted };
}

export function setUiState(updates) {
  if (updates.isYakuModalOpen !== undefined) isYakuModalOpen = updates.isYakuModalOpen;
  if (updates.isTermsModalOpen !== undefined) isTermsModalOpen = updates.isTermsModalOpen;
  if (updates.isMusicMuted !== undefined) isMusicMuted = updates.isMusicMuted;
}
