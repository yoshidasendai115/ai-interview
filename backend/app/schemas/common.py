"""Common schemas used across the application."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Error detail for validation errors."""

    field: str
    message: str


class ErrorResponse(BaseModel):
    """RFC 7807 Problem Details error response."""

    type: str = Field(description="URI reference identifying the problem type")
    title: str = Field(description="Short, human-readable summary")
    status: int = Field(description="HTTP status code")
    detail: str = Field(description="Human-readable explanation")
    instance: str = Field(description="URI reference to the specific occurrence")
    errors: list[ErrorDetail] = Field(default_factory=list)

    model_config = {"json_schema_extra": {"example": {
        "type": "https://api.example.com/errors/validation",
        "title": "Validation Error",
        "status": 400,
        "detail": "リクエストパラメータが不正です。",
        "instance": "/api/v1/sessions",
        "errors": [{"field": "script_id", "message": "スクリプトIDは必須です。"}],
    }}}


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""

    items: list[T]
    total: int
    limit: int
    offset: int

    @property
    def has_more(self) -> bool:
        """Check if there are more items to fetch."""
        return self.offset + len(self.items) < self.total


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str
    environment: str
