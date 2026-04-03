// 부적절한 단어 목록
const BLOCKED_WORDS = [
  // 욕설
  '씨발', '시발', '씨바', 'ㅅㅂ', '개새', '개세', '병신', 'ㅂㅅ', '지랄', '존나',
  '좆', 'ㅈㄴ', '느금', '니미', '니애미', '엿먹', '꺼져', '썅', '쌍년', '쌍놈',
  '창녀', '보지', '자지', '보짓', '자짓', '섹스', '섹쑤', 'sex', 'fuck', 'shit',
  'bitch', 'asshole', 'bastard',

  // 혐오/차별
  '홍어', '틀딱', '맘충', '한남', '김치녀', '된장녀', '급식충', '노인충',

  // 종교 포교 관련
  '예수', '하나님', '알라', '부처', '여호와', '구원', '천국', '지옥가', '전도',
  '선교', '교회나와', '성경', '코란',

  // 광고/홍보 관련
  '카톡', '카카오', '텔레그램', '오픈채팅', '구매', '판매', '할인', '무료',
  '이벤트', '홍보', '광고', '업체', '서비스', '문의',

  // 성적 표현
  '야동', '야사', '원나잇', '원나이트', '조건', '만남조건', '성인',
];

// 연속 같은 문자 (도배 방지)
const REPEAT_PATTERN = /(.)\1{3,}/;

// 숫자/특수문자만으로 된 닉네임 방지
const ONLY_NUMBERS = /^[0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;

export type FilterResult =
  | { ok: true }
  | { ok: false; reason: string };

export function filterNickname(nickname: string): FilterResult {
  const trimmed = nickname.trim();

  if (trimmed.length < 2) {
    return { ok: false, reason: '닉네임은 2자 이상이어야 합니다' };
  }

  if (trimmed.length > 10) {
    return { ok: false, reason: '닉네임은 10자 이하여야 합니다' };
  }

  if (ONLY_NUMBERS.test(trimmed)) {
    return { ok: false, reason: '닉네임에 글자를 포함해주세요' };
  }

  if (REPEAT_PATTERN.test(trimmed)) {
    return { ok: false, reason: '같은 글자를 너무 많이 반복할 수 없습니다' };
  }

  const lower = trimmed.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { ok: false, reason: '사용할 수 없는 단어가 포함되어 있습니다' };
    }
  }

  return { ok: true };
}

// 한줄 소개 필터 (URL, 연락처 포함 여부도 체크)
const PHONE_PATTERN = /01[0-9]-?\d{3,4}-?\d{4}/;
const URL_PATTERN = /https?:\/\/|www\.|\.com|\.kr|\.net/i;

export function filterBio(bio: string): FilterResult {
  if (PHONE_PATTERN.test(bio)) {
    return { ok: false, reason: '소개에 전화번호를 포함할 수 없습니다' };
  }

  if (URL_PATTERN.test(bio)) {
    return { ok: false, reason: '소개에 링크를 포함할 수 없습니다' };
  }

  const lower = bio.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { ok: false, reason: '사용할 수 없는 단어가 포함되어 있습니다' };
    }
  }

  return { ok: true };
}
