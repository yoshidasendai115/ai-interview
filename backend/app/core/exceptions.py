"""Custom exceptions and error handling."""

from typing import Any


class AppException(Exception):
    """Base exception for the application."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_type: str = "internal_error",
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.details = details or {}
        super().__init__(message)


class AuthenticationError(AppException):
    """Raised when authentication fails."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=401,
            error_type="authentication_error",
            details=details,
        )


class AuthorizationError(AppException):
    """Raised when authorization fails."""

    def __init__(
        self,
        message: str = "Permission denied",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=403,
            error_type="authorization_error",
            details=details,
        )


class NotFoundError(AppException):
    """Raised when a resource is not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: str = "resource",
        resource_id: str | None = None,
    ) -> None:
        details = {"resource_type": resource_type}
        if resource_id:
            details["resource_id"] = resource_id
        super().__init__(
            message=message,
            status_code=404,
            error_type="not_found",
            details=details,
        )


class ValidationError(AppException):
    """Raised when request validation fails."""

    def __init__(
        self,
        message: str = "Validation error",
        errors: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=400,
            error_type="validation_error",
            details={"errors": errors or []},
        )


class ConflictError(AppException):
    """Raised when there's a resource conflict."""

    def __init__(
        self,
        message: str = "Resource conflict",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=409,
            error_type="conflict",
            details=details,
        )


class RateLimitError(AppException):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int | None = None,
    ) -> None:
        details: dict[str, Any] = {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(
            message=message,
            status_code=429,
            error_type="rate_limit",
            details=details,
        )


class ExternalServiceError(AppException):
    """Raised when an external service call fails."""

    def __init__(
        self,
        message: str = "External service error",
        service_name: str = "unknown",
        details: dict[str, Any] | None = None,
    ) -> None:
        full_details = {"service": service_name}
        if details:
            full_details.update(details)
        super().__init__(
            message=message,
            status_code=502,
            error_type="external_service_error",
            details=full_details,
        )
