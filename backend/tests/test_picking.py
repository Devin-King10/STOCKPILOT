import pytest

def test_picking_barcode_validation(client, picker_token):
    # Fetch picking tasks
    res = client.get('/api/picking/tasks?all=true', headers={
        'Authorization': f'Bearer {picker_token}'
    })
    assert res.status_code == 200
    tasks = res.get_json()['tasks']
    pending_task = next((t for t in tasks if t['status'] in ('PENDING', 'IN_PROGRESS')), None)
    assert pending_task is not None

    task_id = pending_task['id']
    item = pending_task['items'][0]
    item_id = item['id']
    expected_barcode = item['barcode']

    # Test invalid barcode scan
    res_bad = client.post(f'/api/picking/tasks/{task_id}/verify-barcode', json={
        'picking_item_id': item_id,
        'barcode': 'INVALID_BARCODE_123'
    }, headers={'Authorization': f'Bearer {picker_token}'})
    assert res_bad.status_code == 400
    assert res_bad.get_json()['valid'] is False

    # Test valid barcode scan
    res_good = client.post(f'/api/picking/tasks/{task_id}/verify-barcode', json={
        'picking_item_id': item_id,
        'barcode': expected_barcode
    }, headers={'Authorization': f'Bearer {picker_token}'})
    assert res_good.status_code == 200
    assert res_good.get_json()['valid'] is True

def test_picking_quantity_validation(client, picker_token):
    res = client.get('/api/picking/tasks?all=true', headers={'Authorization': f'Bearer {picker_token}'})
    pending_task = next((t for t in res.get_json()['tasks'] if t['status'] in ('PENDING', 'IN_PROGRESS')), None)
    assert pending_task is not None

    task_id = pending_task['id']
    item = pending_task['items'][0]
    item_id = item['id']

    # Picking more than ordered quantity should fail
    res_over = client.post(f'/api/picking/tasks/{task_id}/confirm-item', json={
        'picking_item_id': item_id,
        'picked_qty': item['required_qty'] + 999,
        'barcode_scanned': item['barcode']
    }, headers={'Authorization': f'Bearer {picker_token}'})
    assert res_over.status_code == 400
    assert 'Cannot pick' in res_over.get_json()['error']
