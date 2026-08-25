/**
 * 한글 조사 붙이기.
 *
 * 조사는 **앞 글자의 받침에 따라 달라진다.** 문자열에 `${이름}를`처럼 박아 두면 "등를",
 * "풀업는", "풀업가"처럼 어색한 문장이 사용자에게 그대로 나간다 — 운동 이름과 부위 이름은
 * 둘 다 받침이 있는 것과 없는 것이 섞여 있어서 한쪽으로 고정할 수 없다.
 *
 * 한글이 아닌 글자로 끝나면(영문/숫자) 받침을 알 수 없으므로, 소리 내어 읽었을 때 무난한
 * 쪽으로 둔다.
 */

function hasFinalConsonant(word: string): boolean | null {
  const last = word.charCodeAt(word.length - 1);
  const isHangulSyllable = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangulSyllable) return null;
  return (last - 0xac00) % 28 !== 0;
}

function attach(word: string, withBatchim: string, withoutBatchim: string): string {
  const batchim = hasFinalConsonant(word);
  return `${word}${batchim === false ? withoutBatchim : withBatchim}`;
}

/** 목적격 조사: 등**을** / 하체**를** */
export function withObjectParticle(word: string): string {
  return attach(word, '을', '를');
}

/** 보조사: 풀업**은** / 벤치프레스**는** */
export function withTopicParticle(word: string): string {
  return attach(word, '은', '는');
}

/** 주격 조사: 풀업**이** / 벤치프레스**가** */
export function withSubjectParticle(word: string): string {
  return attach(word, '이', '가');
}

/**
 * 도구격 조사: 풀업**으로** / 벤치프레스**로** / 데드리프트**로**.
 *
 * 받침 ㄹ은 예외다 — "케이블로"가 맞고 "케이블으로"는 틀리다. 다른 조사와 달리 받침 유무만
 * 봐서는 안 되므로 여기서만 종성을 직접 본다.
 */
export function withInstrumentalParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangulSyllable = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangulSyllable) return `${word}로`;

  const finalConsonant = (last - 0xac00) % 28;
  const isRieul = finalConsonant === 8;
  return `${word}${finalConsonant === 0 || isRieul ? '로' : '으로'}`;
}
