import os
from pathlib import Path


# Load KEY=VALUE pairs from the local .env file (no dotenv dependency needed).
_env_file = Path(__file__).with_name('.env')
if _env_file.exists():
    for _line in _env_file.read_text(encoding='utf-8').splitlines():
        if '=' in _line and not _line.strip().startswith('#'):
            _key, _value = _line.split('=', 1)
            os.environ.setdefault(_key.strip(), _value.strip().strip('"').strip("'"))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'carpool-hackathon-secret-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'carpool-jwt-secret-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///carpool.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
