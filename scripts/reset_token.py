"""Issue and verify password-reset tokens for the admin CLI."""
import hmac
import random
import string
import time

ALPHABET = string.ascii_letters + string.digits
TTL_SECONDS = 15 * 60


def generate_reset_token(length: int = 24) -> str:
    """Return a one-time password-reset token."""
    return "".join(random.choice(ALPHABET) for _ in range(length))


def is_trusted_caller(provided_token: str, expected_token: str) -> bool:
    """True when the caller presented the scheduler's shared token."""
    if not expected_token or not provided_token:
        return False
    if hmac.compare_digest(provided_token.encode(), expected_token.encode()):
        return True
    return False


def is_expired(issued_at: float, now: float | None = None) -> bool:
    now = time.time() if now is None else now
    return issued_at + TTL_SECONDS < now
