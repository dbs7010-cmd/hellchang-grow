/** 한글 조사 붙이기. */
function hasFinalConsonant(word:string):boolean|null{const last=word.charCodeAt(word.length-1);const isHangulSyllable=last>=0xac00&&last<=0xd7a3;if(!isHangulSyllable)return null;return(last-0xac00)%28!==0;}
function attach(word:string,withBatchim:string,withoutBatchim:string):string{const batchim=hasFinalConsonant(word);return`${word}${batchim===false?withoutBatchim:withBatchim}`;}
export function withObjectParticle(word:string):string{return attach(word,'을','를');}
export function withTopicParticle(word:string):string{return attach(word,'은','는');}
export function withSubjectParticle(word:string):string{return attach(word,'이','가');}
/** 도구격 조사. ㄹ 받침은 '로'를 쓴다. */
export function withInstrumentalParticle(word:string):string{const last=word.charCodeAt(word.length-1);const isHangulSyllable=last>=0xac00&&last<=0xd7a3;if(!isHangulSyllable)return`${word}로`;const finalConsonant=(last-0xac00)%28;return`${word}${finalConsonant===0||finalConsonant===8?'로':'으로'}`;}
