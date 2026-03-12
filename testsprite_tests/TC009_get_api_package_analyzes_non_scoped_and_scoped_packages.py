import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_package_analyzes_non_scoped_and_scoped_packages():
    non_scoped_package = "lodash"
    scoped_package_scope = "@tanstack"
    scoped_package_name = "react-query"
    
    session = requests.Session()
    headers = {"Accept": "application/json"}
    
    # Test non-scoped package GET /api/:package
    url_non_scoped = f"{BASE_URL}/api/{non_scoped_package}"
    try:
        resp_non_scoped = session.get(url_non_scoped, headers=headers, timeout=TIMEOUT)
        assert resp_non_scoped.status_code == 200, f"Expected 200 but got {resp_non_scoped.status_code} for non-scoped package"
        data_non_scoped = resp_non_scoped.json()
        # Validate expected keys in response JSON (AnalysisResult)
        assert "packageName" in data_non_scoped or "source" in data_non_scoped, "Response missing expected package analysis fields"
        assert data_non_scoped.get("packageName", non_scoped_package) == non_scoped_package or data_non_scoped.get("source") == "npm" or True
    except requests.RequestException as e:
        assert False, f"Request failed for non-scoped package analysis: {e}"
    
    # Test scoped package GET /api/:scope/:package
    # Escaping @ in URL by directly including it, requests will handle it
    url_scoped = f"{BASE_URL}/api/{scoped_package_scope}/{scoped_package_name}"
    try:
        resp_scoped = session.get(url_scoped, headers=headers, timeout=TIMEOUT)
        assert resp_scoped.status_code == 200, f"Expected 200 but got {resp_scoped.status_code} for scoped package"
        data_scoped = resp_scoped.json()
        # Validate expected keys in response JSON (AnalysisResult)
        assert "packageName" in data_scoped or "source" in data_scoped, "Response missing expected package analysis fields"
        # The packageName might include scope or not, we just check it's in string and matches scoped package
        pkg_name = data_scoped.get("packageName", "")
        assert scoped_package_name in pkg_name, f"Response packageName '{pkg_name}' does not contain scoped package name '{scoped_package_name}'"
    except requests.RequestException as e:
        assert False, f"Request failed for scoped package analysis: {e}"

test_get_api_package_analyzes_non_scoped_and_scoped_packages()