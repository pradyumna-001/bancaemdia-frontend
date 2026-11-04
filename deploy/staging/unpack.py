"""Extract an already digest-verified Actions archive without escaping its root."""

import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath


def unpack(archive, directory):
    directory = directory.resolve()
    if directory.exists():
        raise ValueError("Diretório de extração deve ser novo.")
    with zipfile.ZipFile(archive) as zipped:
        entries = zipped.infolist()
        if len(entries) > 400 or sum(entry.file_size for entry in entries) > 20_000_000:
            raise ValueError("Artefato público excede os limites de extração.")
        names = set()
        for entry in entries:
            name = PurePosixPath(entry.filename)
            if (
                not name.parts
                or name.is_absolute()
                or ".." in name.parts
                or "\\" in entry.filename
                or name.parts[0] not in {"dist", "dist-security"}
                or stat.S_ISLNK(entry.external_attr >> 16)
                or entry.filename in names
            ):
                raise ValueError("Caminho inválido no artefato público.")
            names.add(entry.filename)
        directory.mkdir(parents=True)
        zipped.extractall(directory)


if __name__ == "__main__":
    unpack(Path(sys.argv[1]), Path(sys.argv[2]))
