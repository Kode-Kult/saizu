import requests

BASE_URL = "http://localhost:3009"

def test_get_api_v1_health_should_return_service_status_version_and_uptime():
    url = f"{BASE_URL}/api/v1/health"
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Validate response fields
    assert "status" in data, "Missing 'status' in response"
    assert data["status"] == "ok", f"Expected status 'ok', got '{data['status']}'"
    assert "version" in data, "Missing 'version' in response"
    assert isinstance(data["version"], str) and len(data["version"]) > 0, "'version' must be a non-empty string"
    assert "uptime" in data, "Missing 'uptime' in response"
    assert isinstance(data["uptime"], (int, float)), "'uptime' must be a number representing seconds"
    assert data["uptime"] >= 0, "'uptime' must be non-negative"

test_get_api_v1_health_should_return_service_status_version_and_uptime()