import { TranslationKey } from './i18n';

export const HOBBY_CATEGORIES = [
  {
    categoryKey: '운동/액티비티',
    categoryEn: 'Sports & Activities',
    categoryZh: '運動/活動',
    categoryJa: 'スポーツ',
    items:   ['헬스', '러닝', '등산', '자전거', '수영', '테니스', '골프', '클라이밍', '요가', '필라테스', '축구', '농구', '배드민턴', '볼링', '스키/보드'],
    itemsEn: ['Gym', 'Running', 'Hiking', 'Cycling', 'Swimming', 'Tennis', 'Golf', 'Climbing', 'Yoga', 'Pilates', 'Soccer', 'Basketball', 'Badminton', 'Bowling', 'Ski/Snowboard'],
    itemsZh: ['健身房', '跑步', '爬山', '騎自行車', '游泳', '網球', '高爾夫', '攀岩', '瑜伽', '皮拉提斯', '足球', '籃球', '羽毛球', '保齡球', '滑雪/滑板'],
    itemsJa: ['ジム', 'ランニング', '登山', 'サイクリング', '水泳', 'テニス', 'ゴルフ', 'クライミング', 'ヨガ', 'ピラティス', 'サッカー', 'バスケ', 'バドミントン', 'ボウリング', 'スキー/スノボ'],
  },
  {
    categoryKey: '문화/예술',
    categoryEn: 'Culture & Arts',
    categoryZh: '文化/藝術',
    categoryJa: '文化・芸術',
    items:   ['영화', '공연/뮤지컬', '전시/미술관', '독서', '그림', '사진', '글쓰기', '악기연주', '노래', '춤/댄스'],
    itemsEn: ['Movies', 'Musicals', 'Gallery', 'Reading', 'Drawing', 'Photography', 'Writing', 'Instrument', 'Singing', 'Dancing'],
    itemsZh: ['電影', '表演/音樂劇', '展覽/美術館', '閱讀', '繪畫', '攝影', '寫作', '樂器', '唱歌', '跳舞'],
    itemsJa: ['映画', 'ミュージカル', '美術館', '読書', '絵を描く', '写真', '文章', '楽器', '歌', 'ダンス'],
  },
  {
    categoryKey: '음식/음료',
    categoryEn: 'Food & Drinks',
    categoryZh: '飲食',
    categoryJa: 'グルメ',
    items:   ['맛집탐방', '카페투어', '요리', '베이킹', '와인', '위스키', '홈카페', '브런치'],
    itemsEn: ['Food Tour', 'Cafe Hopping', 'Cooking', 'Baking', 'Wine', 'Whiskey', 'Home Cafe', 'Brunch'],
    itemsZh: ['美食探店', '咖啡廳巡禮', '料理', '烘焙', '葡萄酒', '威士忌', '在家做咖啡', '早午餐'],
    itemsJa: ['グルメ巡り', 'カフェ巡り', '料理', 'ベーキング', 'ワイン', 'ウイスキー', 'ホームカフェ', 'ブランチ'],
  },
  {
    categoryKey: '여행/아웃도어',
    categoryEn: 'Travel & Outdoor',
    categoryZh: '旅行/戶外',
    categoryJa: '旅行・アウトドア',
    items:   ['국내여행', '해외여행', '캠핑', '피크닉', '드라이브', '한강', '야경투어'],
    itemsEn: ['Domestic Travel', 'International Travel', 'Camping', 'Picnic', 'Driving', 'Han River', 'Night View'],
    itemsZh: ['國內旅行', '海外旅行', '露營', '野餐', '兜風', '漢江', '夜景觀賞'],
    itemsJa: ['国内旅行', '海外旅行', 'キャンプ', 'ピクニック', 'ドライブ', '漢江', '夜景ツアー'],
  },
  {
    categoryKey: '취미/게임',
    categoryEn: 'Hobbies & Games',
    categoryZh: '嗜好/遊戲',
    categoryJa: '趣味・ゲーム',
    items:   ['게임', '보드게임', '퍼즐', '레고', '다이어리꾸미기', '뜨개질', '식물키우기', '반려동물', 'DIY'],
    itemsEn: ['Gaming', 'Board Games', 'Puzzles', 'LEGO', 'Journaling', 'Knitting', 'Plants', 'Pets', 'DIY'],
    itemsZh: ['電玩', '桌游', '拼圖', '樂高', '手帳', '編織', '種植物', '養寵物', 'DIY'],
    itemsJa: ['ゲーム', 'ボードゲーム', 'パズル', 'レゴ', '手帳作り', '編み物', '植物', 'ペット', 'DIY'],
  },
  {
    categoryKey: '자기계발',
    categoryEn: 'Self-development',
    categoryZh: '自我成長',
    categoryJa: '自己成長',
    items:   ['어학공부', '재테크', '명상', '코딩', '유튜브', '팟캐스트'],
    itemsEn: ['Language Study', 'Investing', 'Meditation', 'Coding', 'YouTube', 'Podcast'],
    itemsZh: ['語言學習', '理財', '冥想', '程式設計', 'YouTube', 'Podcast'],
    itemsJa: ['語学勉強', '投資', '瞑想', 'コーディング', 'YouTube', 'ポッドキャスト'],
  },
];

