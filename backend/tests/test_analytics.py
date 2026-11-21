import pytest

def test_analytics_summary(client, manager_token):
    res = client.get('/api/analytics/summary', headers={'Authorization': f'Bearer {manager_token}'})
    assert res.status_code == 200
    data = res.get_json()
    assert 'total_orders' in data
    assert 'avg_cycle_time_min' in data
    assert 'picking_accuracy' in data
    assert 'packing_accuracy' in data
    assert 'daily_dispatches' in data
    assert 'employee_performance' in data

def test_export_csv_orders(client, manager_token):
    res = client.get('/api/analytics/export/orders', headers={'Authorization': f'Bearer {manager_token}'})
    assert res.status_code == 200
    assert res.mimetype == 'text/csv'
    assert b'Order Number' in res.data
