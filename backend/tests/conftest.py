import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.utils.seed_data import seed_database
from config import TestConfig

@pytest.fixture(scope='session')
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        seed_database()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def manager_token(client):
    res = client.post('/api/auth/login', json={
        'username': 'manager',
        'password': 'Manager@123'
    })
    return res.get_json()['token']

@pytest.fixture
def picker_token(client):
    res = client.post('/api/auth/login', json={
        'username': 'picker',
        'password': 'Picker@123'
    })
    return res.get_json()['token']

@pytest.fixture
def packer_token(client):
    res = client.post('/api/auth/login', json={
        'username': 'packer',
        'password': 'Packer@123'
    })
    return res.get_json()['token']

@pytest.fixture
def dispatch_token(client):
    res = client.post('/api/auth/login', json={
        'username': 'dispatch',
        'password': 'Dispatch@123'
    })
    return res.get_json()['token']
