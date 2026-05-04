import os
import pytest
from fastapi.testclient import TestClient

# Configurar entorno antes de importar la app
os.environ["LOCAL_ONLY"] = "true"
os.environ["SECRET_KEY"] = "ci-test-secret-key-not-for-production"
os.environ["GCS_BUCKET"] = "test-bucket"
os.environ["DB_BLOB"] = "test.db"
os.environ["DB_LOCAL_CACHE_DIR"] = "/tmp"
os.environ["APP_ENV"] = "development"

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
