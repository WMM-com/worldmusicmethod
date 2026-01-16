import jsPDF from 'jspdf';
import { TechSpec, StagePlotItem, STAGE_ICONS, MIC_TYPES, IconType } from '@/types/techSpec';
import { Profile } from '@/types/database';

export function generateTechSpecPdf(
  techSpec: TechSpec,
  items: StagePlotItem[],
  profile: Profile | null
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(techSpec.name, margin, y);
  y += 8;

  // Subheader with creator info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const creatorName = profile?.business_name || profile?.full_name || '';
  if (creatorName) {
    doc.text(creatorName, margin, y);
    y += 5;
  }
  if (profile?.email) {
    doc.text(profile.email, margin, y);
    y += 5;
  }
  if (profile?.phone) {
    doc.text(profile.phone, margin, y);
    y += 5;
  }

  // Description
  if (techSpec.description) {
    y += 3;
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(techSpec.description, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 5;
  }

  y += 10;

  // Stage Plot Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Stage Plot', margin, y);
  y += 8;

  // Draw stage area
  const stageWidth = contentWidth;
  const stageHeight = 80;
  
  // Stage background
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(180, 180, 180);
  doc.roundedRect(margin, y, stageWidth, stageHeight, 3, 3, 'FD');

  // Stage front indicator
  doc.setFillColor(255, 240, 200);
  doc.rect(margin, y + stageHeight - 8, stageWidth, 8, 'F');
  doc.setFontSize(7);
  doc.setTextColor(150, 120, 50);
  doc.text('FRONT OF STAGE (AUDIENCE)', pageWidth / 2, y + stageHeight - 2, { align: 'center' });

  // Draw paired item connections first (behind icons)
  doc.setDrawColor(200, 180, 50);
  doc.setLineDashPattern([2, 2], 0);
  items.forEach((item) => {
    if (!item.paired_with_id) return;
    const paired = items.find((i) => i.id === item.paired_with_id);
    if (!paired || item.id > paired.id) return;
    
    const x1 = margin + (item.position_x / 100) * stageWidth;
    const y1 = y + (item.position_y / 100) * stageHeight;
    const x2 = margin + (paired.position_x / 100) * stageWidth;
    const y2 = y + (paired.position_y / 100) * stageHeight;
    
    doc.line(x1, y1, x2, y2);
  });
  doc.setLineDashPattern([], 0);

  // Icon abbreviations for PDF
  const getIconAbbrev = (iconType: string): string => {
    const abbrevMap: Record<string, string> = {
      'person_standing': '🧍',
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
  };

  // Draw items on stage with channel numbers and icon abbreviations
  doc.setFontSize(6);
  items.forEach((item) => {
    const itemX = margin + (item.position_x / 100) * stageWidth;
    const itemY = y + (item.position_y / 100) * stageHeight;
    
    // Draw circle/marker - larger to fit abbreviation
    const radius = 6;
    if (item.provided_by === 'venue') {
      doc.setFillColor(200, 220, 255);
      doc.setDrawColor(100, 130, 200);
    } else if (item.provided_by === 'artist') {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(100, 100, 100);
    } else {
      doc.setFillColor(230, 230, 230);
      doc.setDrawColor(150, 150, 150);
    }
    doc.circle(itemX, itemY, radius, 'FD');
    
    // Draw icon abbreviation inside circle
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    const abbrev = getIconAbbrev(item.icon_type);
    doc.text(abbrev, itemX, itemY - 0.5, { align: 'center' });
    
    // Draw channel number below if assigned
    if (item.channel_number) {
      doc.setFontSize(5);
      doc.setTextColor(100, 100, 100);
      doc.text(`Ch${item.channel_number}`, itemX, itemY + 3, { align: 'center' });
    }
  });

  y += stageHeight + 10;

  // Legend for stage plot
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  
  // Artist provided
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 100, 100);
  doc.circle(margin + 3, y, 3, 'FD');
  doc.text('Artist provides', margin + 10, y + 1);
  
  // Venue provided
  doc.setFillColor(200, 220, 255);
  doc.setDrawColor(100, 130, 200);
  doc.circle(margin + 60, y, 3, 'FD');
  doc.text('Venue provides', margin + 67, y + 1);
  
  // Paired monitors
  doc.setDrawColor(200, 180, 50);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin + 115, y, margin + 125, y);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(100, 100, 100);
  doc.text('Paired monitors', margin + 128, y + 1);

  y += 15;

  // Channel List / Input List (Most important for sound engineers)
  const channelItems = items
    .filter(item => item.channel_number !== null)
    .sort((a, b) => (a.channel_number || 0) - (b.channel_number || 0));

  if (channelItems.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Channel List / Input List', margin, y);
    y += 8;

    // Table header
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    const colCh = margin + 3;
    const colInput = margin + 18;
    const colMic = margin + 70;
    const col48v = margin + 105;
    const colIns = margin + 118;
    const colMon = margin + 132;
    const colFx = margin + 158;
    
    y += 5.5;
    doc.text('Ch', colCh, y);
    doc.text('Input / Source', colInput, y);
    doc.text('Mic / DI', colMic, y);
    doc.text('48V', col48v, y);
    doc.text('Ins', colIns, y);
    doc.text('Monitors', colMon, y);
    doc.text('FX', colFx, y);
    y += 5;

    // Table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    channelItems.forEach((item, index) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }

      const iconInfo = STAGE_ICONS.find((i) => i.type === item.icon_type);
      const micInfo = item.mic_type ? MIC_TYPES.find((m) => m.value === (item.mic_type as string)) : null;
      const displayLabel = item.label || iconInfo?.label || item.icon_type;
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3.5, contentWidth, 7, 'F');
      }

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text((item.channel_number || '').toString(), colCh, y);
      doc.setFont('helvetica', 'normal');
      doc.text(displayLabel.substring(0, 25), colInput, y);
      doc.text((micInfo?.label || item.mic_type || '-').substring(0, 15), colMic, y);
      
      // 48V indicator
      if (item.phantom_power) {
        doc.setTextColor(200, 150, 0);
        doc.text('✓', col48v + 3, y);
        doc.setTextColor(0, 0, 0);
      }
      
      // Insert indicator
      if (item.insert_required) {
        doc.setTextColor(0, 100, 200);
        doc.text('✓', colIns + 3, y);
        doc.setTextColor(0, 0, 0);
      }
      
      // Monitor mixes
      const monText = item.monitor_mixes?.join(', ') || '-';
      doc.text(monText.substring(0, 12), colMon, y);
      
      // FX sends
      const fxText = item.fx_sends?.join(', ') || '-';
      doc.text(fxText.substring(0, 12), colFx, y);

      y += 7;
    });

    y += 5;
  }

  // Equipment List
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }
  
  doc.text('Equipment List', margin, y);
  y += 8;

  // Table header
  doc.setFillColor(50, 50, 50);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  const colNum = margin + 3;
  const colItem = margin + 15;
  const colLabel = margin + 55;
  const colMicEq = margin + 100;
  const colProvider = margin + 145;
  
  y += 5.5;
  doc.text('#', colNum, y);
  doc.text('Equipment', colItem, y);
  doc.text('Label', colLabel, y);
  doc.text('Mic/Input', colMicEq, y);
  doc.text('Provided By', colProvider, y);
  y += 5;

  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  items.forEach((item, index) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }

    const iconInfo = STAGE_ICONS.find((i) => i.type === item.icon_type);
    const micInfo = item.mic_type ? MIC_TYPES.find((m) => m.value === (item.mic_type as string)) : null;
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 3, contentWidth, 8, 'F');
    }

    // Highlight venue-provided items
    if (item.provided_by === 'venue') {
      doc.setFillColor(240, 245, 255);
      doc.rect(margin, y - 3, contentWidth, 8, 'F');
    }

    doc.setTextColor(0, 0, 0);
    doc.text((index + 1).toString(), colNum, y);
    doc.text((iconInfo?.label || item.icon_type).substring(0, 20), colItem, y);
    doc.text((item.label || '-').substring(0, 20), colLabel, y);
    doc.text((micInfo?.label || item.mic_type || '-').substring(0, 20), colMicEq, y);
    
    if (item.provided_by === 'venue') {
      doc.setTextColor(80, 100, 180);
      doc.setFont('helvetica', 'bold');
    }
    const providerText = item.provided_by === 'venue' ? 'Venue' : item.provided_by === 'artist' ? 'Artist' : 'TBD';
    doc.text(providerText, colProvider, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    y += 8;

    // Add notes if present
    if (item.notes) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const noteLines = doc.splitTextToSize(`Note: ${item.notes}`, contentWidth - 20);
      doc.text(noteLines, colItem, y);
      y += noteLines.length * 4 + 2;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
    }
  });

  // Summary section
  y += 10;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const artistItems = items.filter((i) => i.provided_by === 'artist').length;
  const venueItems = items.filter((i) => i.provided_by === 'venue').length;
  const unspecifiedItems = items.filter((i) => !i.provided_by).length;
  const totalChannels = channelItems.length;
  
  doc.text(`Total items: ${items.length}`, margin, y);
  y += 5;
  doc.text(`Total channels: ${totalChannels}`, margin, y);
  y += 5;
  doc.text(`Artist provides: ${artistItems} items`, margin, y);
  y += 5;
  doc.setTextColor(80, 100, 180);
  doc.text(`Venue to provide: ${venueItems} items`, margin, y);
  if (unspecifiedItems > 0) {
    y += 5;
    doc.setTextColor(150, 150, 150);
    doc.text(`Unspecified: ${unspecifiedItems} items`, margin, y);
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Tech Spec: ${techSpec.name} | Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadTechSpecPdf(
  techSpec: TechSpec,
  items: StagePlotItem[],
  profile: Profile | null
) {
  const doc = generateTechSpecPdf(techSpec, items, profile);
  const fileName = `${techSpec.name.replace(/[^a-z0-9]/gi, '_')}_tech_spec.pdf`;
  doc.save(fileName);
}