import pytest

def test_get_products(client, manager_token):
    res = client.get('/api/inventory/products', headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'products' in data
    assert len(data['products']) > 0

def test_create_and_delete_product(client, manager_token):
    sku = 'TEST-PROD-999'
    barcode = '888800009999'
    res = client.post('/api/inventory/products', json={
        'name': 'Test Heavy Duty Flashlight',
        'sku': sku,
        'barcode': barcode,
        'category': 'Tools',
        'available_qty': 25,
        'min_stock_level': 5,
        'unit_price': 19.99
    }, headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res.status_code == 201
    prod_data = res.get_json()['product']
    prod_id = prod_data['id']

    # Adjust stock
    res_adj = client.post(f'/api/inventory/products/{prod_id}/adjust-stock', json={
        'transaction_type': 'IN',
        'quantity': 10,
        'notes': 'Test intake'
    }, headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res_adj.status_code == 200
    assert res_adj.get_json()['product']['available_qty'] == 35

    # Delete product
    res_del = client.delete(f'/api/inventory/products/{prod_id}', headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res_del.status_code == 200

def test_lookup_barcode(client, manager_token):
    # Lookup existing seeded barcode
    res = client.post('/api/inventory/lookup-barcode', json={
        'barcode': '890123400101'
    }, headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res.status_code == 200
    assert res.get_json()['product']['sku'] == 'EL-HD-001'

    # Lookup non-existent barcode
    res_bad = client.post('/api/inventory/lookup-barcode', json={
        'barcode': '000000000000'
    }, headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res_bad.status_code == 404
