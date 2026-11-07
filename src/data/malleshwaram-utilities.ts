// Mock underground utility data for Malleshwaram, Bengaluru
// Coordinates: [longitude, latitude, altitude_meters]
// Negative altitude = underground depth

export interface UtilityLine {
  id: string;
  name: string;
  type: 'sewage' | 'water' | 'electricity' | 'telecom';
  depth: number; // meters below surface
  diameter: number; // pipe diameter in meters
  coordinates: [number, number][];
  color: string;
}

export const MALLESHWARAM_CENTER = {
  longitude: 77.5713,
  latitude: 13.0035,
  height: 920,
};

export const utilityLines: UtilityLine[] = [
  {
    id: 'sewage-main-01',
    name: 'Primary Sewage Trunk Line',
    type: 'sewage',
    depth: -4.5,
    diameter: 0.9,
    coordinates: [
      [77.5680, 13.0050],
      [77.5695, 13.0045],
      [77.5710, 13.0038],
      [77.5718, 13.0032],
      [77.5730, 13.0028],
      [77.5745, 13.0025],
    ],
    color: '#2d9e8f',
  },
  {
    id: 'water-main-01',
    name: 'BWSSB Water Supply Main',
    type: 'water',
    depth: -2.5,
    diameter: 0.6,
    coordinates: [
      [77.5685, 13.0060],
      [77.5700, 13.0055],
      [77.5712, 13.0048],
      [77.5720, 13.0040],
      [77.5735, 13.0035],
      [77.5750, 13.0030],
    ],
    color: '#4a90d9',
  },
  {
    id: 'electricity-01',
    name: 'BESCOM HT Cable Corridor',
    type: 'electricity',
    depth: -1.2,
    diameter: 0.3,
    coordinates: [
      [77.5690, 13.0020],
      [77.5705, 13.0025],
      [77.5715, 13.0030],
      [77.5725, 13.0035],
      [77.5740, 13.0040],
    ],
    color: '#d4a034',
  },
  {
    id: 'telecom-01',
    name: 'BSNL Fiber Optic Duct',
    type: 'telecom',
    depth: -0.8,
    diameter: 0.15,
    coordinates: [
      [77.5675, 13.0035],
      [77.5690, 13.0033],
      [77.5705, 13.0030],
      [77.5720, 13.0028],
      [77.5738, 13.0026],
      [77.5752, 13.0024],
    ],
    color: '#c0392b',
  },
  {
    id: 'optimized-route-01',
    name: 'MCDA Optimized New Pipeline',
    type: 'water',
    depth: -3.0,
    diameter: 0.5,
    coordinates: [
      [77.5688, 13.0055],
      [77.5698, 13.0050],
      [77.5706, 13.0043],
      [77.5714, 13.0036],
      [77.5722, 13.0030],
      [77.5732, 13.0026],
      [77.5742, 13.0022],
    ],
    color: '#e67e22',
  },
];

export const heritageZones = [
  {
    id: 'heritage-01',
    name: 'Kadu Malleshwara Temple',
    center: [77.5713, 13.0035] as [number, number],
    radius: 50, // meters
  },
  {
    id: 'heritage-02',
    name: 'Mantri Square Heritage Buffer',
    center: [77.5740, 13.0050] as [number, number],
    radius: 80,
  },
];

export const greenBuffers = [
  {
    id: 'green-01',
    name: 'Sankey Tank Green Zone',
    center: [77.5730, 13.0070] as [number, number],
    radius: 120,
  },
];
