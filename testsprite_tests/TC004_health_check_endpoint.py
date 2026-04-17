import requests

def test_health_check_endpoint():
    base_url = "http://localhost:3009"
    url = f"{base_url}/api/v1/health"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        json_data = response.json()
        # Assert response contains a healthy status indicator
        assert response.status_code == 200
        # Possible keys or values indicating healthy service, adjust if known
        # Common patterns: {"status":"ok"} or {"status":"healthy"}
        assert isinstance(json_data, dict)
        status_val = json_data.get("status") or json_data.get("health") or json_data.get("state")
        assert status_val is not None
        assert str(status_val).lower() in ("ok", "healthy", "up", "available", "running")
    except requests.RequestException as e:
        assert False, f"Request to health endpoint failed: {e}"

test_health_check_endpoint()