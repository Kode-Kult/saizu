import requests

def test_compare_missing_params_returns_400():
    base_url = "http://localhost:3009"
    url = f"{base_url}/api/v1/compare"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
        json_data = response.json()
        assert "error" in json_data, "Response JSON missing 'error' key"
        assert json_data["error"] == "MISSING_PARAMS", f"Expected error='MISSING_PARAMS' but got {json_data['error']}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_compare_missing_params_returns_400()