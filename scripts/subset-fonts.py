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
RANGES = "U+0000-024F,U+2000-206F,U+20A0-20CF,U+2190-22FF"
SOURCES = {
    "regular": "63de0da0cc05298e2e9c6e5cef506d8454ca665f6e668a99d94f51174b9256ed",
    "semibold": "c248b0a178c362916db7c853ed640db77f184d19a0ed9fa5591fa707d3089635",
    "bold": "12954097ebbad6749ee1c81a143d555c263420115892211529fe6f51794b8439",
}


def main():
    reports = []
    for style, expected in SOURCES.items():
        source = ROOT / f"source-sans-3-{style}.woff2"
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
        font = TTFont(source, recalcTimestamp=False)
        options = subset.Options()
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        worker = subset.Subsetter(options)
        worker.populate(unicodes=subset.parse_unicodes(RANGES))
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
        target = ROOT / f"bancaemdia-interface-{style}-latin.woff2"
        font.flavor = "woff2"
        font.save(target)
        # The subset must preserve the original glyph outlines and advances.
        with TTFont(source) as full, TTFont(target) as small:
            assert small["head"].unitsPerEm == full["head"].unitsPerEm
            for tag in ("GSUB", "GPOS"):
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
