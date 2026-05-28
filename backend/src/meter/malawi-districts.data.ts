export type MalawiLocation = { number: number; label: string };

export type MalawiDistrict = {
  number: number;
  name: string;
  code: string;
  locations: MalawiLocation[];
};

const ZOMBA_LOCATIONS: MalawiLocation[] = [
  { number: 1, label: 'NACHUMA' },
  { number: 2, label: 'CHAWE' },
  { number: 3, label: 'JOKALA' },
  { number: 4, label: 'AIRWING' },
  { number: 5, label: 'THUNDU' },
  { number: 6, label: 'SUNUZI' },
  { number: 7, label: 'SEVEN MILES' },
  { number: 8, label: 'PIRIMITI' },
  { number: 9, label: 'OLD NAISI' },
  { number: 10, label: 'NGWELERO' },
  { number: 11, label: 'NDOLA' },
  { number: 12, label: 'NAMWERA T/OFF' },
  { number: 13, label: 'NAMADIDI' },
  { number: 14, label: 'NAISI' },
  { number: 15, label: 'MULUNGUZI' },
  { number: 16, label: 'MPUNGA' },
  { number: 17, label: 'MPSYUPSYU' },
  { number: 18, label: 'MALONJE' },
  { number: 19, label: 'MACHINGA' },
  { number: 20, label: 'KALIMBUKA' },
  { number: 21, label: 'GOVALA' },
  { number: 22, label: 'FIVE MILES' },
  { number: 23, label: 'DZAONE' },
  { number: 24, label: 'CHINGALE' },
  { number: 25, label: 'CHIGUMULA' },
  { number: 26, label: 'CHANGALUME' },
  { number: 27, label: 'JALI' },
  { number: 28, label: 'BIMBI' },
  { number: 29, label: 'KATIMBA' },
  { number: 30, label: 'CHIKANDA' },
  { number: 31, label: 'CHINAMWALI' },
  { number: 32, label: 'CHINSEU' },
  { number: 33, label: 'CHIPINI' },
  { number: 34, label: 'DOMASI' },
  { number: 35, label: 'LUNDU' },
  { number: 36, label: 'MABLE LINE' },
  { number: 37, label: 'MAGOMERO' },
  { number: 38, label: 'MALOSA' },
  { number: 39, label: 'MATAWALE' },
  { number: 40, label: 'MAYAKA' },
  { number: 41, label: 'MPONDABWINO' },
  { number: 42, label: 'MPOSA' },
  { number: 43, label: 'NAMADZI' },
  { number: 44, label: 'NAMASALIMA' },
  { number: 45, label: 'NASAWA' },
  { number: 46, label: 'SADZI' },
  { number: 47, label: 'SONGANI' },
  { number: 48, label: 'ST MARYS' },
  { number: 49, label: 'THONDWE' },
  { number: 50, label: 'ZOMBA CENTRAL' },
  { number: 51, label: 'THREE MILES' },
];

function genericLocations(code: string): MalawiLocation[] {
  return [
    { number: 1, label: `${code} — Urban centre` },
    { number: 2, label: `${code} — Township / peri-urban` },
    { number: 3, label: `${code} — Rural cluster` },
    { number: 4, label: 'Other — describe in the next step' },
  ];
}

/** District list (1–28) and area menus; Zomba uses operational locality names from intake design. */
export const MALAWI_DISTRICTS: MalawiDistrict[] = [
  { number: 1, name: 'BALAKA', code: 'BALAKA', locations: genericLocations('BALAKA') },
  { number: 2, name: 'BLANTYRE', code: 'BLANTYRE', locations: genericLocations('BLANTYRE') },
  { number: 3, name: 'CHITIPA', code: 'CHITIPA', locations: genericLocations('CHITIPA') },
  { number: 4, name: 'DEDZA', code: 'DEDZA', locations: genericLocations('DEDZA') },
  { number: 5, name: 'DOWA', code: 'DOWA', locations: genericLocations('DOWA') },
  { number: 6, name: 'DWANGWA', code: 'DWANGWA', locations: genericLocations('DWANGWA') },
  { number: 7, name: 'KARONGA', code: 'KARONGA', locations: genericLocations('KARONGA') },
  { number: 8, name: 'KASUNGU', code: 'KASUNGU', locations: genericLocations('KASUNGU') },
  { number: 9, name: 'LILONGWE', code: 'LILONGWE', locations: genericLocations('LILONGWE') },
  { number: 10, name: 'LIWONDE', code: 'LIWONDE', locations: genericLocations('LIWONDE') },
  { number: 11, name: 'MACHINGA', code: 'MACHINGA', locations: genericLocations('MACHINGA') },
  { number: 12, name: 'MANGOCHI', code: 'MANGOCHI', locations: genericLocations('MANGOCHI') },
  { number: 13, name: 'MCHINJI', code: 'MCHINJI', locations: genericLocations('MCHINJI') },
  { number: 14, name: 'MULANJE', code: 'MULANJE', locations: genericLocations('MULANJE') },
  { number: 15, name: 'MWANZA', code: 'MWANZA', locations: genericLocations('MWANZA') },
  { number: 16, name: 'MZIMBA', code: 'MZIMBA', locations: genericLocations('MZIMBA') },
  { number: 17, name: 'MZUZU', code: 'MZUZU', locations: genericLocations('MZUZU') },
  { number: 18, name: 'NCHALO', code: 'NCHALO', locations: genericLocations('NCHALO') },
  { number: 19, name: 'NKHATA BAY', code: 'NKHATA_BAY', locations: genericLocations('NKHATA BAY') },
  { number: 20, name: 'NKHOTAKOTA', code: 'NKHOTAKOTA', locations: genericLocations('NKHOTAKOTA') },
  { number: 21, name: 'NSANJE', code: 'NSANJE', locations: genericLocations('NSANJE') },
  { number: 22, name: 'NTCHEU', code: 'NTCHEU', locations: genericLocations('NTCHEU') },
  { number: 23, name: 'NTCHISI', code: 'NTCHISI', locations: genericLocations('NTCHISI') },
  { number: 24, name: 'RUMPHI', code: 'RUMPHI', locations: genericLocations('RUMPHI') },
  { number: 25, name: 'SALIMA', code: 'SALIMA', locations: genericLocations('SALIMA') },
  { number: 26, name: 'THYOLO', code: 'THYOLO', locations: genericLocations('THYOLO') },
  { number: 27, name: 'ZOMBA', code: 'ZOMBA', locations: ZOMBA_LOCATIONS },
  {
    number: 28,
    name: 'OTHER DISTRICTS',
    code: 'OTHER',
    locations: [{ number: 1, label: 'Other — name district and area in the next step' }],
  },
];

export function getDistrictByNumber(n: number): MalawiDistrict | undefined {
  return MALAWI_DISTRICTS.find((d) => d.number === n);
}
