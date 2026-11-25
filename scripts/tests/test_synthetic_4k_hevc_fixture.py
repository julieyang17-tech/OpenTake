"""Probe a labeled synthetic 4K HEVC file made by the local ffmpeg.

This is a codec fixture only. It is not an OpenTake timeline import, preview,
save, or GPU export.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
import unittest


LABEL = "OPENTAKE_SYNTHETIC_4K_HEVC_NOT_USER_MEDIA"


def ffmpeg_has_libx265() -> bool:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return False
    output = subprocess.check_output([ffmpeg, "-hide_banner", "-encoders"], text=True)
    return "libx265" in output


class Synthetic4kHevcFixtureTests(unittest.TestCase):
    def test_local_ffmpeg_encodes_and_decodes_labeled_4k_hevc(self) -> None:
        if not ffmpeg_has_libx265() or shutil.which("ffprobe") is None:
            self.skipTest("local ffmpeg libx265 or ffprobe is unavailable")
        with tempfile.TemporaryDirectory(prefix="opentake-synthetic-4k-") as directory:
            output = Path(directory) / f"{LABEL}.mp4"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "testsrc2=size=3840x2160:rate=30",
                    "-frames:v",
                    "8",
                    "-c:v",
                    "libx265",
                    "-preset",
                    "ultrafast",
                    "-pix_fmt",
                    "yuv420p",
                    "-tag:v",
                    "hvc1",
                    "-metadata",
                    f"title={LABEL}",
                    "-metadata",
                    "comment=Synthetic color bars. Not user footage. Not an OpenTake export.",
                    str(output),
                ],
                check=True,
            )
            probe = json.loads(
                subprocess.check_output(
                    [
                        "ffprobe",
                        "-hide_banner",
                        "-v",
                        "error",
                        "-show_entries",
                        "stream=codec_name,width,height:format_tags=title",
                        "-of",
                        "json",
                        str(output),
                    ],
                    text=True,
                )
            )
            video = next(stream for stream in probe["streams"] if stream.get("codec_name"))
            self.assertEqual(video["codec_name"], "hevc")
            self.assertEqual(video["width"], 3840)
            self.assertEqual(video["height"], 2160)
            self.assertEqual(probe["format"]["tags"]["title"], LABEL)
            subprocess.run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-v",
                    "error",
                    "-i",
                    str(output),
                    "-frames:v",
                    "1",
                    "-f",
                    "null",
                    "-",
                ],
                check=True,
            )


if __name__ == "__main__":
    unittest.main()