export function getHobbyItems(cat: typeof HOBBY_CATEGORIES[0], locale: string): string[] {
  if (locale === 'en') return cat.itemsEn;
  if (locale === 'zh') return cat.itemsZh;
  if (locale === 'ja') return cat.itemsJa;
  return cat.items;
}

export function getCategoryName(cat: typeof HOBBY_CATEGORIES[0], locale: string): string {
  if (locale === 'en') return cat.categoryEn;
  if (locale === 'zh') return cat.categoryZh;
  if (locale === 'ja') return cat.categoryJa;
  return cat.categoryKey;
}

export const HOBBIES_FLAT = HOBBY_CATEGORIES.flatMap((c) => c.items);

// Korean hobby key → localized display name
export function getLocalizedHobby(koHobby: string, locale: string): string {
  for (const cat of HOBBY_CATEGORIES) {
    const idx = cat.items.indexOf(koHobby);
    if (idx !== -1) return getHobbyItems(cat, locale)[idx];
  }
  return koHobby;
}

// value key ('employee') → translated label via t()
export function translateOption(
  value: string,
  options: { labelKey: TranslationKey; value: string }[],
  t: (k: TranslationKey) => string,
): string {
  const opt = options.find((o) => o.value === value);
  return opt ? t(opt.labelKey) : value;
}

export const JOB_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: 'jobEmployee',     value: 'employee' },
  { labelKey: 'jobStudent',      value: 'student' },
  { labelKey: 'jobGrad',         value: 'grad' },
  { labelKey: 'jobFreelance',    value: 'freelance' },
  { labelKey: 'jobSelfEmployed', value: 'self' },
  { labelKey: 'jobGovt',         value: 'govt' },
  { labelKey: 'jobArt',          value: 'art' },
  { labelKey: 'jobOther',        value: 'other' },
];

export const SMOKING_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: 'smokingNone',  value: 'none' },
  { labelKey: 'smokingEcig',  value: 'e-cig' },
  { labelKey: 'smokingSmoke', value: 'smoke' },
];

export const DRINKING_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: 'drinkingRarely',    value: 'rarely' },
  { labelKey: 'drinkingSometimes', value: 'sometimes' },
  { labelKey: 'drinkingOften',     value: 'often' },
];

export const GENDER_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: 'genderMale',   value: 'male' },
  { labelKey: 'genderFemale', value: 'female' },
  { labelKey: 'genderOther',  value: 'other' },
];

export const INTEREST_GENDER_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: 'interestFemale', value: 'female' },
  { labelKey: 'interestMale',   value: 'male' },
  { labelKey: 'interestAll',    value: 'all' },
];
