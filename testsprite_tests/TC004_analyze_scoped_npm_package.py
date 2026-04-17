import requests

def test_analyze_scoped_npm_package():
    base_url = "http://localhost:3009"
    package_name = "@sindresorhus/is"
    url = f"{base_url}/api/v1/package/{requests.utils.quote(package_name, safe='')}"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        data = response.json()
        assert data.get("source") == "npm", f"Expected source 'npm', got {data.get('source')}"
        assert data.get("packageName") == package_name, f"Expected packageName '{package_name}', got {data.get('packageName')}"
        gzip_size = data.get("gzipSize")
        install_size = data.get("installSize")
        type_breakdown = data.get("typeBreakdown")
        assert isinstance(gzip_size, int) and gzip_size > 0, f"gzipSize should be positive integer, got {gzip_size}"
        assert isinstance(install_size, int) and install_size > 0, f"installSize should be positive integer, got {install_size}"
        assert isinstance(type_breakdown, dict) and len(type_breakdown) > 0, "typeBreakdown should be a non-empty dict"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError as e:
        assert False, f"Response not JSON: {e}"

test_analyze_scoped_npm_package()