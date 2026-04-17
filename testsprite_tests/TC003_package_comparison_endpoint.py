import requests

def test_package_comparison_endpoint():
    base_url = "http://localhost:3009"
    endpoint = f"{base_url}/api/v1/compare"
    params = {'a': 'react', 'b': 'vue'}
    headers = {
        "Accept": "application/json"
    }

    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate that the response contains expected keys for diff comparison like gzipDiff, installDiff, dependencyCountDiff
    assert isinstance(data, dict), "Response JSON root should be a dictionary"
    expected_keys = ['gzipDiff', 'installDiff', 'dependencyCountDiff']

    for key in expected_keys:
        assert key in data, f"Response JSON missing expected key: {key}"

    # Validate gzipDiff and installDiff are numeric
    assert isinstance(data['gzipDiff'], (int, float)), "'gzipDiff' should be numeric"
    assert isinstance(data['installDiff'], (int, float)), "'installDiff' should be numeric"

    # Validate dependencyCountDiff is int
    assert isinstance(data['dependencyCountDiff'], int), "'dependencyCountDiff' should be int"


test_package_comparison_endpoint()