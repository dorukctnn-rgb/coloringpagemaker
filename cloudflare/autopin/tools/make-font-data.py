#!/usr/bin/env python3
"""Builds cloudflare/autopin/font-data.js: glyph outlines and kerning of the site's own fonts, so the Worker can draw
the Pinterest pin text without a browser. Run again only if the fonts in public/fonts change:

    python cloudflare/autopin/tools/make-font-data.py

Needs fontTools and brotli (pip install fonttools brotli). Young Serif (display, one weight) and Hanken Grotesk
(variable, instanced at weight 560 for lines of text and 680 for the site name). Both are SIL Open Font License.
Outlines are TrueType quadratic curves in font units (1000 per em), stored as compact path strings:
M x y, L x y, Q cx cy x y, Z. Kerning is read from the GPOS "kern" feature (pair and class pairs)."""
import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.basePen import decomposeQuadraticSegment
from fontTools.varLib import instancer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FONTS = os.path.join(ROOT, 'public', 'fonts')
OUT = os.path.join(ROOT, 'cloudflare', 'autopin', 'font-data.js')

# Basic Latin plus the punctuation the pin texts use.
CHARS = [chr(c) for c in range(32, 127)] + ['’', '‘', '“', '”', '…', '·', '©']


def num(v):
    r = round(v)
    return str(int(r))


def path_of(glyph_set, name):
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    out = []
    for op, args in pen.value:
        if op == 'moveTo':
            out.append('M%s %s' % (num(args[0][0]), num(args[0][1])))
        elif op == 'lineTo':
            out.append('L%s %s' % (num(args[0][0]), num(args[0][1])))
        elif op == 'qCurveTo':
            if args[-1] is None:
                raise SystemExit('closed contour without on-curve points in ' + name)
            for (cx, cy), (x, y) in decomposeQuadraticSegment(args):
                out.append('Q%s %s %s %s' % (num(cx), num(cy), num(x), num(y)))
        elif op == 'curveTo':
            raise SystemExit('cubic curve in a TrueType font: ' + name)
        elif op in ('closePath', 'endPath'):
            out.append('Z')
    return ''.join(out)


def class_of(classdef, glyph):
    return classdef.classDefs.get(glyph, 0) if classdef is not None else 0


def pair_value(gpos, first, second):
    """XAdvance adjustment (font units) the kern feature applies to first followed by second."""
    table = gpos.table
    lookups = set()
    for fr in table.FeatureList.FeatureRecord:
        if fr.FeatureTag == 'kern':
            lookups.update(fr.Feature.LookupListIndex)
    total = 0
    for li in sorted(lookups):
        lookup = table.LookupList.Lookup[li]
        subtables = []
        for st in lookup.SubTable:
            subtables.append(st.ExtSubTable if lookup.LookupType == 9 else st)
        for st in subtables:
            if getattr(st, 'LookupType', None) is not None and st.LookupType != 2 and lookup.LookupType != 2:
                pass
            if not hasattr(st, 'Coverage'):
                continue
            if first not in st.Coverage.glyphs:
                continue
            if st.Format == 1:
                idx = st.Coverage.glyphs.index(first)
                hit = None
                for rec in st.PairSet[idx].PairValueRecord:
                    if rec.SecondGlyph == second:
                        hit = rec
                        break
                if hit is None:
                    continue
                v = hit.Value1
                total += (getattr(v, 'XAdvance', 0) or 0) if v is not None else 0
                break
            elif st.Format == 2:
                c1 = class_of(st.ClassDef1, first)
                c2 = class_of(st.ClassDef2, second)
                rec = st.Class1Record[c1].Class2Record[c2]
                v = rec.Value1
                adj = (getattr(v, 'XAdvance', 0) or 0) if v is not None else 0
                if adj == 0 and c2 == 0:
                    continue
                total += adj
                break
    return total


def build(font, label):
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    hmtx = font['hmtx']
    gpos = font['GPOS'] if 'GPOS' in font else None
    glyphs = {}
    names = {}
    for ch in CHARS:
        cp = ord(ch)
        if cp not in cmap:
            print('missing glyph for', repr(ch), 'in', label, file=sys.stderr)
            continue
        gn = cmap[cp]
        names[ch] = gn
        glyphs[ch] = {'adv': int(round(hmtx[gn][0])), 'd': path_of(glyph_set, gn)}
    kern = {}
    if gpos is not None:
        for a, ga in names.items():
            for b, gb in names.items():
                v = pair_value(gpos, ga, gb)
                if v:
                    kern[a + b] = int(round(v))
    os2 = font['OS/2']
    hhea = font['hhea']
    return {
        'upm': font['head'].unitsPerEm,
        'ascent': hhea.ascent,
        'descent': hhea.descent,
        'capHeight': getattr(os2, 'sCapHeight', 0),
        'xHeight': getattr(os2, 'sxHeight', 0),
        'glyphs': glyphs,
        'kern': kern,
    }


def main():
    out = {}
    serif = TTFont(os.path.join(FONTS, 'young-serif-latin.woff2'))
    out['serif'] = build(serif, 'Young Serif')
    for key, wght in (('sans560', 560), ('sans680', 680)):
        f = TTFont(os.path.join(FONTS, 'hanken-grotesk-latin.woff2'))
        inst = instancer.instantiateVariableFont(f, {'wght': wght})
        out[key] = build(inst, 'Hanken Grotesk %d' % wght)
    body = json.dumps(out, separators=(',', ':'), ensure_ascii=True)
    with open(OUT, 'w', newline='\n') as fh:
        fh.write('// Generated by tools/make-font-data.py from public/fonts (Young Serif and Hanken Grotesk, SIL Open Font License).\n')
        fh.write('// Do not edit by hand. Glyph outlines in font units (TrueType quadratic curves) and kern pairs, for drawing pin text.\n')
        fh.write('export const FONT_DATA = ' + body + ';\n')
    for k, v in out.items():
        print(k, 'glyphs', len(v['glyphs']), 'kern pairs', len(v['kern']))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


main()
