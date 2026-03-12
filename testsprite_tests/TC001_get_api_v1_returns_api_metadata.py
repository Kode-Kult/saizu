import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_returns_api_metadata():
    url = f"{BASE_URL}/api/v1"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response body is not valid JSON"

    # Validate keys in JSON response
    expected_keys = {"version", "baseUrl", "endpoints", "targetFormats"}
    actual_keys = set(data.keys())
    assert expected_keys.issubset(actual_keys), f"Response JSON missing expected keys. Expected at least {expected_keys}, got {actual_keys}"

    # Validate types of the keys
    assert isinstance(data["version"], (str, float, int)), "version should be a string or number"
    assert isinstance(data["baseUrl"], str), "baseUrl should be a string"
    assert isinstance(data["endpoints"], list), "endpoints should be a list"
    assert isinstance(data["targetFormats"], (list, dict)), "targetFormats should be a list or dict"

    # Further validation on endpoints array if not empty
    if data["endpoints"]:
        for endpoint in data["endpoints"]:
            assert isinstance(endpoint, (str, dict)), "Each endpoint should be a string or dict"

test_get_api_v1_returns_api_metadata()