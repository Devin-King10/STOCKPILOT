import pytest

def test_packing_checklist_validation(client, packer_token):
    # Fetch packing tasks
    res = client.get('/api/packing/tasks', headers={'Authorization': f'Bearer {packer_token}'})
    assert res.status_code == 200
    tasks = res.get_json()['tasks']
    pending_task = next((t for t in tasks if t['status'] in ('PENDING', 'IN_PROGRESS')), None)
    assert pending_task is not None
    record_id = pending_task['id']

    # Attempt to complete without passing all 5 checklist items
    res_incomplete = client.post(f'/api/packing/tasks/{record_id}/complete', json={
        'package_dimensions': '30x20x10 cm',
        'package_weight': 2.0,
        'checklist': {
            'qty_verified': True,
            'condition_verified': False, # Failed check
            'order_items_confirmed': True,
            'packaging_completed': True,
            'shipping_label_prepared': False
        }
    }, headers={'Authorization': f'Bearer {packer_token}'})
    assert res_incomplete.status_code == 400
    assert 'mandatory checklist' in res_incomplete.get_json()['error']

    # Complete with 100% checklist
    res_complete = client.post(f'/api/packing/tasks/{record_id}/complete', json={
        'package_dimensions': '30x20x10 cm',
        'package_weight': 2.0,
        'checklist': {
            'qty_verified': True,
            'condition_verified': True,
            'order_items_confirmed': True,
            'packaging_completed': True,
            'shipping_label_prepared': True
        }
    }, headers={'Authorization': f'Bearer {packer_token}'})
    assert res_complete.status_code == 200
    assert res_complete.get_json()['task']['status'] == 'COMPLETED'
