import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'carpool-hackathon-secret-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'carpool-jwt-secret-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///carpool.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
