import {
  Antenna,
  ArrowUpRight,
  BarChart3,
  Bolt,
  Briefcase,
  Building2,
  Candy,
  Car,
  CarFront,
  ChartNoAxesCombined,
  CircleDollarSign,
  Coins,
  Cpu,
  CreditCard,
  Diamond,
  Droplet,
  Factory,
  FlaskConical,
  Fuel,
  Gem,
  Hammer,
  HandCoins,
  Landmark,
  Layers,
  LayoutGrid,
  Medal,
  Monitor,
  Package,
  Phone,
  ShoppingBasket,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react-native';

export const SECTOR_ICONS: Record<string, any> = {
  Bank: Landmark,
  IT: Monitor,
  Refineries: Factory,
  'Mutual Fund': Wallet,
  FMCG: ShoppingBasket,
  Automobile: Car,
  Gold: Coins,
  Communications: Phone,
  'Steel/ Iron Prducts': Hammer,
  'Steel/ Iron Products': Hammer,
  Oil: Droplet,
  NBFC: CreditCard,
  Power: Zap,
  Jewellery: Diamond,
  Trading: TrendingUp,
  Petrochemicals: FlaskConical,
  Sugar: Candy,
};

export const ASSET_TYPE_ICONS: Record<string, any> = {
  'Large Cap': Trophy,
  'Mid Cap': Medal,
  'Small Cap': Target,
  ETF: Layers,
};

export const BROKER_ICONS: Record<string, any> = {
  Upstox: ArrowUpRight,
  Groww: ChartNoAxesCombined,
  'IND Money': Landmark,
};

export const CHART_COLORS = [
  '#0A84FF',
  '#5E5CE6',
  '#BF5AF2',
  '#FF2D55',
  '#FF9F0A',
  '#FFD60A',
  '#30D158',
  '#64D2FF',
  '#FF375F',
  '#32D74B',
];

export const getStableColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CHART_COLORS.length;
  return CHART_COLORS[index];
};

export const getCategoryIcon = (type: string, value: string) => {
  let icon = LayoutGrid;
  let color = '#8E8E93';

  if (type === 'Sector') {
    icon = SECTOR_ICONS[value] || LayoutGrid;
    const sectorColors: Record<string, string> = {
      Bank: '#0A84FF',
      IT: '#5E5CE6',
      Refineries: '#8E8E93',
      'Mutual Fund': '#AF52DE',
      FMCG: '#FF375F',
      Automobile: '#FF2D55',
      Gold: '#FFD60A',
      Communications: '#64D2FF',
      'Steel/ Iron Products': '#8E8E93',
      Oil: '#007AFF',
      NBFC: '#5AC8FA',
      Power: '#FF9F0A',
      Jewellery: '#BF5AF2',
      Trading: '#30D158',
      Petrochemicals: '#BF5AF2',
      Sugar: '#FFCC00',
    };
    color = sectorColors[value] || getStableColor(value);
  } else if (type === 'Asset Type') {
    icon = ASSET_TYPE_ICONS[value] || Layers;
    color = getStableColor(value);
  } else if (type === 'Broker') {
    icon = BROKER_ICONS[value] || Briefcase;
    color = getStableColor(value);
  } else if (type === 'Company Name') {
    color = getStableColor(value);
  }

  return { icon, color };
};

export const getSectorIcon = (name: string) => getCategoryIcon('Sector', name);
export const getAssetTypeIcon = (name: string) =>
  getCategoryIcon('Asset Type', name);
export const getBrokerIcon = (name: string) => getCategoryIcon('Broker', name);
