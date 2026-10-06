"""Control-plane tests only: no real host, account, session or public deployment."""

import importlib.util
import stat
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def module(name):
    spec = importlib.util.spec_from_file_location(
        name, ROOT / "deploy" / "staging" / f"{name}.py"
    )
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


host = module("host")
unpack = module("unpack")


def release(letter="a"):
    return {
        "schema": 1,
        "frontend_sha": letter * 40,
        "api_sha": "b" * 40,
        "ci_run_id": 1,
        "artifact_id": 2,
        "artifact_digest": "sha256:" + "c" * 64,
        "content_sha256": "d" * 64,
        "frontend_image": "ghcr.io/pradyumna-001/bancaemdia-frontend@sha256:"
        + letter * 64,
        "api_image": "ghcr.io/pradyumna-001/bancaemdia-api@sha256:" + "b" * 64,
        "origin": "https://app.unit-fixture.org",
        "issuer": "https://issuer.unit-fixture.org/realm",
        "config": {
            "VITE_API_URL": "https://app.unit-fixture.org",
            "VITE_APP_ENV": "staging",
            "VITE_UPLOAD_POLL_MS": 1000,
        },
    }


class Commands:
    def __init__(self):
        self.calls = []
        self.fail_pull = False
        self.fail_up = 0
        self.api_image = release()["api_image"]

    def __call__(self, args):
        self.calls.append(args)
        if args[:2] == ["docker", "ps"]:
            return "a" * 12
        if args[:2] == ["docker", "inspect"]:
            return self.api_image
        if args[:3] == ["docker", "image", "inspect"]:
            return args[-1].split(":")[-1][:40]
        if "pull" in args and self.fail_pull:
            raise RuntimeError("Controlled pull failure")
        if "up" in args and self.fail_up:
            self.fail_up -= 1
            raise RuntimeError("Controlled partial activation")
        return ""


class HostTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="staging-host-test-")
        self.root = Path(self.directory.name)
        (self.root / "compose.yml").write_text("controlled Compose definition\n")
        self.commands = Commands()
        self.host = host.Host(self.root, self.commands)

    def tearDown(self):
        self.directory.cleanup()

    def install(self):
        self.host.apply(release(), "1-1")
        self.host.commit("1-1")
        return self.host.read("current.json")

    def test_commit_requires_pending_transaction(self):
        with self.assertRaises(ValueError):
            self.host.commit("1-1")
        self.host.apply(release(), "1-1")
        self.assertIsNone(self.host.read("current.json"))
        self.host.commit("1-1")
        self.assertEqual(self.host.read("current.json")["frontend_sha"], "a" * 40)

    def test_pull_failure_preserves_installed_release(self):
        current = self.install()
        self.commands.fail_pull = True
        with self.assertRaises(RuntimeError):
            self.host.apply(release("c"), "2-1")
        self.assertEqual(self.host.read("current.json"), current)
        self.assertIsNone(self.host.read("pending.json"))

    def test_partial_up_restores_exact_previous_config(self):
        current = self.install()
        path = self.host.release(current["release_id"]) / "compose.env"
        before = path.read_bytes()
        self.commands.fail_up = 1
        with self.assertRaises(RuntimeError):
            self.host.apply(release("c"), "2-1")
        self.assertEqual(self.host.read("current.json"), current)
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(
            self.commands.calls[-1][self.commands.calls[-1].index("--env-file") + 1],
            str(path),
        )
        self.assertIsNone(self.host.read("pending.json"))

    def test_first_failure_stops_candidate_without_inventing_previous_release(self):
        self.commands.fail_up = 1
        with self.assertRaises(RuntimeError):
            self.host.apply(release(), "1-1")
        self.assertIn("stop", self.commands.calls[-1])
        self.assertIsNone(self.host.read("current.json"))

    def test_smoke_failure_can_abort_and_restore(self):
        current = self.install()
        self.host.apply(release("c"), "2-1")
        self.host.abort("2-1")
        self.assertEqual(self.host.read("current.json"), current)
        self.assertIsNone(self.host.read("pending.json"))

    def test_concurrent_transaction_cannot_overwrite_or_rollback_candidate(self):
        self.host.apply(release(), "1-1")
        for action in (
            lambda: self.host.apply(release("c"), "2-1"),
            lambda: self.host.abort("2-1"),
            lambda: self.host.commit("2-1"),
        ):
            with self.assertRaises(ValueError):
                action()
        self.assertEqual(self.host.read("pending.json")["transaction"], "1-1")

    def test_failed_restore_keeps_pending_recovery_evidence(self):
        self.install()
        self.commands.fail_up = 2
        with self.assertRaises(RuntimeError):
            self.host.apply(release("c"), "2-1")
        self.assertIsNotNone(self.host.read("pending.json"))

    def test_backend_mismatch_does_not_mutate_frontend(self):
        self.commands.api_image = "other-image"
        with self.assertRaises(ValueError):
            self.host.apply(release(), "1-1")
        self.assertFalse(any("pull" in args for args in self.commands.calls))

    def test_runtime_secret_is_rejected_before_docker(self):
        invalid = release()
        invalid["config"]["TOKEN"] = "not-a-real-secret"
        with self.assertRaises(ValueError):
            self.host.apply(invalid, "1-1")
        self.assertEqual(self.commands.calls, [])

    def test_explicit_rollback_refuses_changed_current_and_restores_previous(self):
        previous = self.install()
        self.host.apply(release("c"), "2-1")
        self.host.commit("2-1")
        with self.assertRaises(ValueError):
            self.host.rollback("a" * 40)
        self.host.rollback("c" * 40)
        self.assertEqual(self.host.read("current.json"), previous)


class UnpackTests(unittest.TestCase):
    def test_escape_symlink_and_foreign_root_are_rejected_before_write(self):
        with tempfile.TemporaryDirectory(prefix="staging-zip-test-") as temp:
            root = Path(temp)
            for index, name in enumerate(
                (
                    "../outside",
                    "/absolute",
                    "tests/fixture",
                    "dist/../../outside",
                    "dist\\..\\outside",
                )
            ):
                archive = root / f"{index}.zip"
                with zipfile.ZipFile(archive, "w") as zipped:
                    zipped.writestr(name, "controlled content")
                target = root / f"output-{index}"
                with self.assertRaises(ValueError):
                    unpack.unpack(archive, target)
                self.assertFalse(target.exists())
            archive = root / "symlink.zip"
            with zipfile.ZipFile(archive, "w") as zipped:
                entry = zipfile.ZipInfo("dist/linked")
                entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                zipped.writestr(entry, "../outside")
            with self.assertRaises(ValueError):
                unpack.unpack(archive, root / "symlink-output")

    def test_valid_artifact_extracted_without_rebuilding(self):
        with tempfile.TemporaryDirectory(prefix="staging-zip-test-") as temp:
            root = Path(temp)
            archive = root / "build.zip"
            with zipfile.ZipFile(archive, "w") as zipped:
                zipped.writestr("dist/index.html", "approved bytes")
                zipped.writestr("dist-security/default.conf", "approved CSP")
            unpack.unpack(archive, root / "output")
            self.assertEqual(
                (root / "output/dist/index.html").read_text(), "approved bytes"
            )


if __name__ == "__main__":
    unittest.main()
