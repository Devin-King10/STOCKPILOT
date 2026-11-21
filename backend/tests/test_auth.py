import pytest

def test_login_success(client):
    res = client.post('/api/auth/login', json={
        'username': 'manager',
        'password': 'Manager@123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'token' in data
    assert data['user']['username'] == 'manager'
    assert data['user']['role'] == 'manager'

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        'username': 'manager',
        'password': 'WrongPassword99'
    })
    assert res.status_code == 401
    assert 'error' in res.get_json()

def test_get_current_user_me(client, manager_token):
    res = client.get('/api/auth/me', headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['user']['username'] == 'manager'

def test_token_missing(client):
    res = client.get('/api/auth/me')
    assert res.status_code == 401

def test_role_based_permissions(client, picker_token):
    # Picker trying to create a product (only manager role allowed)
    res = client.post('/api/inventory/products', json={
        'name': 'Unauthorized Test Gadget',
        'sku': 'UNAUTH-001',
        'barcode': '999999999001',
        'category': 'Electronics',
        'available_qty': 10
    }, headers={
        'Authorization': f'Bearer {picker_token}'
    })
    assert res.status_code == 403
