let isYakuModalOpen = false;
let isTermsModalOpen = false;

export function getUiState() {
  return { isYakuModalOpen, isTermsModalOpen };
}

export function setUiState(updates) {
  if (updates.isYakuModalOpen !== undefined) isYakuModalOpen = updates.isYakuModalOpen;
  if (updates.isTermsModalOpen !== undefined) isTermsModalOpen = updates.isTermsModalOpen;
}
