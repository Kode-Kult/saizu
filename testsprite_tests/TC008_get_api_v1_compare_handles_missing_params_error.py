import requests

def test_get_api_v1_compare_missing_params_error():
    base_url = "http://localhost:3009"
    url = f"{base_url}/api/v1/compare"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
        data = response.json()
        assert "error" in data, "Response JSON missing 'error' key"
        assert data["error"] == "MISSING_PARAMS", f"Expected error 'MISSING_PARAMS' but got {data['error']}"
    except requests.RequestException as e:
        assert False, f"RequestException occurred: {e}"

test_get_api_v1_compare_missing_params_error()