"""Promote only the frontend; never provision or modify the backend stack."""

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

SHA = re.compile(r"[0-9a-f]{40}")
IMAGE = re.compile(
    r"ghcr\.io/pradyumna-001/bancaemdia-(frontend|api)@sha256:[0-9a-f]{64}"
)
FIELDS = {
    "schema",
    "frontend_sha",
    "ci_run_id",
    "artifact_id",
    "artifact_digest",
    "origin",
    "issuer",
    "api_sha",
    "api_image",
    "config",
    "content_sha256",
    "frontend_image",
}


def validate(release):
    if set(release) != FIELDS or release["schema"] != 1:
        raise ValueError("Formato de release desconhecido.")
    for field in ("frontend_sha", "api_sha"):
        if not isinstance(release[field], str) or not SHA.fullmatch(release[field]):
            raise ValueError("Commit de release inválido.")
    for field, kind in (("frontend_image", "frontend"), ("api_image", "api")):
        match = IMAGE.fullmatch(release[field])
        if not match or match.group(1) != kind:
            raise ValueError("Release exige imagem correta por digest.")
    origin = urlsplit(release["origin"])
    if origin.scheme != "https" or origin.netloc != origin.hostname or origin.path:
        raise ValueError("Origem HTTPS de homologação inválida.")
    if release["config"] != {
        "VITE_API_URL": release["origin"],
        "VITE_APP_ENV": "staging",
        "VITE_UPLOAD_POLL_MS": 1000,
    }:
        raise ValueError("Configuração pública desconhecida ou divergente da origem.")
    return release


