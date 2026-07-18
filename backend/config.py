import os
from pathlib import Path


def load_local_env():
    """Load simple KEY=VALUE pairs for local development.

    Production deployments should provide real environment variables. This
    keeps `python app.py` convenient without adding a dependency just for the
    local test setup.
    """
    env_path = Path(__file__).with_name('.env')
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'carpool-hackathon-secret-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'carpool-jwt-secret-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///carpool.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
