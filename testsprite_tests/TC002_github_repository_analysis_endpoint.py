import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_github_repository_analysis_endpoint():
    owner = "facebook"
    repo = "react"
    url = f"{BASE_URL}/api/v1/repo/{owner}/{repo}"
    headers = {
        "Accept": "application/json"
    }

    response = None
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
        data = response.json()

        # Validate top-level keys expected for repository footprint details
        expected_keys = {"installSize", "fileTypeBreakdown", "dependencyTree", "moduleFormat"}
        assert expected_keys <= data.keys(), f"Missing keys in response data. Expected at least {expected_keys}, got {data.keys()}"

        # Validate installSize is a positive number (in bytes?)
        install_size = data.get("installSize")
        assert isinstance(install_size, (int, float)) and install_size > 0, "installSize should be a positive number"

        # Validate fileTypeBreakdown is a dict with string keys and numeric values
        file_type_breakdown = data.get("fileTypeBreakdown")
        assert isinstance(file_type_breakdown, dict) and len(file_type_breakdown) > 0, "fileTypeBreakdown should be a non-empty dict"
        for k, v in file_type_breakdown.items():
            assert isinstance(k, str), f"File type key should be string, got {type(k)}"
            assert isinstance(v, (int, float)) and v >= 0, f"File type value should be non-negative number, got {v}"

        # Validate dependencyTree is a dict or list representing dependencies
        dependency_tree = data.get("dependencyTree")
        assert isinstance(dependency_tree, (dict, list)), "dependencyTree should be a dict or list"

        # Validate moduleFormat is a string and one of expected formats if applicable
        module_format = data.get("moduleFormat")
        assert isinstance(module_format, str) and module_format.strip() != "", "moduleFormat should be a non-empty string"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError:
        assert False, "Response content is not valid JSON"

test_github_repository_analysis_endpoint()