import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30


def test_get_api_v1_package_name_handles_missing_or_invalid_package():
    # Test missing package name (expect 400 with error 'MISSING_PARAMS')
    url_missing = f"{BASE_URL}/api/v1/package/"
    response_missing = requests.get(url_missing, timeout=TIMEOUT)
    assert response_missing.status_code == 400, f"Expected 400 for missing package name, got {response_missing.status_code}"
    json_missing = response_missing.json()
    assert "error" in json_missing and json_missing["error"] == "MISSING_PARAMS", f"Expected error 'MISSING_PARAMS', got {json_missing}"

    # Test nonexistent package (expect 404 with error 'PACKAGE_NOT_FOUND')
    nonexistent_package = "nonexistent-package"
    url_nonexistent = f"{BASE_URL}/api/v1/package/{nonexistent_package}"
    response_nonexistent = requests.get(url_nonexistent, timeout=TIMEOUT)
    assert response_nonexistent.status_code == 404, f"Expected 404 for nonexistent package, got {response_nonexistent.status_code}"
    json_nonexistent = response_nonexistent.json()
    assert "error" in json_nonexistent and json_nonexistent["error"] == "PACKAGE_NOT_FOUND", f"Expected error 'PACKAGE_NOT_FOUND', got {json_nonexistent}"

    # Test heavy package (expect 500 with error 'ANALYSIS_FAILED')
    heavy_package = "heavy-package"
    url_heavy = f"{BASE_URL}/api/v1/package/{heavy_package}"
    response_heavy = requests.get(url_heavy, timeout=TIMEOUT)
    assert response_heavy.status_code == 500, f"Expected 500 for heavy package, got {response_heavy.status_code}"
    json_heavy = response_heavy.json()
    assert "error" in json_heavy and json_heavy["error"] == "ANALYSIS_FAILED", f"Expected error 'ANALYSIS_FAILED', got {json_heavy}"


test_get_api_v1_package_name_handles_missing_or_invalid_package()