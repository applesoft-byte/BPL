/**
 * Cryptographically secure random integer generator between 0 and length - 1.
 */
export const getCryptoRandomIndex = (length: number): number => {
  if (length <= 1) return 0;
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % length;
};
