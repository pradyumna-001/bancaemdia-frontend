"""Owned TLS API for Coleta on a port the harness keeps reserved (#125).

58443 lies in the runner's ephemeral range. Binding it anew for each test could
fail when an outgoing connection had just taken it, so the harness reserves it
once per process (API #222, tests/identity/ports.py) and every TLS API receives
a duplicate of that listening socket. The API, its certificate check and the
Coleta requirement for TLS are unchanged.
"""

import socket
import subprocess
import sys
from pathlib import Path

PORT = 58443
UPSTREAM = f"https://127.0.0.1:{PORT}"


def serve(fd: int, certificate: str, key: str) -> None:
    import uvicorn

    listener = socket.socket(fileno=fd)
    # Raw access logging stays disabled for the sandbox subprocess too.
    config = uvicorn.Config(
        "bancaemdia.main:app",
        access_log=False,
        ssl_certfile=certificate,
        ssl_keyfile=key,
    )
    uvicorn.Server(config).run(sockets=[listener])


def spawn(backend, harness, public, private):
    listener = backend.ports.listener(PORT, harness.journal)
    try:
        process = subprocess.Popen(
            [
                sys.executable,
                str(Path(__file__).resolve()),
                str(listener.fileno()),
                str(public),
                str(private),
            ],
            cwd=harness.root,
            env=harness.env,
            pass_fds=(listener.fileno(),),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        # The child owns its copy; the reserved original stays with the harness.
        listener.close()
    harness.processes.append(process)
    harness.journal.record("tls.start", f"pid={process.pid} port={PORT}")
    return process


if __name__ == "__main__":
    serve(int(sys.argv[1]), sys.argv[2], sys.argv[3])
