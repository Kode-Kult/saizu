import requests

def test_compare_two_packages_returns_diff():
    base_url = "http://localhost:3009"
    endpoint = "/api/v1/compare"
    params = {
        "a": "react",
        "b": "vue"
    }
    timeout = 30

    try:
        response = requests.get(f"{base_url}{endpoint}", params=params, timeout=timeout)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        data = response.json()

        # Assert 'a' is dict with keys packageName, gzipSize, installSize
        assert "a" in data, "'a' key missing in response JSON"
        a = data["a"]
        assert isinstance(a, dict), "'a' is not a dictionary"
        for key in ["packageName", "gzipSize", "installSize"]:
            assert key in a, f"Key '{key}' missing in 'a'"
        assert isinstance(a["packageName"], str) and a["packageName"], "'a.packageName' should be non-empty string"
        assert isinstance(a["gzipSize"], int), "'a.gzipSize' should be integer"
        assert isinstance(a["installSize"], int), "'a.installSize' should be integer"

        # Assert 'b' is dict with keys packageName, gzipSize, installSize
        assert "b" in data, "'b' key missing in response JSON"
        b = data["b"]
        assert isinstance(b, dict), "'b' is not a dictionary"
        for key in ["packageName", "gzipSize", "installSize"]:
            assert key in b, f"Key '{key}' missing in 'b'"
        assert isinstance(b["packageName"], str) and b["packageName"], "'b.packageName' should be non-empty string"
        assert isinstance(b["gzipSize"], int), "'b.gzipSize' should be integer"
        assert isinstance(b["installSize"], int), "'b.installSize' should be integer"

        # Assert 'diff' as dict with keys gzipSize(int), installSize(int), dependencyCount(int), smaller(string in {"a","b","equal"})
        assert "diff" in data, "'diff' key missing in response JSON"
        diff = data["diff"]
        assert isinstance(diff, dict), "'diff' is not a dictionary"

        for key in ["gzipSize", "installSize", "dependencyCount"]:
            assert key in diff, f"Key '{key}' missing in 'diff'"
            assert isinstance(diff[key], int), f"'diff.{key}' should be integer"

        assert "smaller" in diff, "'smaller' key missing in 'diff'"
        assert isinstance(diff["smaller"], str), "'diff.smaller' should be a string"
        assert diff["smaller"] in {"a", "b", "equal"}, "'diff.smaller' must be one of 'a', 'b', or 'equal'"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_compare_two_packages_returns_diff()