def write_json(path, value):
    temporary = path.with_suffix(".next")
    temporary.write_text(json.dumps(value, sort_keys=True, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(path)


def run(arguments):
    try:
        return subprocess.run(
            arguments, check=True, capture_output=True, text=True
        ).stdout.strip()
    except subprocess.CalledProcessError:
        # Command output can expose server configuration. Keep it out of public CI.
        raise RuntimeError(
            "Comando Docker falhou; verificar o host de homologação."
        ) from None


class Host:
    def __init__(self, root, command=run):
        self.root = root.resolve()
        self.command = command

    def read(self, name):
        path = self.root / name
        return json.loads(path.read_text()) if path.exists() else None

    def release(self, identifier):
        if not re.fullmatch(r"[0-9a-f]{40}-[0-9a-f]{12}", identifier):
            raise ValueError("Identificador de release inválido.")
        path = self.root / "releases" / identifier
        if not path.resolve().is_relative_to(self.root):
            raise ValueError("Release deve permanecer no diretório autorizado.")
        return path

    def activate(self, identifier):
        path = self.release(identifier)
        self.command(
            [
                "docker",
                "compose",
                "--project-name",
                "bancaemdia-frontend-staging",
                "--file",
                str(path / "compose.yml"),
                "--env-file",
                str(path / "compose.env"),
                "up",
                "-d",
                "--no-build",
                "--no-deps",
                "--wait",
                "--wait-timeout",
                "60",
                "frontend",
            ]
        )

    def restore(self, pending):
        if pending["previous"]:
            self.activate(pending["previous"]["release_id"])
        else:
            path = self.release(pending["candidate"]["release_id"])
            self.command(
                [
                    "docker",
                    "compose",
                    "--project-name",
                    "bancaemdia-frontend-staging",
                    "--file",
                    str(path / "compose.yml"),
                    "--env-file",
                    str(path / "compose.env"),
                    "stop",
                    "frontend",
                ]
            )
        (self.root / "pending.json").unlink()

    def apply(self, release, transaction):
        validate(release)
        if self.read("pending.json"):
            raise ValueError(
                "Há uma promoção pendente; concluir ou restaurar antes de continuar."
            )
        if not re.fullmatch(r"[1-9][0-9]*-[1-9][0-9]*", transaction):
            raise ValueError("Transação de deploy inválida.")
        api = self.command(
            [
                "docker",
                "ps",
                "--filter",
                "label=com.docker.compose.project=bancaemdia",
                "--filter",
                "label=com.docker.compose.service=api",
                "--format",
                "{{.ID}}",
            ]
        ).splitlines()
        if len(api) != 1 or not re.fullmatch(r"[0-9a-f]{12,64}", api[0]):
            raise ValueError("A stack autorizada da API não está disponível.")
        actual = self.command(
            ["docker", "inspect", "--format", "{{.Config.Image}}", api[0]]
        )
        if actual != release["api_image"]:
            raise ValueError("A imagem da API no host difere do pareamento aprovado.")
        self.command(["docker", "network", "inspect", "bancaemdia_edge"])
        self.command(["docker", "pull", release["frontend_image"]])
        revision = self.command(
            [
                "docker",
                "image",
                "inspect",
                "--format",
                '{{index .Config.Labels "org.opencontainers.image.revision"}}',
                release["frontend_image"],
            ]
        )
        if revision != release["frontend_sha"]:
            raise ValueError("Imagem frontend não corresponde ao SHA aprovado.")
        encoded = json.dumps(release, sort_keys=True).encode()
        identifier = (
            release["frontend_sha"] + "-" + hashlib.sha256(encoded).hexdigest()[:12]
        )
        directory = self.release(identifier)
        if directory.exists():
            if json.loads((directory / "release.json").read_text()) != release:
                raise ValueError("Release imutável já existe com conteúdo diferente.")
        else:
            directory.mkdir(parents=True)
            (directory / "compose.yml").write_bytes(
                (self.root / "compose.yml").read_bytes()
            )
            write_json(directory / "release.json", release)
            write_json(directory / "config.json", release["config"])
            (directory / "config.json").chmod(
                0o644
            )  # Public config; nginx runs as UID 101.
            (directory / "compose.env").write_text(
                f"FRONTEND_IMAGE={release['frontend_image']}\n"
                f"FRONTEND_CONFIG_FILE={directory / 'config.json'}\n"
            )
            (directory / "compose.env").chmod(0o600)
        pending = {
            "transaction": transaction,
            "candidate": {
                "release_id": identifier,
                "frontend_sha": release["frontend_sha"],
            },
            "previous": self.read("current.json"),
        }
        write_json(self.root / "pending.json", pending)
        try:
            self.activate(identifier)
        except Exception:
            self.restore(pending)
            raise

    def pending(self, transaction):
        pending = self.read("pending.json")
        if pending and pending["transaction"] != transaction:
            raise ValueError(
                "Outra transação está em andamento; não restaurar seu release."
            )
        return pending

    def abort(self, transaction):
        pending = self.pending(transaction)
        if pending:
            self.restore(pending)

    def commit(self, transaction):
        pending = self.pending(transaction)
        if not pending:
            raise ValueError("Nenhuma promoção pendente nesta transação.")
        write_json(self.root / "previous.json", pending["previous"])
        write_json(self.root / "current.json", pending["candidate"])
        (self.root / "pending.json").unlink()

    def rollback(self, expected_sha):
        current = self.read("current.json")
        previous = self.read("previous.json")
        if self.read("pending.json") or not current or not previous:
            raise ValueError(
                "Rollback exige release anterior e nenhuma promoção pendente."
            )
        if not SHA.fullmatch(expected_sha) or current["frontend_sha"] != expected_sha:
            raise ValueError(
                "O release atual mudou; confirmar novamente antes de restaurar."
            )
        try:
            self.activate(previous["release_id"])
        except Exception:
            self.activate(current["release_id"])
            raise
        write_json(self.root / "current.json", previous)
        write_json(self.root / "previous.json", current)


def main():
    import fcntl  # Linux host only; tests can import the state machine on Windows.

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["apply", "commit", "abort", "rollback"])
    parser.add_argument("transaction")
    parser.add_argument(
        "--root", type=Path, default=Path("/srv/bancaemdia-frontend/staging")
    )
    parser.add_argument("--release", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        raise ValueError("Diretório autorizado de homologação ainda não foi preparado.")
    with (root / "deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        host = Host(root)
        if args.operation == "apply":
            if not args.release or not args.release.resolve().is_relative_to(root):
                raise ValueError(
                    "Arquivo de release deve permanecer no diretório autorizado."
                )
            host.apply(json.loads(args.release.read_text()), args.transaction)
        else:
            getattr(host, args.operation)(args.transaction)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, TypeError, KeyError):
        print(
            "Deploy não concluído: verificar configuração, transação e estado do host."
        )
        raise SystemExit(1) from None
