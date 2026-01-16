import jsPDF from 'jspdf';
import { IconType } from '@/types/techSpec';

// SVG path data for each icon type - simplified for PDF rendering
// Each icon is designed for a 48x48 viewBox and will be scaled to the desired size
const iconPaths: Record<IconType, { paths: string[]; fills?: number[] }> = {
  // Electric Guitar
  electric_guitar: {
    paths: [
      'M12 8L14 4H17L19 8', // Headstock
      'M13 4V8M15 4V8M18 4V8', // Tuning pegs
      'M13 8H19', // Nut
      'M16 12V28', // Neck
      'M6 36A10 8 0 1 0 26 36A10 8 0 1 0 6 36', // Body
    ]
  },
  
  // Acoustic Guitar
  acoustic_guitar: {
    paths: [
      'M12 8L14 4H17L19 8',
      'M13 4V8M15 4V8M18 4V8',
      'M13 8H19',
      'M16 12V26',
      'M10 26A6 5 0 1 0 22 26',
      'M6 38A10 8 0 1 0 26 38',
      'M12 35A4 4 0 1 0 20 35', // Sound hole
    ]
  },
  
  // Classical Guitar
  classical_guitar: {
    paths: [
      'M11 4H21',
      'M12 6A1 1 0 1 0 12 8M20 6A1 1 0 1 0 20 8',
      'M14 9H18',
      'M16 12V26',
      'M10 26A6 5 0 1 0 22 26',
      'M6 38A10 8 0 1 0 26 38',
      'M11 35A5 5 0 1 0 21 35',
    ]
  },
  
  // Bass Guitar
  bass_guitar: {
    paths: [
      'M14 6L15 3H17L18 6',
      'M14.5 3V6M17.5 3V6',
      'M14 6H18',
      'M16 9V30',
      'M8 38C8 32 12 28 16 28S24 32 24 38C24 42 21 45 16 45S8 42 8 38',
    ]
  },
  
  // Keyboard
  keyboard: {
    paths: [
      'M4 16H44V32H4Z', // Body
      'M10 16V32M16 16V32M22 16V32M28 16V32M34 16V32M40 16V32', // White key dividers
    ],
    fills: [0] // Fill the body
  },
  
  // Piano
  piano: {
    paths: [
      'M6 12H42L38 40H10L6 12', // Body shape
      'M6 12C6 10 8 8 10 8H38C40 8 42 10 42 12', // Top curve
      'M8 40L6 46M40 40L42 46M24 40V44', // Legs
    ]
  },
  
  // Synth
  synth: {
    paths: [
      'M4 14H44V34H4Z', // Body
      'M6 26H42V32H6Z', // Keyboard section
      'M10 19A2 2 0 1 0 10 19M18 19A2 2 0 1 0 18 19M26 19A2 2 0 1 0 26 19', // Knobs
    ]
  },
  
  // Drums
  drums: {
    paths: [
      'M14 36A10 6 0 1 0 34 36', // Kick drum
      'M8 26A6 4 0 1 0 20 26', // Snare
      'M2 18A4 2 0 1 0 10 18M2 16A4 2 0 1 0 10 16', // Hi-hat
      'M30 28A6 4 0 1 0 42 28', // Floor tom
      'M13 14A5 3 0 1 0 23 14', // Rack tom 1
      'M25 14A5 3 0 1 0 35 14', // Rack tom 2
      'M5 8A5 2 0 1 0 15 8', // Crash cymbal
      'M34 12A6 2 0 1 0 46 12', // Ride cymbal
    ]
  },
  
  // Percussion
  percussion: {
    paths: [
      'M12 30A12 6 0 1 0 36 30',
      'M12 30V22C12 16 17 12 24 12S36 16 36 22V30',
      'M12 22H36',
    ]
  },
  
  // Congas
  congas: {
    paths: [
      'M8 12A8 4 0 1 0 24 12',
      'M8 12V36C8 40 11 44 16 44S24 40 24 36V12',
      'M27 14A7 3 0 1 0 41 14',
      'M27 14V36C27 39 29.5 43 34 43S41 39 41 36V14',
    ]
  },
  
  // Bongos
  bongos: {
    paths: [
      'M6 18A8 4 0 1 0 22 18',
      'M6 18V32C6 35 9 38 14 38S22 35 22 32V18',
      'M28 20A6 3 0 1 0 40 20',
      'M28 20V32C28 34 30.5 37 34 37S40 34 40 32V20',
      'M20 22H30',
    ]
  },
  
  // Cajon
  cajon: {
    paths: [
      'M10 8H38V44H10Z',
      'M24 38A3 3 0 1 0 24 38',
      'M14 12H34',
    ]
  },
  
  // Timpani
  timpani: {
    paths: [
      'M8 16A16 6 0 1 0 40 16',
      'M8 16V32C8 38 15 42 24 42S40 38 40 32V16',
      'M12 16A12 4 0 1 0 36 16',
    ]
  },
  
  // Violin
  violin: {
    paths: [
      'M24 4V12',
      'M22 4H26',
      'M18 16A6 4 0 1 0 30 16',
      'M18 20C16 22 14 26 14 30C14 36 18 40 24 40S34 36 34 30C34 26 32 22 30 20',
      'M20 32A4 6 0 1 0 28 32',
      'M21 26H27',
    ]
  },
  
  // Viola
  viola: {
    paths: [
      'M24 4V10',
      'M22 4H26',
      'M17 14A7 4 0 1 0 31 14',
      'M17 18C14 20 12 25 12 30C12 36 17 42 24 42S36 36 36 30C36 25 34 20 31 18',
      'M19 32A5 7 0 1 0 29 32',
      'M20 25H28',
    ]
  },
  
  // Cello
  cello: {
    paths: [
      'M24 2V8',
      'M21 2H27',
      'M16 12A8 4 0 1 0 32 12',
      'M16 16C12 19 10 24 10 30C10 38 16 44 24 44S38 38 38 30C38 24 36 19 32 16',
      'M18 34A6 8 0 1 0 30 34',
      'M19 24H29',
      'M24 42V46',
    ]
  },
  
  // Double Bass
  double_bass: {
    paths: [
      'M24 2V6',
      'M20 2H28',
      'M14 10A10 4 0 1 0 34 10',
      'M14 14C10 18 6 24 6 32C6 42 14 46 24 46S42 42 42 32C42 24 38 18 34 14',
      'M16 34A8 10 0 1 0 32 34',
      'M17 22H31',
      'M24 44V48',
    ]
  },
  
  // Harp
  harp: {
    paths: [
      'M10 44C10 24 14 8 24 4',
      'M10 44H30C34 44 38 42 38 38V8',
      'M12 8V40M16 6V42M20 5V43M24 4V44M28 6V44M32 8V43',
    ]
  },
  
  // Trumpet
  trumpet: {
    paths: [
      'M4 24H12',
      'M12 20H16V28H12Z',
      'M16 24H20',
      'M22 18A2 2 0 1 0 22 18M26 18A2 2 0 1 0 26 18M30 18A2 2 0 1 0 30 18',
      'M20 20H32V28H20Z',
      'M32 24H36',
      'M36 16C42 16 44 20 44 24S42 32 36 32',
    ]
  },
  
  // Trombone
  trombone: {
    paths: [
      'M4 20H34M4 28H34',
      'M4 20V28',
      'M34 16C42 16 44 24 44 24S42 32 34 32',
      'M30 18H34V30H30Z',
      'M8 28V36H12V28',
    ]
  },
  
  // French Horn
  french_horn: {
    paths: [
      'M10 24A14 14 0 1 0 38 24',
      'M14 24A10 10 0 1 0 34 24',
      'M18 24A6 6 0 1 0 30 24',
      'M10 24C6 24 4 28 4 28S6 32 10 32',
    ]
  },
  
  // Tuba
  tuba: {
    paths: [
      'M10 38A14 8 0 1 0 38 38',
      'M10 38V18C10 10 16 4 24 4S38 10 38 18V38',
      'M18 20A2 2 0 1 0 18 20M24 18A2 2 0 1 0 24 18M30 20A2 2 0 1 0 30 20',
      'M14 38A10 5 0 1 0 34 38',
    ]
  },
  
  // Flugelhorn
  flugelhorn: {
    paths: [
      'M4 24H10',
      'M10 20H14V28H10Z',
      'M14 24H18',
      'M20 18A2 2 0 1 0 20 18M24 18A2 2 0 1 0 24 18M28 18A2 2 0 1 0 28 18',
      'M18 20H30V28H18Z',
      'M30 24H34',
      'M34 16C44 16 46 24 46 24S44 32 34 32',
    ]
  },
  
  // Saxophone
  saxophone: {
    paths: [
      'M14 4L18 6V14',
      'M14 16A4 3 0 1 0 22 16',
      'M18 19C18 27 16 33 24 41',
      'M20 42A8 4 0 1 0 36 42',
      'M14 20A1.5 1.5 0 1 0 14 20M16 24A1.5 1.5 0 1 0 16 24M18 28A1.5 1.5 0 1 0 18 28M20 32A1.5 1.5 0 1 0 20 32M22 36A1.5 1.5 0 1 0 22 36',
    ]
  },
  
  // Clarinet
  clarinet: {
    paths: [
      'M22 4H26V10H22Z',
      'M21 10H27V38H21Z',
      'M19 42A5 4 0 1 0 29 42',
      'M20 16A1 1 0 1 0 20 16M20 22A1 1 0 1 0 20 22M20 28A1 1 0 1 0 20 28',
      'M28 19A1 1 0 1 0 28 19M28 25A1 1 0 1 0 28 25M28 31A1 1 0 1 0 28 31',
    ]
  },
  
  // Flute
  flute: {
    paths: [
      'M4 22H44V26H4Z',
      'M6 24A2 3 0 1 0 10 24',
      'M14 24A1.5 1.5 0 1 0 14 24M20 24A1.5 1.5 0 1 0 20 24M26 24A1.5 1.5 0 1 0 26 24M32 24A1.5 1.5 0 1 0 32 24M38 24A1.5 1.5 0 1 0 38 24',
    ]
  },
  
  // Oboe
  oboe: {
    paths: [
      'M22 4H26L27 8H21L22 4Z',
      'M21 8H27V38H21Z',
      'M18 42A6 4 0 1 0 30 42',
      'M20 14A1 1 0 1 0 20 14M20 20A1 1 0 1 0 20 20M20 26A1 1 0 1 0 20 26M20 32A1 1 0 1 0 20 32',
      'M28 17A1 1 0 1 0 28 17M28 23A1 1 0 1 0 28 23M28 29A1 1 0 1 0 28 29',
    ]
  },
  
  // Bassoon
  bassoon: {
    paths: [
      'M16 4C14 6 12 10 12 14V42',
      'M32 4C34 6 36 10 36 14V38',
      'M12 38H20V44H12Z',
      'M28 34H36V40H28Z',
      'M20 42H28',
    ]
  },
  
  // Monitor wedge
  monitor: {
    paths: [
      'M6 38L12 16H36L42 38H6Z',
      'M16 26A8 6 0 1 0 32 26',
      'M21 26A3 2 0 1 0 27 26',
      'M10 36H38',
    ]
  },
  
  // Mic tall (boom stand)
  mic_tall: {
    paths: [
      'M24 46V20',
      'M18 46H30',
      'M24 20L34 10',
      'M32 8A4 6 0 1 0 40 8',
      'M20 44A2 2 0 1 0 20 44M28 44A2 2 0 1 0 28 44',
      'M22 18H26V24H22Z',
    ]
  },
  
  // Mic short (straight stand)
  mic_short: {
    paths: [
      'M24 46V24',
      'M18 46H30',
      'M20 18A4 8 0 1 0 28 18',
      'M22 22H26V26H22Z',
      'M20 44A2 2 0 1 0 20 44M28 44A2 2 0 1 0 28 44',
    ]
  },
  
  // DI Box
  di_box: {
    paths: [
      'M8 16H40V32H8Z',
      'M16 24A3 3 0 1 0 16 24',
      'M32 24A3 3 0 1 0 32 24',
      'M22 20V28',
    ]
  },
  
  // Guitar Amp
  amp_guitar: {
    paths: [
      'M8 10H40V42H8Z',
      'M12 14H36V26H12Z',
      'M14 32A3 3 0 1 0 14 32M22 32A3 3 0 1 0 22 32M30 32A3 3 0 1 0 30 32',
    ]
  },
  
  // Bass Amp
  amp_bass: {
    paths: [
      'M6 8H42V44H6Z',
      'M10 12H38V28H10Z',
      'M12 34A4 4 0 1 0 12 34M24 34A4 4 0 1 0 24 34M36 34A4 4 0 1 0 36 34',
    ]
  },
  
  // Subwoofer
  subwoofer: {
    paths: [
      'M8 8H40V40H8Z',
      'M24 24A12 12 0 1 0 24 24',
      'M24 24A4 4 0 1 0 24 24',
    ]
  },
  
  // IEM Pack
  iem: {
    paths: [
      'M14 16H34V40H14Z',
      'M18 20H30V28H18Z',
      'M18 32H22V36H18Z',
      'M26 32H30V36H26Z',
      'M20 10L24 16L28 10',
    ]
  },
  
  // Laptop
  laptop: {
    paths: [
      'M10 14H38V32H10Z',
      'M6 32H42V36H6Z',
      'M14 18H34V28H14Z',
    ]
  },
  
  // Mixer
  mixer: {
    paths: [
      'M6 12H42V38H6Z',
      'M10 16V34M16 16V34M22 16V34M28 16V34M34 16V34M38 16V34',
      'M10 20H38',
    ]
  },
  
  // Music Stand
  music_stand: {
    paths: [
      'M12 10H36V30H12Z',
      'M24 30V44',
      'M18 44H30',
      'M24 30L32 38',
    ]
  },
  
  // Person standing
  person_standing: {
    paths: [
      'M24 10A4 4 0 1 0 24 10', // Head
      'M24 14V28', // Body
      'M18 18H30', // Arms
      'M24 28L18 42M24 28L30 42', // Legs
    ]
  },
  
  // Person seated
  person_seated: {
    paths: [
      'M24 8A4 4 0 1 0 24 8', // Head
      'M24 12V24', // Body
      'M18 16H30', // Arms
      'M24 24H32V28H16V24', // Chair seat
      'M18 24L14 36', // Leg
      'M32 28V38', // Chair leg
    ]
  },
};

