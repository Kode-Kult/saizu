import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_repo_owner_repo_should_return_github_repo_analysis():
    owner = "facebook"
    repo = "react"
    url = f"{BASE_URL}/api/v1/repo/{owner}/{repo}"
    params = {"branch": "main", "subpath": "packages/core"}
    headers = {"Accept": "application/json"}

    response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    data = response.json()

    # Validate top-level keys and types
    assert data.get("source") == "github"
    assert data.get("owner") == owner
    assert data.get("repo") == repo
    assert isinstance(data.get("branch"), str)
    assert data.get("branch") == "main"
    # subpath can be string or None
    assert data.get("subpath") == "packages/core"
    assert isinstance(data.get("commit"), str) and len(data.get("commit")) > 0

    # Strings
    for key in ["packageName", "packageVersion", "description", "license", "repository", "homepage"]:
        assert isinstance(data.get(key), str), f"{key} must be a string"

    # Numbers
    for key in ["gzipSize", "installSize"]:
        assert isinstance(data.get(key), int), f"{key} must be int"

    file_count = data.get("fileCount")
    assert isinstance(file_count, int) and file_count >= 0

    type_breakdown = data.get("typeBreakdown")
    assert isinstance(type_breakdown, dict)
    # Each key is str, value is int >=0
    for ext, size in type_breakdown.items():
        assert isinstance(ext, str)
        assert isinstance(size, int) and size >= 0

    dependencies = data.get("dependencies")
    assert isinstance(dependencies, list)
    for dep in dependencies:
        assert isinstance(dep, str)

    dependency_count = data.get("dependencyCount")
    assert isinstance(dependency_count, int)
    assert dependency_count == len(dependencies)

    for flag in ["hasESM", "hasCJS", "hasTypes"]:
        assert isinstance(data.get(flag), bool)

    download_time = data.get("downloadTime")
    assert isinstance(download_time, dict)
    for network in ["4g", "wifi", "gbit"]:
        val = download_time.get(network)
        assert isinstance(val, (int,float)) and val >= 0

    # npmComparison object
    npm_comp = data.get("npmComparison")
    if npm_comp is not None:
        assert isinstance(npm_comp, dict)
        assert isinstance(npm_comp.get("available"), bool)
        assert isinstance(npm_comp.get("publishedVersion"), str)
        for key in ["gzipDelta", "installDelta"]:
            val = npm_comp.get(key)
            if val is not None:
                assert isinstance(val, int) or isinstance(val, float)
        verdict = npm_comp.get("verdict")
        if verdict is not None:
            assert isinstance(verdict, str)

    cached_at = data.get("cachedAt")
    assert isinstance(cached_at, str)
    from datetime import datetime
    # Check ISO 8601 format by parsing
    try:
        datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
    except Exception:
        assert False, "cachedAt is not a valid ISO 8601 datetime string"

test_get_api_v1_repo_owner_repo_should_return_github_repo_analysis()