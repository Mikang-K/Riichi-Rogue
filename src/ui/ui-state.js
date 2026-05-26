let isYakuModalOpen = false;
let isTermsModalOpen = false;
let isMusicMuted = false;
let isScoreDetailOpen = false;
let yakuHelpPage = "standard";

export function getUiState() {
  return { isYakuModalOpen, isTermsModalOpen, isMusicMuted, isScoreDetailOpen, yakuHelpPage };
}

export function setUiState(updates) {
  if (updates.isYakuModalOpen !== undefined) isYakuModalOpen = updates.isYakuModalOpen;
  if (updates.isTermsModalOpen !== undefined) isTermsModalOpen = updates.isTermsModalOpen;
  if (updates.isMusicMuted !== undefined) isMusicMuted = updates.isMusicMuted;
  if (updates.isScoreDetailOpen !== undefined) isScoreDetailOpen = updates.isScoreDetailOpen;
  if (updates.yakuHelpPage !== undefined) yakuHelpPage = updates.yakuHelpPage;
}
