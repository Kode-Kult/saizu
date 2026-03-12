import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30
HEADERS = {
    "Accept": "application/json"
}


def test_get_api_v1_repo_owner_repo_handles_error_scenarios():
    session = requests.Session()
    session.headers.update(HEADERS)

    # 1. Missing params: /api/v1/repo (missing owner and repo)
    url_missing_params = f"{BASE_URL}/api/v1/repo"
    resp = session.get(url_missing_params, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 for missing params, got {resp.status_code}"
    data = resp.json()
    assert 'error' in data and data['error'] == 'MISSING_PARAMS', f"Unexpected error response: {data}"

    # 2. Private repo: /api/v1/repo/private-owner/private-repo
    url_private_repo = f"{BASE_URL}/api/v1/repo/private-owner/private-repo"
    resp = session.get(url_private_repo, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 for private repo, got {resp.status_code}"
    data = resp.json()
    assert 'error' in data and data['error'] == 'PRIVATE_REPO', f"Unexpected error response: {data}"

    # 3. Nonexistent branch: /api/v1/repo/someowner/somerepo?branch=nonexistent
    url_nonexistent_branch = f"{BASE_URL}/api/v1/repo/someowner/somerepo"
    params_branch = {'branch': 'nonexistent'}
    resp = session.get(url_nonexistent_branch, params=params_branch, timeout=TIMEOUT)
    assert resp.status_code == 404, f"Expected 404 for nonexistent branch, got {resp.status_code}"
    data = resp.json()
    assert 'error' in data and data['error'] == 'BRANCH_NOT_FOUND', f"Unexpected error response: {data}"

    # 4. Clone timeout: /api/v1/repo/timeout/repo
    url_clone_timeout = f"{BASE_URL}/api/v1/repo/timeout/repo"
    resp = session.get(url_clone_timeout, timeout=TIMEOUT)
    assert resp.status_code == 408, f"Expected 408 for clone timeout, got {resp.status_code}"
    data = resp.json()
    assert 'error' in data and data['error'] == 'CLONE_TIMEOUT', f"Unexpected error response: {data}"

    # 5. No package json: /api/v1/repo/monorepo/no-package
    url_no_package_json = f"{BASE_URL}/api/v1/repo/monorepo/no-package"
    resp = session.get(url_no_package_json, timeout=TIMEOUT)
    assert resp.status_code == 422, f"Expected 422 for no package json, got {resp.status_code}"
    data = resp.json()
    assert 'error' in data and data['error'] == 'NO_PACKAGE_JSON', f"Unexpected error response: {data}"


test_get_api_v1_repo_owner_repo_handles_error_scenarios()
