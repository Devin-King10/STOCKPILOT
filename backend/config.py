import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'stockpilot-super-secure-production-key-9920')
    JWT_SECRET = os.getenv('JWT_SECRET', 'stockpilot-jwt-token-secret-key-3341')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    
    # Flexible database configuration: supports SQLite, PostgreSQL, MongoDB connection strings
    # PostgreSQL standard: postgresql://user:password@localhost:5432/dbname
    DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'stockpilot.db')}")
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
        
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() in ('true', '1')
    
    # Allowed CORS Origins for Vercel and local dev
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_EXPIRATION_HOURS = 2
