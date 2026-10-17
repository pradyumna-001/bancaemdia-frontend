"""Real socket lifecycle under failed bootstrap; no API/auth response is mocked."""

import asyncio
import importlib.util
import socket
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from types import SimpleNamespace
from urllib.request import urlopen

import pytest

_spec = importlib.util.spec_from_file_location(
    "owned_test_runtime", Path(__file__).with_name("harness_resources.py")
)
runtime = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(runtime)


@pytest.mark.asyncio
@pytest.mark.parametrize("started", [False, True])
async def test_failed_bootstrap_releases_owned_ports_and_process(monkeypatch, started):
    class Process:
        terminated = False

        def poll(self):
            return 0 if self.terminated else None

        def terminate(self):
            self.terminated = True

        def wait(self, _timeout):
            return 0

    process = Process()

    class Harness:
        def __init__(self):
            self.processes = [process]

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            self.send_response(200)
            self.end_headers()

    def server():
        return ThreadingHTTPServer(("127.0.0.1", 0), Handler)

    def check_live(listener):
        with urlopen(f"http://127.0.0.1:{listener.server_port}", timeout=2) as response:
            assert response.status == 200

    backend = SimpleNamespace(
        Harness=Harness, serve_issuer=server, serve_frontend=server
    )
    listeners, threads = [], []
    with pytest.raises(RuntimeError, match="bootstrap refused"):
        async with runtime.owned_runtime(backend, server, monkeypatch):
            backend.Harness()
            listeners = [backend.serve_issuer(), backend.serve_frontend()]
            if started:
                for listener in listeners:
                    thread = Thread(target=listener.serve_forever, daemon=True)
                    threads.append(thread)
                    thread.start()
                    await asyncio.to_thread(check_live, listener)
            raise RuntimeError("bootstrap refused")
    assert process.terminated
    for listener in listeners:
        assert listener.socket.fileno() == -1
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            probe.bind(listener.server_address)
    for thread in threads:
        thread.join(2)
        assert not thread.is_alive()


@pytest.mark.asyncio
async def test_stuck_owned_process_is_killed_without_suppressing_failure(monkeypatch):
    class Process:
        killed = False

        def poll(self):
            return 0 if self.killed else None

        def terminate(self):
            pass

        def kill(self):
            self.killed = True

        def wait(self, timeout):
            if not self.killed:
                raise subprocess.TimeoutExpired("owned", timeout)
            return 0

    process = Process()

    class Harness:
        def __init__(self):
            self.processes = [process]

    backend = SimpleNamespace(
        Harness=Harness, serve_issuer=lambda: None, serve_frontend=lambda: None
    )
    with pytest.raises(RuntimeError, match="bootstrap refused"):
        async with runtime.owned_runtime(backend, lambda: None, monkeypatch):
            backend.Harness()
            raise RuntimeError("bootstrap refused")
    assert process.killed
