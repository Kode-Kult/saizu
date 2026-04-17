import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_compare_should_return_comparison_of_two_targets():
    url = f"{BASE_URL}/api/v1/compare"
    params = {'a': 'react', 'b': 'vue'}
    headers = {"Accept": "application/json"}

    try:
        response = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to /api/v1/compare failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Check keys presence
    assert 'a' in data, "'a' key missing in response JSON"
    assert 'b' in data, "'b' key missing in response JSON"
    assert 'diff' in data, "'diff' key missing in response JSON"

    a_obj = data['a']
    b_obj = data['b']
    diff_obj = data['diff']

    # Validate 'a' and 'b' have expected analysis fields (sample validation)
    for obj, name in [(a_obj, 'a'), (b_obj, 'b')]:
        assert isinstance(obj, dict), f"{name} should be an object"
        assert 'gzipSize' in obj and isinstance(obj['gzipSize'], (int, float)), f"{name}.gzipSize missing or not a number"
        assert 'installSize' in obj and isinstance(obj['installSize'], (int, float)), f"{name}.installSize missing or not a number"
        assert 'dependencyCount' in obj and isinstance(obj['dependencyCount'], int), f"{name}.dependencyCount missing or not an int"

    # Validate diff fields
    assert isinstance(diff_obj, dict), "'diff' should be an object"
    for key in ['gzipSize', 'installSize', 'dependencyCount', 'smaller']:
        assert key in diff_obj, f"'diff' missing key '{key}'"

    # Check diff numeric values
    assert isinstance(diff_obj['gzipSize'], (int, float)), "'diff.gzipSize' should be a number"
    assert isinstance(diff_obj['installSize'], (int, float)), "'diff.installSize' should be a number"
    assert isinstance(diff_obj['dependencyCount'], int), "'diff.dependencyCount' should be an int"

    # Check 'smaller' value is one of expected strings
    assert diff_obj['smaller'] in ['a', 'b', 'equal'], "'diff.smaller' must be 'a', 'b', or 'equal'"

    # Additional logical validation: diff numbers match difference of a and b fields
    assert diff_obj['gzipSize'] == a_obj['gzipSize'] - b_obj['gzipSize'], "'diff.gzipSize' does not match a.gzipSize - b.gzipSize"
    assert diff_obj['installSize'] == a_obj['installSize'] - b_obj['installSize'], "'diff.installSize' does not match a.installSize - b.installSize"
    assert diff_obj['dependencyCount'] == a_obj['dependencyCount'] - b_obj['dependencyCount'], "'diff.dependencyCount' does not match a.dependencyCount - b.dependencyCount"

test_get_api_v1_compare_should_return_comparison_of_two_targets()