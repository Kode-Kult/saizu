import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_package_name_should_return_npm_package_analysis():
    package_name = "is-odd"
    url = f"{BASE_URL}/api/v1/package/{package_name}"

    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
        data = response.json()
        
        # Validate top-level fields
        assert data.get("source") == "npm"
        assert data.get("packageName") == package_name
        assert isinstance(data.get("packageVersion"), str) and data["packageVersion"]
        assert "description" in data and isinstance(data["description"], str)
        assert "license" in data and isinstance(data["license"], str)
        assert "repository" in data and isinstance(data["repository"], str)
        assert "homepage" in data and isinstance(data["homepage"], str)
        
        # Validate size fields
        assert isinstance(data.get("gzipSize"), (int, float)) and data["gzipSize"] >= 0
        assert isinstance(data.get("installSize"), (int, float)) and data["installSize"] >= 0
        assert isinstance(data.get("fileCount"), int) and data["fileCount"] >= 0
        
        # Validate typeBreakdown is a dict with string keys and number values
        type_breakdown = data.get("typeBreakdown")
        assert isinstance(type_breakdown, dict)
        for k, v in type_breakdown.items():
            assert isinstance(k, str)
            assert isinstance(v, (int, float)) and v >= 0
        
        # Validate dependencies and count
        dependencies = data.get("dependencies")
        dependency_count = data.get("dependencyCount")
        assert isinstance(dependencies, list)
        assert all(isinstance(dep, str) for dep in dependencies)
        assert isinstance(dependency_count, int)
        assert dependency_count == len(dependencies)
        
        # Validate module formats and types flags
        for flag in ("hasESM", "hasCJS", "hasTypes"):
            assert isinstance(data.get(flag), bool)
        
        # Validate downloadTime object with keys "4g", "wifi", "gbit" (milliseconds as numbers)
        download_time = data.get("downloadTime")
        assert isinstance(download_time, dict)
        for key in ("4g", "wifi", "gbit"):
            assert key in download_time
            val = download_time[key]
            assert isinstance(val, (int, float)) and val >= 0
        
        # Validate cachedAt is a non-empty string (ISO 8601 datetime)
        cached_at = data.get("cachedAt")
        assert isinstance(cached_at, str) and cached_at
        
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_v1_package_name_should_return_npm_package_analysis()