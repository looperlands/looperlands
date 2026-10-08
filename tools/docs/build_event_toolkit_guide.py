#!/usr/bin/env python3
"""Build the shareable event guide. Requires reportlab; run from any directory."""
import argparse
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

PLUM = colors.HexColor('#37252d')
GOLD = colors.HexColor('#b67a23')
INK = colors.HexColor('#29242b')
MUTED = colors.HexColor('#625961')
LINE = colors.HexColor('#d6d3d7')


def inline(text):
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<link href="' + (
        m[2] if m[2].startswith('https://') else
        'https://github.com/looperlands/looperlands/blob/main/docs/' + m[2]
    ) + '" color="#76531f">' + m[1] + '</link>', text)
    return re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)


def build(source, output):
    fonts = ('Helvetica', 'Helvetica-Bold')
    candidates = [
        (Path('/System/Library/Fonts/Supplemental/Arial.ttf'), Path('/System/Library/Fonts/Supplemental/Arial Bold.ttf')),
        (Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont('Guide', str(regular)))
            pdfmetrics.registerFont(TTFont('Guide-Bold', str(bold)))
            pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='Guide-Bold', italic='Guide', boldItalic='Guide-Bold')
            fonts = ('Guide', 'Guide-Bold')
            break
    body = ParagraphStyle('GuideBody', fontName=fonts[0], fontSize=10.3, leading=14.5,
                          textColor=INK, spaceAfter=10, alignment=TA_LEFT)
    title = ParagraphStyle('GuideTitle', parent=body, fontName=fonts[1], fontSize=28,
                           leading=33, textColor=PLUM, spaceAfter=10)
    chapter = ParagraphStyle('GuideChapter', parent=body, fontName=fonts[1], fontSize=20,
                             leading=25, textColor=PLUM, spaceBefore=7, spaceAfter=17,
                             keepWithNext=True)
    heading = ParagraphStyle('GuideHeading', parent=body, fontName=fonts[1], fontSize=12,
                             leading=17, textColor=PLUM, spaceBefore=8, spaceAfter=6,
                             keepWithNext=True)
    cell = ParagraphStyle('GuideCell', parent=body, fontSize=9.5, leading=13, spaceAfter=0)
    cell_head = ParagraphStyle('GuideCellHead', parent=cell, fontName=fonts[1], textColor=colors.white)
    bullet = ParagraphStyle('GuideBullet', parent=body, leftIndent=12, firstLineIndent=-9,
                            spaceAfter=9)
    meta = ParagraphStyle('GuideMeta', parent=body, fontSize=9, leading=13, textColor=MUTED,
                          spaceAfter=16)
    story = []
    lines = source.read_text().splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line == '<!-- pagebreak -->':
            story.append(PageBreak())
        elif line.startswith('# '):
            story.append(Paragraph(inline(line[2:]), title))
        elif line.startswith('## '):
            story.append(Paragraph(inline(line[3:]), chapter))
        elif line.startswith('### '):
            story.append(Paragraph(inline(line[4:]), heading))
        elif line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].startswith('|'):
                values = [v.strip() for v in lines[index].strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', v) for v in values):
                    style = cell_head if not rows else cell
                    rows.append([Paragraph(inline(v), style) for v in values])
                index += 1
            table = Table(rows, colWidths=[141, 350], repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), PLUM),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LINEBELOW', (0, 1), (-1, -1), 0.5, LINE),
            ]))
            story.extend([table, Spacer(1, 13)])
            continue
        elif line.startswith('- '):
            story.append(Paragraph('- ' + inline(line[2:]), bullet))
        elif line.startswith('An organizer and player guide'):
            story.append(Paragraph(inline(line), meta))
        else:
            paragraph = [line]
            while index + 1 < len(lines) and lines[index + 1].strip() and not lines[index + 1].startswith(('#', '|', '-', '<!--')):
                index += 1
                paragraph.append(lines[index].strip())
            story.append(Paragraph(inline(' '.join(paragraph)), body))
        index += 1

    def page(canvas, document):
        canvas.saveState()
        canvas.setFillColor(PLUM)
        canvas.rect(0, A4[1] - 14, A4[0], 14, fill=1, stroke=0)
        canvas.setFillColor(GOLD)
        canvas.rect(52, A4[1] - 37, 43, 3, fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.line(52, 42, A4[0] - 52, 42)
        canvas.setFont(fonts[0], 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(52, 27, 'LOOPERLANDS  /  EVENT TOOLKIT  /  ORGANIZER & PLAYER GUIDE')
        canvas.drawRightString(A4[0] - 52, 27, str(document.page))
        canvas.restoreState()

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=52, rightMargin=52,
                            topMargin=54, bottomMargin=60,
                            title='LooperLands Event Toolkit - Organizer and Player Guide',
                            author='LooperLands')
    doc.build(story, onFirstPage=page, onLaterPages=page)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[2]
    parser.add_argument('--source', type=Path, default=root / 'docs/event-toolkit-guide.md')
    parser.add_argument('--output', type=Path, default=root / 'output/pdf/looperlands-event-toolkit-guide.pdf')
    args = parser.parse_args()
    build(args.source, args.output)
