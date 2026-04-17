import requests

def test_badge_returns_svg_for_gzip():
    base_url = "http://localhost:3009"
    url = f"{base_url}/badge/is-odd"
    params = {"type": "gzip"}
    headers = {}

    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        assert "image/svg+xml" in content_type, f"Expected Content-Type to contain 'image/svg+xml', got '{content_type}'"
        body_text = response.text
        assert isinstance(body_text, str) and "<svg" in body_text, "Response body does not contain '<svg'"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_badge_returns_svg_for_gzip()