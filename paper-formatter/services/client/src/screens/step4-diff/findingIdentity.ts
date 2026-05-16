export function toContractRuleId(categoryName: string, ruleLabel: string) {
  const normalizedRuleToken = `${categoryName}_${ruleLabel}`
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 48) || 'FORMAT_REVIEW';
  return `RULE-L2-${normalizedRuleToken}`;
}

export function toStableFindingId(identitySeed: string) {
  let fnvHash = 0x811c9dc5;
  for (let characterIndex = 0; characterIndex < identitySeed.length; characterIndex += 1) {
    fnvHash ^= identitySeed.charCodeAt(characterIndex);
    fnvHash = Math.imul(fnvHash, 0x01000193);
  }
  const hashHex = (fnvHash >>> 0).toString(16).padStart(8, '0');
  const uuidHex = `${hashHex}${hashHex.split('').reverse().join('')}${hashHex}${hashHex}`.slice(0, 32);
  return `${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-4${uuidHex.slice(13, 16)}-8${uuidHex.slice(17, 20)}-${uuidHex.slice(20, 32)}`;
}
