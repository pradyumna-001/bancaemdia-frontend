"""Own disposable test listeners/processes even when bootstrap never yields."""

import asyncio
import subprocess
from contextlib import asynccontextmanager
from threading import Event


@asynccontextmanager
async def owned_runtime(backend, frontend, monkeypatch):
    servers, instances = [], []
    original_harness = backend.Harness
    original_issuer = backend.serve_issuer

    class OwnedHarness(original_harness):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            instances.append(self)

    def owned(factory):
        def create(*args, **kwargs):
            server = factory(*args, **kwargs)
            running = Event()
            serve = server.serve_forever

            def run(*args, **kwargs):
                running.set()
                try:
                    serve(*args, **kwargs)
                finally:
                    running.clear()

            server.serve_forever = run
            # Join request handlers before a subsequent tenant uses these ports.
            server.daemon_threads = False
            servers.append((server, running))
            return server

        return create

    monkeypatch.setattr(backend, "Harness", OwnedHarness)
    monkeypatch.setattr(backend, "serve_issuer", owned(original_issuer))
    monkeypatch.setattr(backend, "serve_frontend", owned(frontend))
    try:
        yield
    finally:
        try:
            for instance in instances:
                for process in instance.processes:
                    if process.poll() is None:
                        process.terminate()
                        try:
                            await asyncio.to_thread(process.wait, 15)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            await asyncio.to_thread(process.wait, 15)
        finally:
            for server, running in servers:
                # shutdown() deadlocks for a bound server whose thread never ran.
                if running.is_set():
                    await asyncio.to_thread(server.shutdown)
                await asyncio.to_thread(server.server_close)
