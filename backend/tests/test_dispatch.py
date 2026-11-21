import pytest
import random

def test_dispatch_flow(client, dispatch_token):
    # Get ready for dispatch orders
    res = client.get('/api/dispatch?tab=ready', headers={'Authorization': f'Bearer {dispatch_token}'})
    assert res.status_code == 200
    orders = res.get_json()['orders']
    assert len(orders) > 0
    target_order = orders[0]

    unique_tracking = f"TEST-TRK-{random.randint(1000000, 9999999)}"

    # Confirm dispatch
    res_confirm = client.post('/api/dispatch/confirm', json={
        'order_id': target_order['id'],
        'courier_name': 'DHL Express Air',
        'tracking_number': unique_tracking,
        'shipment_type': 'Express',
        'shipping_cost': 22.0
    }, headers={'Authorization': f'Bearer {dispatch_token}'})
    assert res_confirm.status_code == 200
    assert res_confirm.get_json()['dispatch']['tracking_number'] == unique_tracking

    # Check printable summary
    res_summary = client.get(f"/api/dispatch/summary/{target_order['id']}", headers={'Authorization': f'Bearer {dispatch_token}'})
    assert res_summary.status_code == 200
    summary = res_summary.get_json()['summary']
    assert summary['courier_name'] == 'DHL Express Air'
    assert summary['tracking_number'] == unique_tracking
