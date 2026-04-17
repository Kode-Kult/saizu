import requests

BASE_URL = "http://localhost:3009"

def test_badge_returns_svg_for_install_size():
    url = f"{BASE_URL}/badge/is-odd"
    params = {"type": "install"}
    headers = {}
    timeout = 30
    try:
        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        assert "image/svg+xml" in content_type, f"Expected 'image/svg+xml' in Content-Type, got {content_type}"
        body = response.text
        assert isinstance(body, str), "Response body is not a string"
        assert "<svg" in body, "Response body does not contain '<svg'"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_badge_returns_svg_for_install_size()