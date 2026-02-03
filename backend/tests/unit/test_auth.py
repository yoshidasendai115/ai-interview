"""Unit tests for authentication."""

import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_hash_password(self):
        """Test password hashing."""
        password = "mysecretpassword"
        hashed = get_password_hash(password)

        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "mysecretpassword"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "mysecretpassword"
        hashed = get_password_hash(password)

        assert verify_password("wrongpassword", hashed) is False


class TestJWTTokens:
    """Tests for JWT token functions."""

    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)

        assert token is not None
        assert len(token) > 0

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "user123"}
        token = create_refresh_token(data)

        assert token is not None
        assert len(token) > 0

    def test_verify_access_token(self):
        """Test access token verification."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)

        payload = verify_token(token, token_type="access")

        assert payload is not None
        assert payload.get("sub") == "user123"
        assert payload.get("type") == "access"

    def test_verify_refresh_token(self):
        """Test refresh token verification."""
        data = {"sub": "user123"}
        token = create_refresh_token(data)

        payload = verify_token(token, token_type="refresh")

        assert payload is not None
        assert payload.get("sub") == "user123"
        assert payload.get("type") == "refresh"

    def test_verify_token_wrong_type(self):
        """Test token verification with wrong type."""
        data = {"sub": "user123"}
        token = create_access_token(data)

        # Try to verify access token as refresh token
        payload = verify_token(token, token_type="refresh")

        assert payload is None

    def test_verify_invalid_token(self):
        """Test verification of invalid token."""
        payload = verify_token("invalid-token", token_type="access")

        assert payload is None
