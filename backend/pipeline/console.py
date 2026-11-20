"""Console output helpers shared by the pipeline scripts.

One copy of what five scripts used to carry each (2026-11-20).
"""
import sys


def force_utf8_output() -> None:
    """Make stdout/stderr safe for non-ASCII, on every platform.

    The pipeline prints Arabic product names and other non-ASCII text. A
    Windows console defaults to a legacy code page (cp1252 here) which cannot
    encode them, so `print` raised UnicodeEncodeError and killed the process,
    after a successful fetch and transform: a working run reported itself as a
    crash, purely because of the terminal it happened to be printing to.

    Reconfiguring to UTF-8 writes correct bytes wherever the terminal supports
    it (Windows Terminal, any modern shell, CI). `errors="replace"` is the
    backstop for a genuinely legacy console: characters degrade to '?' instead
    of taking the whole job down. Data written to disk is unaffected either way:
    every writer specifies its own encoding.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass
