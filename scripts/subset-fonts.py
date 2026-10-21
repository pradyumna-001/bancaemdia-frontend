"""Reproduce OFL web subsets; keep complete originals as Unicode fallback.

python -m pip install -r scripts/font-requirements.txt
python scripts/subset-fonts.py
"""

import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1] / "public/fontes"
RANGES = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20A0-20CF,U+2122,U+2190-2199,U+2212,U+2215,U+221A,U+221E,U+2264-2265,U+FEFF,U+FFFD"
# Preloaded part: Portuguese text, interface punctuation, spaces and the arrows
# the interface writes. The rest of RANGES is a second file that the browser
# requests only when a page shows one of those characters (unicode-range).
CORE = "U+0000-00FF,U+2000-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2028-202F,U+205F-206F,U+20AC,U+2190,U+2192,U+2212,U+FEFF"


def css_ranges(points):
    """Compact U+ ranges for CSS unicode-range, in ascending order."""
    points = sorted(points)
    ranges, start = [], None
    for i, point in enumerate(points):
        if start is None:
            start = point
        if i + 1 == len(points) or points[i + 1] != point + 1:
            ranges.append(
                f"U+{start:04X}" if start == point else f"U+{start:04X}-{point:04X}"
            )
            start = None
    return ",".join(ranges)


PARTS = {
    "latin": CORE,
    "latin-complemento": css_ranges(
        set(subset.parse_unicodes(RANGES)) - set(subset.parse_unicodes(CORE))
    ),
}
assert set(subset.parse_unicodes(CORE)) <= set(subset.parse_unicodes(RANGES))
SOURCES = {
    "regular": "63de0da0cc05298e2e9c6e5cef506d8454ca665f6e668a99d94f51174b9256ed",
    "semibold": "c248b0a178c362916db7c853ed640db77f184d19a0ed9fa5591fa707d3089635",
    "bold": "12954097ebbad6749ee1c81a143d555c263420115892211529fe6f51794b8439",
}


def main():
    reports = []
    for (style, expected), (part, ranges) in (
        (source, part) for source in SOURCES.items() for part in PARTS.items()
    ):
        source = ROOT / f"source-sans-3-{style}.woff2"
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
        font = TTFont(source, recalcTimestamp=False)
        options = subset.Options()
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        # Inline CFF subroutines: identical outlines and hints, smaller WOFF2.
        options.desubroutinize = True
        worker = subset.Subsetter(options)
        worker.populate(unicodes=subset.parse_unicodes(ranges))
        worker.subset(font)
        # Source is a Reserved Font Name. Rename the modified font internally;
        # copyright/license/trademark fields and complete originals are retained.
        family = "Bancaemdia Interface"
        face = style.title()
        postscript = "BancaemdiaInterface-" + face
        names = {
            1: family,
            2: face,
            3: postscript,
            4: family + " " + face,
            6: postscript,
            16: family,
            17: face,
            18: family + " " + face,
        }
        for record in font["name"].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        if "CFF " in font:
            cff = font["CFF "].cff
            cff.fontNames = [postscript]
            cff.topDictIndex[0].FamilyName = family
            cff.topDictIndex[0].FullName = family + " " + face
        target = ROOT / f"bancaemdia-interface-{style}-{part}.woff2"
        font.flavor = "woff2"
        font.save(target)
        # The subset must preserve the original glyph outlines and advances.
        with TTFont(source) as full, TTFont(target) as small:
            assert small["head"].unitsPerEm == full["head"].unitsPerEm
            # Digits and Latin text live in the preloaded part with their features.
            for tag in ("GSUB", "GPOS") if part == "latin" else ():
                if tag in full and tag in small:
                    original_features = {
                        r.FeatureTag for r in full[tag].table.FeatureList.FeatureRecord
                    }
                    subset_features = {
                        r.FeatureTag for r in small[tag].table.FeatureList.FeatureRecord
                    }
                    assert (
                        original_features & {"tnum", "lnum", "kern"} <= subset_features
                    )
            complete_glyphs, subset_glyphs = full.getGlyphSet(), small.getGlyphSet()
            for point, glyph in small.getBestCmap().items():
                original = full.getBestCmap()[point]
                assert small["hmtx"][glyph] == full["hmtx"][original]
                before, after = (
                    DecomposingRecordingPen(complete_glyphs),
                    DecomposingRecordingPen(subset_glyphs),
                )
                complete_glyphs[original].draw(before)
                subset_glyphs[glyph].draw(after)
                assert before.value == after.value
        reports.append(
            {
                "file": target.name,
                "unicode_range": ranges,
                "source_sha256": expected,
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                "bytes": target.stat().st_size,
            }
        )
    (ROOT / "subsets.json").write_text(
        json.dumps(
            {
                "unicode_range": RANGES,
                "internal_family": "Bancaemdia Interface",
                "fonts": reports,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
