import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_analyze_small_npm_package():
    url = f"{BASE_URL}/api/v1/package/is-odd"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate static expected values
    assert data.get("source") == "npm", f"Expected source 'npm', got {data.get('source')}"
    assert data.get("packageName") == "is-odd", f"Expected packageName 'is-odd', got {data.get('packageName')}"

    # Validate packageVersion is non-empty string
    package_version = data.get("packageVersion")
    assert isinstance(package_version, str) and package_version.strip() != "", "packageVersion must be a non-empty string"

    # Validate gzipSize, installSize, fileCount as positive integers
    for key in ["gzipSize", "installSize", "fileCount"]:
        val = data.get(key)
        assert isinstance(val, int) and val > 0, f"{key} must be a positive integer, got {val}"

    # Validate typeBreakdown as non-empty dict with string keys and integer values
    type_breakdown = data.get("typeBreakdown")
    assert isinstance(type_breakdown, dict) and len(type_breakdown) > 0, "typeBreakdown must be a non-empty dict"
    for k, v in type_breakdown.items():
        assert isinstance(k, str), f"typeBreakdown key must be string, got {type(k)}"
        assert isinstance(v, int), f"typeBreakdown value must be integer, got {type(v)}"

    # Validate dependencies as array
    dependencies = data.get("dependencies")
    assert isinstance(dependencies, list), "dependencies must be a list"

    # Validate dependencyCount as non-negative integer
    dependency_count = data.get("dependencyCount")
    assert isinstance(dependency_count, int) and dependency_count >= 0, "dependencyCount must be a non-negative integer"

    # Validate hasESM, hasCJS, hasTypes as booleans
    for key in ["hasESM", "hasCJS", "hasTypes"]:
        val = data.get(key)
        assert isinstance(val, bool), f"{key} must be a boolean"

    # Validate license as string (can be empty but must be string)
    license_val = data.get("license")
    assert isinstance(license_val, str), "license must be a string"

    # Validate downloadTime as dict with keys '4g', 'wifi', 'gbit'
    download_time = data.get("downloadTime")
    assert isinstance(download_time, dict), "downloadTime must be a dict"
    for key in ["4g", "wifi", "gbit"]:
        val = download_time.get(key)
        assert isinstance(val, (int, float)), f"downloadTime[{key}] must be a number"

    # Validate cachedAt as non-empty string
    cached_at = data.get("cachedAt")
    assert isinstance(cached_at, str) and cached_at.strip() != "", "cachedAt must be a non-empty string"

test_analyze_small_npm_package()