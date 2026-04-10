import {
  Antenna,
  BarChart3,
  Bolt,
  Briefcase,
  Building2,
  Candy,
  CarFront,
  CircleDollarSign,
  Cpu,
  Droplet,
  Factory,
  FlaskConical,
  Fuel,
  Gem,
  HandCoins,
  LayoutGrid,
  Package,
} from 'lucide-react-native';

export const getSectorIcon = (name: string) => {
  const sectorIcons: Record<string, any> = {
    Bank: Building2,
    IT: Cpu,
    Refineries: Fuel,
    'Mutual Fund': Briefcase,
    FMCG: Package,
    Automobile: CarFront,
    Gold: CircleDollarSign,
    Communications: Antenna,
    'Steel/ Iron Prducts': Factory,
    'Steel/ Iron Products': Factory,
    Oil: Droplet,
    NBFC: HandCoins,
    Power: Bolt,
    Jewellery: Gem,
    Trading: BarChart3,
    Petrochemicals: FlaskConical,
    Sugar: Candy,
  };

  const Icon = sectorIcons[name] || LayoutGrid;
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

  return { icon: Icon, color: sectorColors[name] || '#32D74B' };
};