// Draw an icon on the PDF at specified position
export function drawPdfIcon(
  doc: jsPDF,
  iconType: IconType,
  x: number,
  y: number,
  size: number = 12,
  strokeColor: [number, number, number] = [80, 80, 80]
): void {
  const iconData = iconPaths[iconType];
  if (!iconData) {
    // Fallback: draw a simple circle with abbreviation
    doc.setDrawColor(...strokeColor);
    doc.setFillColor(230, 230, 230);
    doc.circle(x, y, size / 2, 'FD');
    return;
  }

  const scale = size / 48; // Icons are designed for 48x48 viewBox
  const offsetX = x - size / 2;
  const offsetY = y - size / 2;

  doc.setDrawColor(...strokeColor);
  doc.setLineWidth(0.4);

  iconData.paths.forEach((pathStr, index) => {
    // Parse and draw each path segment
    drawPath(doc, pathStr, offsetX, offsetY, scale, iconData.fills?.includes(index));
  });
}

// Simple SVG path parser for basic commands (M, L, H, V, A, Z)
function drawPath(
  doc: jsPDF,
  pathStr: string,
  offsetX: number,
  offsetY: number,
  scale: number,
  shouldFill: boolean = false
): void {
  const commands = pathStr.match(/[MLHVAZ][^MLHVAZ]*/gi) || [];
  
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  const points: [number, number][] = [];

  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase();
    const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // Move to
        if (args.length >= 2) {
          currentX = args[0];
          currentY = args[1];
          startX = currentX;
          startY = currentY;
          points.push([offsetX + currentX * scale, offsetY + currentY * scale]);
        }
        break;
        
      case 'L': // Line to
        if (args.length >= 2) {
          currentX = args[0];
          currentY = args[1];
          points.push([offsetX + currentX * scale, offsetY + currentY * scale]);
        }
        break;
        
      case 'H': // Horizontal line
        if (args.length >= 1) {
          currentX = args[0];
          points.push([offsetX + currentX * scale, offsetY + currentY * scale]);
        }
        break;
        
      case 'V': // Vertical line
        if (args.length >= 1) {
          currentY = args[0];
          points.push([offsetX + currentX * scale, offsetY + currentY * scale]);
        }
        break;
        
      case 'A': // Arc - simplified as a small circle or ellipse marker
        // For PDF we'll approximate arcs with simple markers
        if (args.length >= 7) {
          const endX = args[5];
          const endY = args[6];
          currentX = endX;
          currentY = endY;
          // Draw a small circle at the end point for visual indication
          doc.circle(offsetX + endX * scale, offsetY + endY * scale, 1, 'S');
        }
        break;
        
      case 'Z': // Close path
        if (startX !== undefined && startY !== undefined) {
          points.push([offsetX + startX * scale, offsetY + startY * scale]);
        }
        break;
    }
  });

  // Draw the collected points as lines
  if (points.length >= 2) {
    for (let i = 0; i < points.length - 1; i++) {
      doc.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    }
  }
}

