import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_cached_response_returns_cache_hit_header():
    url = f"{BASE_URL}/api/v1/package/is-odd"
    headers = {}
    # First request
    response1 = requests.get(url, headers=headers, timeout=TIMEOUT)
    assert response1.status_code == 200, f"First request failed with status {response1.status_code}"
    # Second request
    response2 = requests.get(url, headers=headers, timeout=TIMEOUT)
    assert response2.status_code == 200, f"Second request failed with status {response2.status_code}"
    cache_header = response2.headers.get("X-Cache")
    assert cache_header == "HIT", f"Expected X-Cache header to be 'HIT', got '{cache_header}'"

test_cached_response_returns_cache_hit_header()