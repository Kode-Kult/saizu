import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_health_returns_service_status():
    url = f"{BASE_URL}/api/v1/health"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
    
    # Validate JSON response content
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Assert required keys exist
    assert "status" in data, "Response JSON missing 'status'"
    assert "version" in data, "Response JSON missing 'version'"
    assert "uptime" in data, "Response JSON missing 'uptime'"

    # Assert status value
    assert data["status"] == "ok", f"Expected status 'ok' but got {data['status']}"

    # Assert version is a string and non-empty
    assert isinstance(data["version"], str) and data["version"], "Invalid or empty 'version' value"

    # Assert uptime is a number (float or int) and non-negative
    assert (isinstance(data["uptime"], (int, float))) and data["uptime"] >= 0, "Invalid 'uptime' value"

test_get_api_v1_health_returns_service_status()