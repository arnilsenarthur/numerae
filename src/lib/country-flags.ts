/** Flag images via https://flagcdn.com (ISO 3166-1 alpha-2, no API key). */
const FLAG_CDN = "https://flagcdn.com";

export type CountryFlagSize = 20 | 24 | 32 | 40 | 48 | 64 | 80;

export function getCountryFlagUrl(code: string, size: CountryFlagSize = 40) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(normalized)) return undefined;
  return `${FLAG_CDN}/w${size}/${normalized}.png`;
}

export function getCountryFlagSrcSet(code: string) {
  const url = getCountryFlagUrl(code, 40);
  if (!url) return undefined;
  return `${url} 1x, ${getCountryFlagUrl(code, 80)} 2x`;
}
