import requests

def test_analyze_nonexistent_package_returns_error():
    base_url = "http://localhost:3009"
    package_name = "this-package-does-not-exist-xyz-999"
    url = f"{base_url}/api/v1/package/{package_name}"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    assert response.status_code in (404, 500), f"Unexpected status code: {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"
    assert "error" in data, "'error' key not in response JSON"
    assert isinstance(data["error"], str) and data["error"].strip() != "", "'error' value is empty or not a string"
    assert "message" in data, "'message' key not in response JSON"
    assert isinstance(data["message"], str) and data["message"].strip() != "", "'message' value is empty or not a string"

test_analyze_nonexistent_package_returns_error()