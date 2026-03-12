import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_repo_owner_repo_analyzes_github_repo():
    owner = "facebook"
    repo = "react"
    url = f"{BASE_URL}/api/v1/repo/{owner}/{repo}"
    headers = {
        "Accept": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
        data = response.json()
        # Validate required keys in response JSON
        required_keys = ["source", "owner", "repo", "commit", "npmComparison", "cachedAt"]
        for key in required_keys:
            assert key in data, f"Missing key '{key}' in response JSON"
        # Validate constant values
        assert data["source"] == "github", f"Expected source 'github' but got {data['source']}"
        assert data["owner"] == owner, f"Expected owner '{owner}' but got {data['owner']}"
        assert data["repo"] == repo, f"Expected repo '{repo}' but got {data['repo']}"
        # branch and subpath can be None or string
        assert "branch" in data, "Missing 'branch' key in response JSON"
        assert "subpath" in data, "Missing 'subpath' key in response JSON"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_v1_repo_owner_repo_analyzes_github_repo()