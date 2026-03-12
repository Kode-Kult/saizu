import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_compare_compares_two_targets():
    url = f"{BASE_URL}/api/v1/compare"
    params = {
        "a": "lodash",
        "b": "react"
    }
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError as e:
        assert False, f"Response is not valid JSON: {e}"

    # Validate top-level keys
    assert "a" in data and isinstance(data["a"], dict), "Missing or invalid 'a' in response"
    assert "b" in data and isinstance(data["b"], dict), "Missing or invalid 'b' in response"
    assert "diff" in data and isinstance(data["diff"], dict), "Missing or invalid 'diff' in response"

    # Validate diff keys
    diff = data["diff"]
    expected_diff_keys = {"gzipSize", "installSize", "dependencyCount", "smaller"}
    assert expected_diff_keys.issubset(diff.keys()), f"Diff keys missing. Expected at least {expected_diff_keys}, got {diff.keys()}"

test_get_api_v1_compare_compares_two_targets()