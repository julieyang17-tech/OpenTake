"""Guard the fork-only ad-hoc Mac test bundle workflow.

The workflow must stay manual, unsigned by Apple, and unable to publish a Release.
"""

from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "mac-adhoc-test-bundle.yml"


class MacAdhocTestBundleWorkflowTests(unittest.TestCase):
    def test_workflow_is_manual_and_does_not_publish(self) -> None:
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", text)
        self.assertNotIn("pull_request:", text)
        self.assertNotIn("push:", text)
        self.assertNotIn("secrets.", text)
        self.assertNotIn("gh release", text)
        self.assertNotIn("softprops/action-gh-release", text)
        self.assertIn("runs-on: macos-14", text)
        self.assertIn('github.repository == \'julieyang17-tech/OpenTake\'', text)
        self.assertIn('"createUpdaterArtifacts":false', text)
        self.assertIn('"signingIdentity":"-"', text)
        self.assertIn("--bundles app,dmg", text)
        self.assertIn("actions/upload-artifact@", text)
        self.assertIn("retention-days: 14", text)
        self.assertNotIn("TAURI_SIGNING_PRIVATE_KEY", text)
        self.assertNotIn("Developer ID", text)


if __name__ == "__main__":
    unittest.main()
