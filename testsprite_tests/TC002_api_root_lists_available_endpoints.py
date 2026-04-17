import requests

def test_api_root_lists_available_endpoints():
    base_url = "http://localhost:3009"
    url = f"{base_url}/api/v1/"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

    assert response.status_code == 200, f"Expected HTTP 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Assert 'version' is a string
    assert "version" in data, "'version' key not found in response JSON"
    assert isinstance(data["version"], str), "'version' is not a string"

    # Assert 'baseUrl' is a string
    assert "baseUrl" in data, "'baseUrl' key not found in response JSON"
    assert isinstance(data["baseUrl"], str), "'baseUrl' is not a string"

    # Assert 'endpoints' is a non-empty list
    assert "endpoints" in data, "'endpoints' key not found in response JSON"
    endpoints = data["endpoints"]
    assert isinstance(endpoints, list), "'endpoints' is not a list"
    assert len(endpoints) > 0, "'endpoints' array is empty"

    # Each endpoint must have 'method', 'path', and 'description' keys
    for idx, endpoint in enumerate(endpoints):
        assert isinstance(endpoint, dict), f"Endpoint at index {idx} is not a dict"
        for key in ("method", "path", "description"):
            assert key in endpoint, f"Endpoint at index {idx} missing key '{key}'"
            assert isinstance(endpoint[key], str), f"Endpoint[{key}] at index {idx} is not a string"

test_api_root_lists_available_endpoints()