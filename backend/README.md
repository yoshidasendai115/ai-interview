# AI Interview Practice Platform - Backend

FastAPI backend for the AI Interview Practice Platform.

## Requirements

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

## Setup

### 1. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -e ".[dev]"
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Run development server

```bash
uvicorn app.main:app --reload
```

Or:

```bash
python -m app.main
```

## API Documentation

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Project Structure

```
backend/
├── alembic/              # Database migrations
├── app/
│   ├── api/              # API routes
│   │   └── routes/       # Endpoint definitions
│   ├── core/             # Configuration, security, dependencies
│   ├── db/               # Database setup
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── main.py           # Application entry point
├── tests/                # Test files
├── alembic.ini           # Alembic configuration
├── pyproject.toml        # Project configuration
└── README.md
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/unit/test_auth.py
```

## Code Quality

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type check
mypy app
```

## Database Migrations

```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/sso/callback` - SSO callback
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Sessions

- `POST /api/v1/sessions` - Start session
- `GET /api/v1/sessions/{id}` - Get session
- `POST /api/v1/sessions/{id}/answers` - Submit answer
- `PUT /api/v1/sessions/{id}/complete` - Complete session

### Evaluations

- `GET /api/v1/evaluations/{session_id}` - Get evaluation
- `GET /api/v1/evaluations/summary` - Get summary

### Admin

- `POST /api/v1/admin/auth/login` - Admin login
- `GET /api/v1/admin/questions` - List questions
- `POST /api/v1/admin/questions` - Create question
- `PUT /api/v1/admin/questions/{id}` - Update question
- `DELETE /api/v1/admin/questions/{id}` - Delete question