// Get icon label abbreviation for fallback text
export function getIconAbbreviation(iconType: IconType): string {
  const abbrevMap: Record<string, string> = {
    'person_standing': '👤',
    'person_seated': '🪑',
    'electric_guitar': 'EG',
    'acoustic_guitar': 'AG',
    'classical_guitar': 'CG',
    'bass_guitar': 'BG',
    'keyboard': 'KB',
    'piano': 'PN',
    'synth': 'SY',
    'drums': 'DR',
    'percussion': 'PC',
    'congas': 'CG',
    'bongos': 'BN',
    'cajon': 'CJ',
    'timpani': 'TM',
    'violin': 'VN',
    'viola': 'VA',
    'cello': 'VC',
    'double_bass': 'DB',
    'harp': 'HP',
    'trumpet': 'TP',
    'trombone': 'TB',
    'french_horn': 'FH',
    'tuba': 'TU',
    'flugelhorn': 'FG',
    'saxophone': 'SX',
    'clarinet': 'CL',
    'flute': 'FL',
    'oboe': 'OB',
    'bassoon': 'BS',
    'monitor': 'M',
    'mic_tall': '🎤',
    'mic_short': '🎤',
    'di_box': 'DI',
    'amp_guitar': 'GA',
    'amp_bass': 'BA',
    'subwoofer': 'SW',
    'iem': 'IE',
    'laptop': '💻',
    'mixer': 'MX',
    'music_stand': 'MS',
  };
  return abbrevMap[iconType] || iconType.substring(0, 2).toUpperCase();
}