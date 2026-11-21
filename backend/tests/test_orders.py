import pytest

def test_create_order(client, manager_token):
    res = client.post('/api/orders', json={
        'customer_name': 'Test Client Corp',
        'customer_email': 'test@clientcorp.com',
        'shipping_address': '500 Market St, Suite 200',
        'priority': 'HIGH',
        'items': [
            {'product_id': 1, 'quantity': 2}
        ]
    }, headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res.status_code == 201
    order = res.get_json()['order']
    assert order['customer_name'] == 'Test Client Corp'
    assert order['status'] == 'Order Created'
    assert order['priority'] == 'HIGH'
    assert len(order['items']) == 1

def test_order_insufficient_stock(client, manager_token):
    res = client.post('/api/orders', json={
        'customer_name': 'Greedy Client',
        'customer_email': 'greedy@client.com',
        'shipping_address': '100 Infinite Loop',
        'priority': 'NORMAL',
        'items': [
            {'product_id': 1, 'quantity': 999999}
        ]
    }, headers={
        'Authorization': f'Bearer {manager_token}'
    })
    assert res.status_code == 400
    assert 'Insufficient stock' in res.get_json()['error']

def test_order_hold_and_resume(client, manager_token):
    # Create order
    res = client.post('/api/orders', json={
        'customer_name': 'Hold Test Corp',
        'customer_email': 'hold@test.com',
        'shipping_address': '123 Pause St',
        'items': [{'product_id': 1, 'quantity': 1}]
    }, headers={'Authorization': f'Bearer {manager_token}'})
    order_id = res.get_json()['order']['id']

    # Hold
    res_hold = client.post(f'/api/orders/{order_id}/hold', json={'notes': 'Fraud verification'}, headers={'Authorization': f'Bearer {manager_token}'})
    assert res_hold.status_code == 200
    assert res_hold.get_json()['order']['status'] == 'On Hold'

    # Resume
    res_res = client.post(f'/api/orders/{order_id}/resume', headers={'Authorization': f'Bearer {manager_token}'})
    assert res_res.status_code == 200
    assert res_res.get_json()['order']['status'] != 'On Hold'
